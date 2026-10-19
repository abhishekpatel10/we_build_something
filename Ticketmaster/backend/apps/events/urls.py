from django.urls import path
from .views import (
    EventListView, EventDetailView, EventSeatsView,
    event_seats_stream, VenueListView, PerformerListView
)

urlpatterns = [
    path('', EventListView.as_view(), name='event-list'),
    path('<str:id>/', EventDetailView.as_view(), name='event-detail'),
    path('<str:event_id>/seats/', EventSeatsView.as_view(), name='event-seats'),
    path('<str:event_id>/seats/stream/', event_seats_stream, name='event-seats-stream'),
    path('venues/', VenueListView.as_view(), name='venue-list'),
    path('performers/', PerformerListView.as_view(), name='performer-list'),
]
