import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { BookingListEntry, BookingRequest } from './types';

/**
 * Cliente del recurso Booking.
 * Expone respuestas crudas para que los tests y el oráculo evalúen
 * contrato (status + payload) sin esconder desviaciones.
 *
 * Nota de entorno: este cliente debe usarse sobre un contexto autenticado
 * (Cookie: token=...) para los endpoints de consulta; el alta es pública.
 */
export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  create(payload: Partial<BookingRequest>): Promise<APIResponse> {
    return this.request.post('/api/booking', { data: payload });
  }

  /** Endpoint documentado para consultar una reserva por id. */
  getById(bookingId: number): Promise<APIResponse> {
    return this.request.get(`/api/booking/${bookingId}`);
  }

  /** Listado por habitación (requiere auth en este entorno). */
  async listByRoom(roomId: number): Promise<BookingListEntry[]> {
    const response = await this.request.get(`/api/booking?roomid=${roomId}`);
    if (!response.ok()) {
      throw new Error(`GET /api/booking?roomid=${roomId} falló con ${response.status()}`);
    }
    const body = (await response.json()) as { bookings: BookingListEntry[] };
    return body.bookings;
  }
}
