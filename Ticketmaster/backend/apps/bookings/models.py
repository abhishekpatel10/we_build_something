import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.events.models import Event

User = get_user_model()

class Ticket(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        BOOKED = 'BOOKED', 'Booked'

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    seat_number = models.CharField(max_length=20)  # e.g., "A-12"
    tier = models.CharField(max_length=50)        # e.g., "VIP", "General"
    price = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    version = models.IntegerField(default=0)      # Optimistic concurrency control

    class Meta:
        unique_together = ('event', 'seat_number')
        indexes = [models.Index(fields=['event', 'status'])]

    # Helper properties for UI compatibility
    @property
    def seat_label(self):
        return self.seat_number

    @property
    def seat_section(self):
        return self.tier

    @property
    def seat_row(self):
        # Extract row from "VIP-A12" or "A-12" or default to "A"
        parts = self.seat_number.split('-')
        if len(parts) >= 2:
            return parts[-1][0] if parts[-1] and parts[-1][0].isalpha() else parts[0]
        return "A"

    def __str__(self):
        return f"Ticket {self.seat_number} ({self.tier}) - {self.status} for {self.event.title}"


class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    ticket = models.OneToOneField(Ticket, on_delete=models.PROTECT)
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount_paid = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    # Helper properties for UI compatibility
    @property
    def booking_reference(self):
        return self.stripe_payment_intent_id

    @property
    def amount(self):
        return self.amount_paid

    @property
    def status(self):
        return 'confirmed'

    @property
    def payment_method_last4(self):
        return '4242'

    def __str__(self):
        return f"Booking {self.stripe_payment_intent_id} - Ticket {self.ticket.seat_number}"
