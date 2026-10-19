import json
import time
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Event, Venue, Performer
from apps.bookings.models import Ticket
from .serializers import (
    EventListSerializer, EventDetailSerializer,
    VenueSerializer, PerformerSerializer, TicketSerializer
)
from apps.bookings.locks import get_redis_client, get_ticket_lock_owner

class EventListView(generics.ListAPIView):
    serializer_class = EventListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Event.objects.select_related('venue', 'performer').prefetch_related('tickets').all()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class EventDetailView(generics.RetrieveAPIView):
    queryset = Event.objects.select_related('venue', 'performer').all()
    serializer_class = EventDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'


class EventSeatsView(APIView):
    """
    Returns full seat map for the event, reconciled against Redis distributed locks.
    Phase 2 Design Decision: PostgreSQL holds only AVAILABLE and BOOKED.
    The temporary RESERVED status is purely in-memory in Redis with TTL.
    """
    permission_classes = [AllowAny]

    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        tickets = Ticket.objects.filter(event=event)

        seats_data = []
        user_id = str(request.user.id) if request.user.is_authenticated else None

        for ticket in tickets:
            db_status = ticket.status.lower()  # 'available' or 'booked'
            effective_status = db_status
            reserved_by_current = False

            # If available in DB, cross-reference with temporary Redis lock
            if db_status == 'available':
                from apps.bookings.services import get_lock_holder
                lock_owner = get_lock_holder(str(ticket.id))
                if lock_owner:
                    effective_status = 'reserved'
                    if user_id and str(lock_owner) == str(user_id):
                        reserved_by_current = True

            # Extract row from seat_number (e.g., 'A-12' -> row 'A', seat_num 12)
            parts = ticket.seat_number.split('-')
            row = parts[0] if len(parts) >= 1 else 'A'
            try:
                seat_num = int(parts[1]) if len(parts) >= 2 else 1
            except ValueError:
                seat_num = 1

            seats_data.append({
                'id': str(ticket.id),
                'section': ticket.tier,
                'tier': ticket.tier,
                'row': row,
                'seat_number': seat_num,
                'seat_label': ticket.seat_number,
                'price': float(ticket.price),
                'status': effective_status,
                'version': ticket.version,
                'is_reserved_by_current_user': reserved_by_current,
            })

        return Response({
            'event_id': str(event.id),
            'venue_layout': event.venue.seat_map_config,
            'total_seats': len(seats_data),
            'seats': seats_data
        })


def event_seats_stream(request, event_id):
    """
    Server-Sent Events (SSE) endpoint to push real-time seat status updates.
    """
    def event_stream():
        yield f"event: connect\ndata: {json.dumps({'message': 'Connected to live seat map SSE', 'event_id': str(event_id)})}\n\n"

        r = get_redis_client()
        channel = f"event:{event_id}:seats"
        pubsub = None

        if r:
            try:
                pubsub = r.pubsub()
                pubsub.subscribe(channel, 'event_seat_updates')
            except Exception:
                pubsub = None

        last_heartbeat = time.time()

        for _ in range(60):
            if pubsub:
                try:
                    message = pubsub.get_message(timeout=1.0)
                    if message and message['type'] == 'message':
                        payload = message['data']
                        if isinstance(payload, bytes):
                            payload = payload.decode('utf-8')

                        # Handle format "ticket_id:STATUS"
                        if ':' in payload and not payload.startswith('{'):
                            t_id, t_status = payload.split(':', 1)
                            payload = json.dumps({'ticket_id': t_id, 'status': t_status.lower()})

                        yield f"event: seat_update\ndata: {payload}\n\n"
                except Exception:
                    pass
            else:
                time.sleep(1.0)

            if time.time() - last_heartbeat >= 15:
                yield f": heartbeat {int(time.time())}\n\n"
                last_heartbeat = time.time()

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


class VenueListView(generics.ListAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [AllowAny]


class PerformerListView(generics.ListAPIView):
    queryset = Performer.objects.all()
    serializer_class = PerformerSerializer
    permission_classes = [AllowAny]
