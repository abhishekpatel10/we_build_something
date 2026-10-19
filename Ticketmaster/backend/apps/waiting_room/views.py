from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .queue import enqueue_user, get_queue_status, leave_queue, admit_batch
from apps.events.models import Event

class JoinQueueView(APIView):
    """
    POST /api/waiting-room/join/
    Body: {"event_id": "<uuid>"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        event_id = request.data.get('event_id')
        if not event_id:
            return Response({'error': 'event_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve user identifier
        if request.user.is_authenticated:
            user_id = str(request.user.id)
        else:
            # Anonymous or session-based visitor token
            user_id = request.data.get('client_token') or request.session.session_key or 'anon_visitor'

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not event.surge_mode_active:
            return Response({
                'admitted': True,
                'message': 'Surge mode is not active for this event. Direct booking allowed.',
                'position': 0,
                'estimated_wait_seconds': 0
            })

        status_info = enqueue_user(str(event.id), user_id)
        return Response({
            'event_id': str(event.id),
            'user_id': user_id,
            **status_info
        }, status=status.HTTP_200_OK)


class QueueStatusView(APIView):
    """
    GET /api/waiting-room/status/?event_id=<uuid>&client_token=<token>
    """
    permission_classes = [AllowAny]

    def get(self, request):
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({'error': 'event_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_authenticated:
            user_id = str(request.user.id)
        else:
            user_id = request.query_params.get('client_token') or request.session.session_key or 'anon_visitor'

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not event.surge_mode_active:
            return Response({
                'admitted': True,
                'position': 0,
                'total_queued': 0,
                'estimated_wait_seconds': 0
            })

        status_info = get_queue_status(str(event.id), user_id)
        return Response({
            'event_id': str(event.id),
            'user_id': user_id,
            **status_info
        })


class LeaveQueueView(APIView):
    """
    POST /api/waiting-room/leave/
    Body: {"event_id": "<uuid>"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        event_id = request.data.get('event_id')
        if request.user.is_authenticated:
            user_id = str(request.user.id)
        else:
            user_id = request.data.get('client_token') or request.session.session_key or 'anon_visitor'

        leave_queue(str(event_id), user_id)
        return Response({'message': 'Removed from waiting room queue.'})


class TriggerBatchAdmitView(APIView):
    """
    POST /api/waiting-room/admit-now/
    Utility endpoint for live testing to admit next batch of users immediately.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        event_id = request.data.get('event_id')
        batch_size = int(request.data.get('batch_size', 50))
        admitted = admit_batch(str(event_id), batch_size=batch_size)
        return Response({
            'message': f'Admitted {len(admitted)} users from waiting room queue.',
            'admitted_count': len(admitted),
            'admitted_users': admitted
        })
