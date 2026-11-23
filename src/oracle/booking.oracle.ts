import type { APIResponse } from '@playwright/test';
import type { BookingListEntry, BookingRequest } from '../api/types';
import { CREATE_BOOKING_RESPONSE_MIN, ERROR_BODY } from './contracts';
import { checkHeaders, checkSchema } from './schema.checker';

/**
 * Oráculo de contrato: codifica lo que la DOCUMENTACIÓN de la API promete
 * (colección Postman "Restful Booker Platform") y compara el comportamiento
 * observado contra esa expectativa. Cada desviación se reporta como
 * `Divergence`; el test falla si la lista no está vacía y la adjunta
 * como evidencia en el reporte.
 */

export interface Divergence {
  check: string;
  expected: string;
  observed: string;
}

const GUEST_FIELDS = [
  'firstname',
  'lastname',
  'email',
  'phone',
] as const satisfies ReadonlyArray<keyof BookingRequest>;

async function safeJson(response: APIResponse): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return { __unparseableBody: await response.text().catch(() => '<sin cuerpo>') };
  }
}

function isIsoDate(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Contrato de POST /api/booking/: 201, JSON, esquema y bookingid válido. */
export async function checkCreateContract(response: APIResponse): Promise<Divergence[]> {
  const divergences: Divergence[] = [];
  const status = response.status();
  if (status !== 201) {
    divergences.push({
      check: 'POST /api/booking status',
      expected: '201 Created',
      observed: String(status),
    });
  }
  divergences.push(...checkHeaders(response));
  const body = await safeJson(response);
  divergences.push(...checkSchema(body, CREATE_BOOKING_RESPONSE_MIN));
  if (typeof body.bookingid !== 'number' || body.bookingid <= 0) {
    divergences.push({
      check: 'POST /api/booking body.bookingid',
      expected: 'number > 0',
      observed: JSON.stringify(body.bookingid),
    });
  }
  return divergences;
}

/**
 * Contrato de identidad sobre el listado por habitación
 * (GET /api/booking/?roomid=N): la reserva consultada debe ser eco exacto
 * de los campos de identidad enviados.
 */
export function checkBookingIdentity(
  actual: BookingListEntry,
  expected: BookingRequest,
): Divergence[] {
  const divergences: Divergence[] = [];
  if (actual.roomid !== expected.roomid) {
    divergences.push({
      check: 'roomid',
      expected: String(expected.roomid),
      observed: JSON.stringify(actual.roomid),
    });
  }
  for (const field of ['firstname', 'lastname'] as const) {
    if (actual[field] !== expected[field]) {
      divergences.push({
        check: `huésped.${field}`,
        expected: String(expected[field]),
        observed: JSON.stringify(actual[field]),
      });
    }
  }
  if (actual.depositpaid !== expected.depositpaid) {
    divergences.push({
      check: 'depositpaid',
      expected: String(expected.depositpaid),
      observed: JSON.stringify(actual.depositpaid),
    });
  }
  divergences.push(...checkBookingDates(actual.bookingdates, expected));
  return divergences;
}

/** Contrato documentado completo: eco de TODOS los campos, incluidos email/phone. */
export function checkFullBookingContract(
  actual: Record<string, unknown>,
  expected: BookingRequest,
): Divergence[] {
  const divergences: Divergence[] = [];
  if (actual.roomid !== expected.roomid) {
    divergences.push({
      check: 'roomid',
      expected: String(expected.roomid),
      observed: JSON.stringify(actual.roomid),
    });
  }
  for (const field of GUEST_FIELDS) {
    if (actual[field] !== expected[field]) {
      divergences.push({
        check: `huésped.${field}`,
        expected: String(expected[field]),
        observed: JSON.stringify(actual[field]),
      });
    }
  }
  if (actual.depositpaid !== expected.depositpaid) {
    divergences.push({
      check: 'depositpaid',
      expected: String(expected.depositpaid),
      observed: JSON.stringify(actual.depositpaid),
    });
  }
  const dates = (actual.bookingdates ?? {}) as Record<string, unknown>;
  divergences.push(...checkBookingDates(dates, expected));
  return divergences;
}

function checkBookingDates(
  dates: { checkin?: unknown; checkout?: unknown } | undefined,
  expected: BookingRequest,
): Divergence[] {
  const divergences: Divergence[] = [];
  const actual = dates ?? {};
  for (const key of ['checkin', 'checkout'] as const) {
    if (!isIsoDate(actual[key]) || actual[key] !== expected.bookingdates[key]) {
      divergences.push({
        check: `bookingdates.${key}`,
        expected: expected.bookingdates[key],
        observed: JSON.stringify(actual[key]),
      });
    }
  }
  return divergences;
}

/**
 * Contrato del rechazo (dato obligatorio ausente/inválido):
 * 400 Bad Request, cuerpo con mensajes de validación y SIN bookingid.
 */
export async function checkRejectionContract(
  response: APIResponse,
  expectedErrorFragment: string,
): Promise<Divergence[]> {
  const divergences: Divergence[] = [];
  const status = response.status();
  if (status !== 400) {
    divergences.push({
      check: 'POST /api/booking inválido status',
      expected: '400 Bad Request',
      observed: String(status),
    });
  }
  divergences.push(...checkHeaders(response));
  const body = await safeJson(response);
  divergences.push(...checkSchema(body, ERROR_BODY, 'body', { allowExtraFields: true }));
  if (body.bookingid !== undefined) {
    divergences.push({
      check: 'POST /api/booking inválido body',
      expected: 'sin bookingid (no se crea la reserva)',
      observed: `bookingid=${JSON.stringify(body.bookingid)}`,
    });
  }
  const errors = Array.isArray(body.errors) ? body.errors : [];
  if (errors.some((e) => typeof e !== 'string' || e.trim() === '')) {
    divergences.push({
      check: 'POST /api/booking inválido errores (formato)',
      expected: 'todos los mensajes son strings no vacíos',
      observed: JSON.stringify(body.errors),
    });
  }
  if (!errors.some((e) => String(e).includes(expectedErrorFragment))) {
    divergences.push({
      check: 'POST /api/booking inválido errores',
      expected: `mensaje que contenga "${expectedErrorFragment}"`,
      observed: JSON.stringify(body.errors),
    });
  }
  return divergences;
}
