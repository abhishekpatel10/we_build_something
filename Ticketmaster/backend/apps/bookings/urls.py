from django.urls import path
from .views import ReserveTicketView, ConfirmBookingView, ReleaseReservationView, UserBookingsView

urlpatterns = [
    path('reserve/', ReserveTicketView.as_view(), name='booking-reserve'),
    path('confirm/', ConfirmBookingView.as_view(), name='booking-confirm'),
    path('release/', ReleaseReservationView.as_view(), name='booking-release'),
    path('my-bookings/', UserBookingsView.as_view(), name='booking-my-history'),
]
