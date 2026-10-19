from django.urls import path
from .views import SearchEventsView

urlpatterns = [
    path('', SearchEventsView.as_view(), name='search-events'),
]
