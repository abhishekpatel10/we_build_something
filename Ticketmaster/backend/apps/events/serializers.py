from rest_framework import serializers
from .models import Venue, Performer, Event
from apps.bookings.models import Ticket

class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = '__all__'


class PerformerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Performer
        fields = '__all__'


class TicketSerializer(serializers.ModelSerializer):
    seat_section = serializers.CharField(source='tier', read_only=True)
    seat_label = serializers.CharField(source='seat_number', read_only=True)
    is_reserved_by_current_user = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'event_id', 'seat_number', 'seat_section', 'tier',
            'seat_label', 'price', 'status', 'version',
            'is_reserved_by_current_user'
        )

    def get_is_reserved_by_current_user(self, obj):
        return False


class EventListSerializer(serializers.ModelSerializer):
    venue = VenueSerializer(read_only=True)
    performer = PerformerSerializer(read_only=True)
    name = serializers.CharField(source='title', read_only=True)
    date = serializers.DateTimeField(source='event_date', read_only=True)
    surge_mode_active = serializers.BooleanField(source='is_surge_protected', read_only=True)
    available_tickets_count = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'name', 'description', 'category', 'event_date', 'date',
            'is_surge_protected', 'surge_mode_active', 'banner_image',
            'venue', 'performer', 'available_tickets_count', 'min_price'
        )

    def get_available_tickets_count(self, obj):
        return obj.tickets.filter(status=Ticket.Status.AVAILABLE).count()

    def get_min_price(self, obj):
        cheapest = obj.tickets.filter(status=Ticket.Status.AVAILABLE).order_by('price').first()
        return cheapest.price if cheapest else None


class EventDetailSerializer(serializers.ModelSerializer):
    venue = VenueSerializer(read_only=True)
    performer = PerformerSerializer(read_only=True)
    name = serializers.CharField(source='title', read_only=True)
    date = serializers.DateTimeField(source='event_date', read_only=True)
    surge_mode_active = serializers.BooleanField(source='is_surge_protected', read_only=True)
    total_tickets = serializers.SerializerMethodField()
    available_tickets = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'title', 'name', 'description', 'category', 'event_date', 'date',
            'is_surge_protected', 'surge_mode_active', 'banner_image',
            'venue', 'performer', 'total_tickets', 'available_tickets',
            'min_price', 'max_price', 'created_at'
        )

    def get_total_tickets(self, obj):
        return obj.tickets.count()

    def get_available_tickets(self, obj):
        return obj.tickets.filter(status=Ticket.Status.AVAILABLE).count()

    def get_min_price(self, obj):
        first = obj.tickets.order_by('price').first()
        return first.price if first else 0

    def get_max_price(self, obj):
        last = obj.tickets.order_by('-price').first()
        return last.price if last else 0
