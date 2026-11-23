import type { FieldSpec } from './schema.checker';

/**
 * Esquemas del contrato documentado (colección Postman "Restful Booker Platform").
 * Fuente única de verdad estructural para los oráculos.
 */

const BOOKING_DATES: FieldSpec = {
  type: 'object',
  properties: {
    checkin: { type: 'string', format: 'iso-date' },
    checkout: { type: 'string', format: 'iso-date' },
  },
};

/** Contrato documentado COMPLETO del alta: incluye email y phone (BUG-03). */
export const CREATE_BOOKING_RESPONSE_DOCUMENTED: Record<string, FieldSpec> = {
  bookingid: { type: 'number' },
  roomid: { type: 'number' },
  firstname: { type: 'string' },
  lastname: { type: 'string' },
  depositpaid: { type: 'boolean' },
  email: { type: 'string', format: 'email' },
  phone: { type: 'string' },
  bookingdates: BOOKING_DATES,
};

/**
 * Contrato operativo mínimo del alta (lo que el entorno devuelve hoy).
 * Los campos documentados ausentes se verifican en tests/bugs (BUG-03).
 */
export const CREATE_BOOKING_RESPONSE_MIN: Record<string, FieldSpec> = {
  bookingid: { type: 'number' },
  roomid: { type: 'number' },
  firstname: { type: 'string' },
  lastname: { type: 'string' },
  depositpaid: { type: 'boolean' },
  bookingdates: BOOKING_DATES,
};

/** Entrada de GET /api/booking?roomid=N. */
export const BOOKING_LIST_ENTRY: Record<string, FieldSpec> = {
  bookingid: { type: 'number' },
  roomid: { type: 'number' },
  firstname: { type: 'string' },
  lastname: { type: 'string' },
  depositpaid: { type: 'boolean' },
  bookingdates: BOOKING_DATES,
};

/** Cuerpo de error de validación (400). */
export const ERROR_BODY: Record<string, FieldSpec> = {
  errors: { type: 'array' },
};

/** Respuesta de POST /api/auth/login. */
export const AUTH_RESPONSE: Record<string, FieldSpec> = {
  token: { type: 'string' },
};
