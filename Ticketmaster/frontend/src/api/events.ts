import { apiClient } from './client';
import { EventItem, SeatMapResponse } from './types';

export async function getEvents(category?: string): Promise<{ results: EventItem[] }> {
  const query = category && category !== 'all' ? `?category=${category}` : '';
  const data = await apiClient<any>(`/api/events/${query}`);
  // In DRF, standard pagination returns { count, next, previous, results } or list
  if (Array.isArray(data)) {
    return { results: data };
  }
  return data;
}

export async function getEventDetail(eventId: string): Promise<EventItem> {
  return apiClient<EventItem>(`/api/events/${eventId}/`);
}

export async function getEventSeats(eventId: string): Promise<SeatMapResponse> {
  return apiClient<SeatMapResponse>(`/api/events/${eventId}/seats/`);
}
