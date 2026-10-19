from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def api_health(request):
    return Response({
        'status': 'healthy',
        'service': 'Ticketmaster Core Booking API',
        'phase': 'Phase 1 - Foundation & Architecture',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/',
            'events': '/api/events/',
            'search': '/api/search/',
            'booking': '/api/booking/',
            'waiting_room': '/api/waiting-room/'
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health, name='api-health'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/events/', include('apps.events.urls')),
    path('api/search/', include('apps.search.urls')),
    path('api/booking/', include('apps.bookings.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/waiting-room/', include('apps.waiting_room.urls')),
]
