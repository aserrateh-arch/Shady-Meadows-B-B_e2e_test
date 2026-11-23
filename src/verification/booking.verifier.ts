import type { ApiClients } from '../fixtures/test.fixtures';
import type { BookingListEntry, GuestData } from '../api/types';
import type { DateWindow } from '../data/date.utils';

/**
 * Verificador de estado persistido: consultas de lectura y localización de
 * reservas por identidad. Saca de los specs la mecánica de "buscar el
 * registro" (SRP): el test declara QUÉ espera, el verificador sabe CÓMO
 * comprobarlo contra el backend real.
 */
export class BookingVerifier {
  constructor(private readonly api: ApiClients) {}

  /** Snapshot de las reservas de una habitación (estado "antes"). */
  snapshot(roomId: number): Promise<BookingListEntry[]> {
    return this.api.booking.listByRoom(roomId);
  }

  /** Reservas aparecidas después de un snapshot (oráculo de efectos). */
  async newBookingsSince(roomId: number, before: BookingListEntry[]): Promise<BookingListEntry[]> {
    const knownIds = new Set(before.map((b) => b.bookingid));
    const after = await this.api.booking.listByRoom(roomId);
    return after.filter((b) => !knownIds.has(b.bookingid));
  }

  /** Localiza una reserva por identidad completa: huésped + ventana. */
  async findByIdentity(
    roomId: number,
    guest: GuestData,
    window: DateWindow,
  ): Promise<BookingListEntry | undefined> {
    const bookings = await this.api.booking.listByRoom(roomId);
    return bookings.find(
      (b) =>
        b.bookingdates.checkin === window.checkin &&
        b.bookingdates.checkout === window.checkout &&
        b.firstname === guest.firstname &&
        b.lastname === guest.lastname,
    );
  }

  /** Todas las reservas que coinciden con la identidad (detecta duplicados). */
  async findAllByIdentity(
    roomId: number,
    guest: GuestData,
    window: DateWindow,
  ): Promise<BookingListEntry[]> {
    const bookings = await this.api.booking.listByRoom(roomId);
    return bookings.filter(
      (b) =>
        b.bookingdates.checkin === window.checkin &&
        b.bookingdates.checkout === window.checkout &&
        b.firstname === guest.firstname &&
        b.lastname === guest.lastname,
    );
  }
}
