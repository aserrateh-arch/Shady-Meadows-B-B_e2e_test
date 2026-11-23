/** Contratos de datos de la API de Restful Booker Platform (/api). */

export interface BookingDates {
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
}

export interface GuestData {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

export interface BookingRequest extends GuestData {
  roomid: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
}

/** Respuesta de POST /api/booking/ (201). */
export interface CreatedBooking {
  bookingid: number;
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  email?: string;
  phone?: string;
  bookingdates: BookingDates;
}

/** Entrada de GET /api/booking/?roomid=N (requiere auth). */
export interface BookingListEntry {
  bookingid: number;
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  bookingdates: BookingDates;
}

export interface Room {
  roomid: number;
  roomName: string;
  type: string;
  beds?: number;
  accessible: boolean;
  features: string[];
  roomPrice: number;
  description?: string;
  image?: string;
}

/** Entrada de GET /api/report/ (requiere auth): lista plana por reserva. */
export interface ReportEntry {
  start: string;
  end: string;
  title: string; // "Firstname Lastname - Room: 101"
}

export interface ApiError {
  errors?: string[];
  error?: string;
  [key: string]: unknown;
}
