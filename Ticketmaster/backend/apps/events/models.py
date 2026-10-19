import uuid
from django.db import models

class Venue(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    seat_map_config = models.JSONField(help_text="Grid layouts: rows, cols, tiers", default=dict, blank=True)
    image_url = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.name} ({self.city})"


class Performer(models.Model):
    name = models.CharField(max_length=255)
    genre = models.CharField(max_length=100)
    bio = models.TextField(blank=True, default='')
    avatar_url = models.TextField(blank=True, default='')
    banner_url = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name


class Event(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='events')
    performer = models.ForeignKey(Performer, on_delete=models.CASCADE, related_name='events')
    event_date = models.DateTimeField()
    is_surge_protected = models.BooleanField(default=False)
    banner_image = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, default='concert')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['event_date', 'venue'])]

    # Aliases for backward-compatibility with UI serializers
    @property
    def name(self):
        return self.title

    @property
    def date(self):
        return self.event_date

    @property
    def surge_mode_active(self):
        return self.is_surge_protected

    def __str__(self):
        return f"{self.title} - {self.performer.name} @ {self.venue.name}"
