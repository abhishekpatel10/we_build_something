export interface Venue {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  seat_map_config: {
    sections?: string[];
    rows_per_section?: Record<string, string[]>;
    seats_per_row?: number;
  };
  address?: string;
  state?: string;
  country?: string;
  image_url?: string;
}

export interface Performer {
  id: string;
  name: string;
  genre: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
}

export interface EventItem {
  id: string;
  title?: string;
  name: string;
  description: string;
  category: string;
  event_date?: string;
  date: string;
  is_surge_protected?: boolean;
  surge_mode_active: boolean;
  banner_image: string;
  status?: string;
  venue: Venue;
  performer: Performer;
  available_tickets_count?: number;
  available_tickets?: number;
  min_price?: number;
  total_tickets?: number;
}

export interface TicketSeat {
  id: string;
  event_id?: string;
  seat_number: number | string;
  tier?: string;
  section: string;
  row: string;
  seat_label: string;
  price: number;
  status: 'available' | 'reserved' | 'booked' | 'AVAILABLE' | 'BOOKED' | string;
  version?: number;
  is_reserved_by_current_user?: boolean;
  reservation_expires_at?: string | null;
}

export interface SeatMapResponse {
  event_id: string;
  venue_layout: any;
  total_seats: number;
  seats: TicketSeat[];
}

export interface ReservationResult {
  message: string;
  ticketId: string;
  seatLabel: string;
  price: number;
  expiresAt: string;
  ttlSeconds: number;
}

export interface BookingConfirmation {
  id: string;
  stripe_payment_intent_id?: string;
  booking_reference: string;
  amount_paid?: string | number;
  amount: string | number;
  currency?: string;
  status: string;
  payment_method_last4?: string;
  created_at: string;
  confirmed_at?: string;
  event_name: string;
  venue_name: string;
  event_date: string;
  ticket: TicketSeat;
}

export interface QueueStatusResponse {
  event_id: string;
  user_id: string;
  admitted: boolean;
  position: number;
  total_queued: number;
  estimated_wait_seconds: number;
  token_ttl?: number;
}

export interface SearchResponse {
  engine: 'elasticsearch' | 'database_index';
  total: number;
  page: number;
  page_size: number;
  results: EventItem[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}
