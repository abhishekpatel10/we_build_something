export interface ShortenRequest {
  originalUrl: string;
  alias?: string;
  expirationTime?: number; // Unix timestamp in seconds
}

export interface ShortenResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  isCustom: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface UrlItem {
  id?: number;
  short_code: string;
  original_url: string;
  is_custom: boolean;
  click_count: number;
  created_at: string;
  expires_at: string | null;
}

export interface ClickEvent {
  clicked_at: string;
  referrer: string | null;
  user_agent: string | null;
}

export interface UrlStats {
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  isCustom: boolean;
  createdAt: string;
  expiresAt: string | null;
  referrerBreakdown: Record<string, number>;
  recentClicks: ClickEvent[];
}

export interface CounterStatus {
  instanceId: string;
  currentCounter: number;
  maxCounter: number;
  remainingInBatch: number;
  batchSize: number;
  redisKey?: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  redis: {
    status: string;
    mode: string;
  };
  postgres: {
    status: string;
    mode: string;
  };
  uptime?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
