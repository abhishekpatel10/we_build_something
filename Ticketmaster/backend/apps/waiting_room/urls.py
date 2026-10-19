from django.urls import path
from .views import JoinQueueView, QueueStatusView, LeaveQueueView, TriggerBatchAdmitView

urlpatterns = [
    path('join/', JoinQueueView.as_view(), name='queue-join'),
    path('status/', QueueStatusView.as_view(), name='queue-status'),
    path('leave/', LeaveQueueView.as_view(), name='queue-leave'),
    path('admit-now/', TriggerBatchAdmitView.as_view(), name='queue-admit-now'),
]
