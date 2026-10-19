import uuid
from datetime import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.events.models import Venue, Performer, Event
from apps.bookings.models import Ticket
from apps.search.documents import EventDocument
from apps.search.indexing import event_to_es_document


class Phase4ElasticsearchSearchTestCase(TestCase):
    def setUp(self):
        EventDocument.clear_in_memory_index()
        self.client = APIClient()

        self.venue = Venue.objects.create(
            name='Crypto Arena',
            city='Los Angeles',
            latitude=34.0430,
            longitude=-118.2673,
            seat_map_config={'sections': ['General'], 'rows_per_section': {'General': ['A']}, 'seats_per_row': 5}
        )
        self.performer = Performer.objects.create(
            name='Dua Lipa',
            genre='Pop'
        )
        self.event_date = timezone.now() + timezone.timedelta(days=30)
        self.event = Event.objects.create(
            title='Future Nostalgia Tour 2026',
            description='Spectacular live pop concert event in Los Angeles arena',
            venue=self.venue,
            performer=self.performer,
            event_date=self.event_date,
            is_surge_protected=True,
            category='concert'
        )
        self.ticket = Ticket.objects.create(
            event=self.event,
            seat_number='A-1',
            tier='Floor',
            price=180.00,
            status=Ticket.Status.AVAILABLE
        )

    def test_event_document_mapping(self):
        """
        Validates EventDocument schema mapping matches Phase 4 specification:
        - Index name: 'events'
        - Fields: id, title, description, performer_name, venue_name, city, location, event_date
        """
        self.assertEqual(EventDocument.Index.name, 'events')

        raw_mapping = EventDocument._doc_type.mapping.properties.to_dict()
        mapping_properties = raw_mapping.get('properties', raw_mapping)
        self.assertIn('id', mapping_properties)
        self.assertIn('title', mapping_properties)
        self.assertIn('description', mapping_properties)
        self.assertIn('performer_name', mapping_properties)
        self.assertIn('venue_name', mapping_properties)
        self.assertIn('city', mapping_properties)
        self.assertIn('location', mapping_properties)
        self.assertIn('event_date', mapping_properties)

        self.assertEqual(mapping_properties['location']['type'], 'geo_point')
        self.assertEqual(mapping_properties['performer_name']['type'], 'text')
        self.assertIn('raw', mapping_properties['performer_name']['fields'])

    def test_post_save_signal_indexes_event(self):
        """
        Verifies that saving an Event automatically triggers index_event_to_es signal,
        populating the EventDocument with all model and relational properties.
        """
        doc_dict = EventDocument.get_in_memory_document(self.event.id)
        self.assertIsNotNone(doc_dict, "Event was not indexed by post_save signal")
        self.assertEqual(doc_dict['id'], self.event.id)
        self.assertEqual(doc_dict['title'], 'Future Nostalgia Tour 2026')
        self.assertEqual(doc_dict['performer_name'], 'Dua Lipa')
        self.assertEqual(doc_dict['venue_name'], 'Crypto Arena')
        self.assertEqual(doc_dict['city'], 'Los Angeles')
        self.assertAlmostEqual(doc_dict['location']['lat'], 34.0430, places=3)
        self.assertAlmostEqual(doc_dict['location']['lon'], -118.2673, places=3)

    def test_event_update_reindexes_document(self):
        """
        Verifies that modifying an Event updates the corresponding Elasticsearch document.
        """
        self.event.title = 'Future Nostalgia World Tour (Encore)'
        self.event.save()

        updated_doc = EventDocument.get_in_memory_document(self.event.id)
        self.assertIsNotNone(updated_doc)
        self.assertEqual(updated_doc['title'], 'Future Nostalgia World Tour (Encore)')

    def test_post_delete_signal_removes_from_index(self):
        """
        Verifies that deleting an Event removes it from the search index.
        """
        event_id = self.event.id
        self.assertIsNotNone(EventDocument.get_in_memory_document(event_id))

        self.event.delete()
        self.assertIsNone(EventDocument.get_in_memory_document(event_id))

    def test_search_api_endpoint_by_term(self):
        """
        Validates GET /api/search/?term=Dua returns the event with proper contract.
        """
        res = self.client.get('/api/search/', {'term': 'Dua'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('results', res.data)
        self.assertGreaterEqual(res.data['total'], 1)

        result_titles = [r['name'] for r in res.data['results']]
        self.assertIn('Future Nostalgia Tour 2026', result_titles)

    def test_search_api_endpoint_by_location(self):
        """
        Validates GET /api/search/?location=Los+Angeles filters correctly.
        """
        res = self.client.get('/api/search/', {'location': 'Los Angeles'})
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['venue']['city'], 'Los Angeles')

    def test_search_api_endpoint_no_matches(self):
        """
        Validates GET /api/search/?term=NonExistentArtist returns empty results list.
        """
        res = self.client.get('/api/search/', {'term': 'NonExistentArtistXYZ123'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 0)
