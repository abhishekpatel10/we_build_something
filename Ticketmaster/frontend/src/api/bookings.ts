import { apiClient } from './client';
import { ReservationResult, BookingConfirmation } from './types';

export async function reserveTicket(ticketId: string): Promise<ReservationResult> {
  return apiClient<ReservationResult>('/api/bookings/reserve/', {
    method: 'POST',
    body: JSON.stringify({ ticket_id: ticketId, ticketId }),
  });
}

export async function confirmBooking(
  ticketId: string,
  paymentDetails: {
    paymentMethodId?: string;
    payment_token?: string;
    cardholderName?: string;
    last4?: string;
    idempotencyKey?: string;
  }
): Promise<{ status: string; message: string; booking: BookingConfirmation }> {
  const paymentToken = paymentDetails.payment_token || paymentDetails.paymentMethodId || 'tok_visa';
  return apiClient<{ status: string; message: string; booking: BookingConfirmation }>('/api/bookings/confirm/', {
    method: 'POST',
    body: JSON.stringify({
      ticket_id: ticketId,
      ticketId,
      payment_token: paymentToken,
      paymentDetails,
    }),
  });
}

export async function releaseReservation(ticketId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>('/api/bookings/release/', {
    method: 'POST',
    body: JSON.stringify({ ticket_id: ticketId, ticketId }),
  });
}

export async function getMyBookings(): Promise<{ results: BookingConfirmation[] } | BookingConfirmation[]> {
  return apiClient<any>('/api/bookings/my-bookings/');
}
