import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.authentication.models import User
from apps.events.models import Venue, Performer, Event
from apps.bookings.models import Ticket, Booking

class Command(BaseCommand):
    help = 'Seeds database with Phase 2 models, venues, performers, events, and ticket seats.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding database with Phase 2 models...'))

        # 1. Create demo users
        demo_user, created = User.objects.get_or_create(
            username='demo_user',
            defaults={
                'email': 'demo@ticketmaster.dev',
                'first_name': 'Demo',
                'last_name': 'User',
            }
        )
        if created:
            demo_user.set_password('demopassword123')
            demo_user.save()
            self.stdout.write(self.style.SUCCESS('Created user: demo_user / demopassword123'))

        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@ticketmaster.dev',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password('adminpassword123')
        admin_user.save()

        # 2. Venues
        venues_data = [
            {
                'name': 'SoFi Stadium',
                'city': 'Inglewood',
                'latitude': 33.9534,
                'longitude': -118.3387,
                'seat_map_config': {
                    'sections': ['VIP Floor', 'Lower Bowl', 'Club Level', 'Upper Terrace'],
                    'rows_per_section': {'VIP Floor': ['A', 'B', 'C'], 'Lower Bowl': ['D', 'E', 'F'], 'Club Level': ['G', 'H'], 'Upper Terrace': ['J', 'K']},
                    'seats_per_row': 12
                },
                'image_url': 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'Madison Square Garden',
                'city': 'New York',
                'latitude': 40.7505,
                'longitude': -73.9934,
                'seat_map_config': {
                    'sections': ['Floor Courtside', 'Concourse 100', 'Lounge 200', 'Balcony 300'],
                    'rows_per_section': {'Floor Courtside': ['A', 'B'], 'Concourse 100': ['C', 'D', 'E'], 'Lounge 200': ['F', 'G'], 'Balcony 300': ['H', 'J']},
                    'seats_per_row': 12
                },
                'image_url': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'Red Rocks Amphitheatre',
                'city': 'Morrison',
                'latitude': 39.6654,
                'longitude': -105.2057,
                'seat_map_config': {
                    'sections': ['Front Stage GA', 'Reserved Tier 1', 'Reserved Tier 2', 'Rear GA'],
                    'rows_per_section': {'Front Stage GA': ['A', 'B', 'C'], 'Reserved Tier 1': ['D', 'E'], 'Reserved Tier 2': ['F', 'G'], 'Rear GA': ['H', 'J']},
                    'seats_per_row': 10
                },
                'image_url': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'Wembley Stadium',
                'city': 'London',
                'latitude': 51.5560,
                'longitude': -0.2795,
                'seat_map_config': {
                    'sections': ['Pitch Standing', 'Level 1 Tier', 'Level 2 Club', 'Level 5 Upper'],
                    'rows_per_section': {'Pitch Standing': ['A', 'B'], 'Level 1 Tier': ['C', 'D', 'E'], 'Level 2 Club': ['F', 'G'], 'Level 5 Upper': ['H', 'J']},
                    'seats_per_row': 12
                },
                'image_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'
            }
        ]

        venues = {}
        for vd in venues_data:
            v, _ = Venue.objects.update_or_create(name=vd['name'], defaults=vd)
            venues[vd['name']] = v

        # 3. Performers
        performers_data = [
            {
                'name': 'Taylor Swift',
                'genre': 'Pop',
                'bio': 'Global phenomenon presenting The Eras Tour, celebrating her career through iconic eras.',
                'avatar_url': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
                'banner_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'Coldplay',
                'genre': 'Alternative Rock',
                'bio': 'Legendary British rock band touring their Music of the Spheres world spectacle.',
                'avatar_url': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
                'banner_url': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'Kendrick Lamar',
                'genre': 'Hip Hop',
                'bio': 'Pulitzer prize winning artist performing greatest hits across global stadiums.',
                'avatar_url': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
                'banner_url': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'NBA Finals: Championship Game',
                'genre': 'Sports',
                'bio': 'The peak of professional basketball showdown. Deciding trophy game.',
                'avatar_url': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=500&q=80',
                'banner_url': 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'name': 'Hamilton: An American Musical',
                'genre': 'Theater',
                'bio': 'Lin-Manuel Miranda revolutionary hip-hop musical following the life of Alexander Hamilton.',
                'avatar_url': 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=500&q=80',
                'banner_url': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80'
            }
        ]

        performers = {}
        for pd in performers_data:
            p, _ = Performer.objects.update_or_create(name=pd['name'], defaults=pd)
            performers[pd['name']] = p

        # 4. Events
        now = timezone.now()
        events_data = [
            {
                'title': 'Taylor Swift: The Eras Tour Stadium Spectacular',
                'venue': venues['SoFi Stadium'],
                'performer': performers['Taylor Swift'],
                'category': 'concert',
                'event_date': now + timedelta(days=5, hours=19),
                'description': 'Experience the groundbreaking worldwide stadium tour celebrating 17 years of music.',
                'is_surge_protected': True,  # Surge mode enabled for testing virtual waiting room!
                'banner_image': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'title': 'Coldplay: Music of the Spheres World Tour',
                'venue': venues['Wembley Stadium'],
                'performer': performers['Coldplay'],
                'category': 'concert',
                'event_date': now + timedelta(days=12, hours=20),
                'description': 'A sustainable, kaleidoscopic celebration under LED wristband lights.',
                'is_surge_protected': False,
                'banner_image': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'title': 'NBA Finals - Game 7 Decider',
                'venue': venues['Madison Square Garden'],
                'performer': performers['NBA Finals: Championship Game'],
                'category': 'sports',
                'event_date': now + timedelta(days=20, hours=20, minutes=30),
                'description': 'Win or go home. The championship comes down to one final historic game in NYC.',
                'is_surge_protected': True,
                'banner_image': 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'title': 'Kendrick Lamar: Live at Red Rocks',
                'venue': venues['Red Rocks Amphitheatre'],
                'performer': performers['Kendrick Lamar'],
                'category': 'concert',
                'event_date': now + timedelta(days=28, hours=19, minutes=30),
                'description': 'An unforgettable evening under the towering red monoliths of Colorado.',
                'is_surge_protected': False,
                'banner_image': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80'
            },
            {
                'title': 'Hamilton on Broadway',
                'venue': venues['Madison Square Garden'],
                'performer': performers['Hamilton: An American Musical'],
                'category': 'theater',
                'event_date': now + timedelta(days=35, hours=19),
                'description': 'America then told by America now. The multi-Tony-award winning musical.',
                'is_surge_protected': False,
                'banner_image': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80'
            }
        ]

        price_tiers = {
            'VIP Floor': 380.00,
            'Floor Courtside': 450.00,
            'Front Stage GA': 290.00,
            'Pitch Standing': 220.00,
            'Lower Bowl': 240.00,
            'Concourse 100': 210.00,
            'Reserved Tier 1': 190.00,
            'Level 1 Tier': 180.00,
            'Club Level': 160.00,
            'Lounge 200': 150.00,
            'Reserved Tier 2': 140.00,
            'Level 2 Club': 150.00,
            'Upper Terrace': 95.00,
            'Balcony 300': 85.00,
            'Rear GA': 75.00,
            'Level 5 Upper': 70.00,
        }

        for ed in events_data:
            event, _ = Event.objects.update_or_create(title=ed['title'], defaults=ed)
            layout = event.venue.seat_map_config
            sections = layout.get('sections', ['General'])
            rows_per_section = layout.get('rows_per_section', {})
            seats_per_row = layout.get('seats_per_row', 10)

            # Check existing tickets
            if Ticket.objects.filter(event=event).count() == 0:
                ticket_objs = []
                counter = 0

                for section in sections:
                    rows = rows_per_section.get(section, ['A', 'B'])
                    tier_price = price_tiers.get(section, 120.00)

                    for row in rows:
                        for s_num in range(1, seats_per_row + 1):
                            counter += 1
                            # Phase 2 Design Decision: Status in PostgreSQL is either AVAILABLE or BOOKED (never RESERVED)
                            status = Ticket.Status.BOOKED if counter % 7 == 0 else Ticket.Status.AVAILABLE

                            t = Ticket(
                                event=event,
                                seat_number=f"{row}-{s_num}",
                                tier=section,
                                price=tier_price,
                                status=status,
                                version=1 if status == Ticket.Status.BOOKED else 0
                            )
                            ticket_objs.append(t)

                Ticket.objects.bulk_create(ticket_objs)
                self.stdout.write(self.style.SUCCESS(f'Created {len(ticket_objs)} tickets for {event.title}'))

                # Create initial Booking records for booked tickets
                booked_tickets = Ticket.objects.filter(event=event, status=Ticket.Status.BOOKED)
                booking_objs = [
                    Booking(
                        user=admin_user,
                        ticket=bt,
                        stripe_payment_intent_id=f"pi_seed_{uuid.uuid4().hex[:18]}",
                        amount_paid=bt.price
                    )
                    for bt in booked_tickets
                ]
                Booking.objects.bulk_create(booking_objs)

        # Try to sync with Elasticsearch if available
        try:
            from apps.search.indexing import sync_all_events
            sync_all_events()
            self.stdout.write(self.style.SUCCESS('Successfully synchronized events with Elasticsearch!'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Note: Elasticsearch sync skipped ({e}). Search will operate via database index fallback.'))

        self.stdout.write(self.style.SUCCESS('Phase 2 Database seeding completed successfully!'))
