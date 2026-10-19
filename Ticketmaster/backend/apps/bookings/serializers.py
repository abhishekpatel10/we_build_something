from rest_framework import serializers
from .models import Booking, Ticket
from apps.events.serializers import TicketSerializer

class ReserveRequestSerializer(serializers.Serializer):
    ticketId = serializers.CharField(required=False)
    ticket_id = serializers.CharField(required=False)

    def validate(self, attrs):
        ticket_id = attrs.get('ticketId') or attrs.get('ticket_id')
        if not ticket_id:
            raise serializers.ValidationError({"ticketId": "ticketId or ticket_id is required."})
        attrs['resolved_ticket_id'] = ticket_id
        return attrs


class ConfirmRequestSerializer(serializers.Serializer):
    ticketId = serializers.CharField(required=False)
    ticket_id = serializers.CharField(required=False)
    paymentDetails = serializers.DictField(required=False, default=dict)
    payment_details = serializers.DictField(required=False, default=dict)

    def validate(self, attrs):
        ticket_id = attrs.get('ticketId') or attrs.get('ticket_id')
        if not ticket_id:
            raise serializers.ValidationError({"ticketId": "ticketId or ticket_id is required."})
        attrs['resolved_ticket_id'] = ticket_id
        attrs['resolved_payment'] = attrs.get('paymentDetails') or attrs.get('payment_details') or {}
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    ticket = TicketSerializer(read_only=True)
    event_name = serializers.CharField(source='ticket.event.title', read_only=True)
    venue_name = serializers.CharField(source='ticket.event.venue.name', read_only=True)
    event_date = serializers.DateTimeField(source='ticket.event.event_date', read_only=True)
    booking_reference = serializers.CharField(source='stripe_payment_intent_id', read_only=True)
    amount = serializers.DecimalField(source='amount_paid', max_digits=8, decimal_places=2, read_only=True)
    status = serializers.CharField(default='confirmed', read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'ticket', 'stripe_payment_intent_id', 'booking_reference',
            'amount_paid', 'amount', 'status', 'created_at',
            'event_name', 'venue_name', 'event_date'
        )
