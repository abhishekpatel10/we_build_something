import uuid
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.events.models import Venue, Performer, Event
from apps.bookings.models import Ticket, Booking
from apps.bookings.services import reserve_ticket, get_lock_holder, release_ticket_lock, clear_all_locks

class Phase3DistributedLockingTestCase(TestCase):
    def setUp(self):
        clear_all_locks()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='phase3_buyer',
            email='buyer3@test.com',
            password='password123'
        )
        self.client.force_authenticate(user=self.user)

        self.venue = Venue.objects.create(
            name='Lock Arena',
            city='Test City',
            latitude=34.05,
            longitude=-118.25,
            seat_map_config={'sections': ['Floor'], 'rows_per_section': {'Floor': ['A']}, 'seats_per_row': 10}
        )
        self.performer = Performer.objects.create(name='Lock Artist', genre='Rock')
        self.event = Event.objects.create(
            title='Phase 3 Tour',
            description='Distributed locking test event',
            venue=self.venue,
            performer=self.performer,
            event_date=timezone.now(),
            is_surge_protected=False
        )
        self.ticket = Ticket.objects.create(
            event=self.event,
            seat_number='A-1',
            tier='Floor',
            price=150.00,
            status=Ticket.Status.AVAILABLE,
            version=0
        )

    def test_services_reserve_ticket(self):
        # 1. First user locks ticket
        success = reserve_ticket(self.ticket.id, self.user.id)
        self.assertTrue(success)

        # Holder should match
        holder = get_lock_holder(self.ticket.id)
        self.assertEqual(str(holder), str(self.user.id))

        # 2. Second user attempting lock must fail (SET NX return False)
        other_user_id = 9999
        failed = reserve_ticket(self.ticket.id, other_user_id)
        self.assertFalse(failed)

        # Release lock
        release_ticket_lock(self.ticket.id)
        self.assertIsNone(get_lock_holder(self.ticket.id))

    def test_phase1_reserve_endpoint(self):
        # POST /api/bookings/reserve/
        res = self.client.post('/api/bookings/reserve/', {'ticket_id': self.ticket.id}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'SUCCESS')

        # PostgreSQL row remains AVAILABLE (Design decision: no RESERVED in DB)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.Status.AVAILABLE)

        # Double reserve by another client fails with 409 Conflict
        other_user = User.objects.create_user(username='concurrent_user', password='password123')
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)

        res_conflict = other_client.post('/api/bookings/reserve/', {'ticket_id': self.ticket.id}, format='json')
        self.assertEqual(res_conflict.status_code, 409)

    def test_phase2_confirm_endpoint_timeout_when_no_lock(self):
        # Try to confirm without holding lock -> 408 Request Timeout
        res = self.client.post('/api/bookings/confirm/', {
            'ticket_id': self.ticket.id,
            'payment_token': 'tok_visa'
        }, format='json')
        self.assertEqual(res.status_code, 408)
        self.assertIn('Reservation expired or held by another user', res.data['error'])

    def test_phase2_confirm_endpoint_success(self):
        # Step 1: Phase 1 Reserve
        res_reserve = self.client.post('/api/bookings/reserve/', {'ticket_id': self.ticket.id}, format='json')
        self.assertEqual(res_reserve.status_code, 200)

        # Step 2: Phase 2 Confirm
        res_confirm = self.client.post('/api/bookings/confirm/', {
            'ticket_id': self.ticket.id,
            'payment_token': 'tok_visa'
        }, format='json')
        self.assertEqual(res_confirm.status_code, 201)
        self.assertEqual(res_confirm.data['status'], 'SUCCESS')

        # Ticket status is now BOOKED in PostgreSQL
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.Status.BOOKED)
        self.assertEqual(self.ticket.version, 1)

        # Redis lock cleaned up
        self.assertIsNone(get_lock_holder(self.ticket.id))

        # Booking row created
        booking = Booking.objects.get(ticket=self.ticket)
        self.assertEqual(booking.user, self.user)
        self.assertEqual(booking.amount_paid, 150.00)
        self.assertTrue(booking.stripe_payment_intent_id.startswith('pi_'))

        # Attempt to confirm again should return 409 Conflict (or 408 because lock cleared)
        res_double = self.client.post('/api/bookings/confirm/', {
            'ticket_id': self.ticket.id,
            'payment_token': 'tok_visa'
        }, format='json')
        self.assertIn(res_double.status_code, [408, 409])
