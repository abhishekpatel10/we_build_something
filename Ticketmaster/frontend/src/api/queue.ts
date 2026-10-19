import { apiClient } from './client';
import { QueueStatusResponse } from './types';

export function getClientToken(): string {
  let token = localStorage.getItem('tm_queue_client_token');
  if (!token) {
    token = 'client_' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('tm_queue_client_token', token);
  }
  return token;
}

export async function joinQueue(eventId: string): Promise<QueueStatusResponse> {
  const clientToken = getClientToken();
  return apiClient<QueueStatusResponse>('/api/waiting-room/join/', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, client_token: clientToken }),
  });
}

export async function getQueueStatus(eventId: string): Promise<QueueStatusResponse> {
  const clientToken = getClientToken();
  return apiClient<QueueStatusResponse>(`/api/waiting-room/status/?event_id=${eventId}&client_token=${clientToken}`);
}

export async function leaveQueue(eventId: string): Promise<{ message: string }> {
  const clientToken = getClientToken();
  return apiClient<{ message: string }>('/api/waiting-room/leave/', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, client_token: clientToken }),
  });
}

export async function triggerBatchAdmit(eventId: string, batchSize: number = 20): Promise<any> {
  return apiClient('/api/waiting-room/admit-now/', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, batch_size: batchSize }),
  });
}
