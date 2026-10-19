import type {
  ShortenRequest,
  ShortenResponse,
  UrlItem,
  UrlStats,
  CounterStatus,
  HealthStatus,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

class ApiService {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.message) errorMsg = errorJson.message;
        else if (errorJson.error) errorMsg = errorJson.error;
      } catch {
        // use fallback message
      }
      throw new Error(errorMsg);
    }

    return (await response.json()) as T;
  }

  // Create a shortened URL
  async createShortUrl(payload: ShortenRequest): Promise<ShortenResponse> {
    return this.request<ShortenResponse>('/api/v1/urls', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Fetch recent URLs
  async getRecentUrls(limit = 15): Promise<UrlItem[]> {
    const res = await this.request<{ urls: UrlItem[] }>(`/api/v1/urls/recent?limit=${limit}`);
    return res.urls || [];
  }

  // Fetch stats for a specific shortcode
  async getUrlStats(shortCode: string): Promise<UrlStats> {
    return this.request<UrlStats>(`/api/v1/urls/${encodeURIComponent(shortCode)}/stats`);
  }

  // Fetch distributed counter & batch token status
  async getCounterStatus(): Promise<CounterStatus> {
    return this.request<CounterStatus>('/api/v1/counter/status');
  }

  // Fetch cluster health telemetry
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/api/v1/health');
  }
}

export const apiService = new ApiService();
