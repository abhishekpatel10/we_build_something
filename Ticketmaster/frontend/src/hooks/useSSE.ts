import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../api/client';

export interface SeatUpdateMessage {
  ticket_id: string;
  status: 'available' | 'reserved' | 'booked';
  user_id?: string;
  timestamp: number;
}

export function useSSE(eventId: string | undefined, onSeatUpdate: (update: SeatUpdateMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const url = `${API_BASE_URL}/api/events/${eventId}/seats/stream/`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    es.addEventListener('seat_update', (event) => {
      try {
        const data: SeatUpdateMessage = JSON.parse(event.data);
        onSeatUpdate(data);
      } catch (err) {
        console.error('Failed to parse SSE seat_update message', err);
      }
    });

    es.onerror = () => {
      setIsConnected(false);
      setError('Live SSE stream reconnecting...');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [eventId]);

  return { isConnected, error };
}
