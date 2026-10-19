import { apiClient } from './client';
import { SearchResponse } from './types';

export interface SearchParams {
  term?: string;
  location?: string;
  type?: string;
  date?: string;
  lat?: number;
  lon?: number;
  radius?: string;
  page?: number;
}

export async function searchEvents(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();
  if (params.term) query.set('term', params.term);
  if (params.location) query.set('location', params.location);
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.date) query.set('date', params.date);
  if (params.lat !== undefined) query.set('lat', params.lat.toString());
  if (params.lon !== undefined) query.set('lon', params.lon.toString());
  if (params.radius) query.set('radius', params.radius);
  if (params.page) query.set('page', params.page.toString());

  return apiClient<SearchResponse>(`/api/search/?${query.toString()}`);
}
