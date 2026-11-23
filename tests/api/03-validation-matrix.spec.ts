import type { BookingRequest } from '../../src/api/types';
import { attachDivergences } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

type PayloadOverrides = Record<string, unknown>;

/**
 * Escenarios 04-11 (docs/escenarios.md): matriz de validación estricta.
 * Cada constraint documentado del payload genera su caso negativo con oráculo
 * de rechazo (400 + esquema de error + mensaje) y oráculo de no-persistencia.
 */
const strictRejections: Array<{ label: string; overrides: PayloadOverrides; error: string }> = [
  { label: 'firstname vacío', overrides: { firstname: '' }, error: 'Firstname should not be blank' },
  { label: 'lastname vacío', overrides: { lastname: '' }, error: 'Lastname should not be blank' },
  { label: 'email mal formado', overrides: { email: 'no-es-un-email' }, error: 'well-formed email' },
  { label: 'phone de 10 dígitos (mínimo 11)', overrides: { phone: '1234567890' }, error: 'size must be between 11 and 21' },
  { label: 'roomid inválido (0)', overrides: { roomid: 0 }, error: 'must be greater than or equal to 1' },
  { label: 'firstname null', overrides: { firstname: null }, error: 'Firstname should not be blank' },
  { label: 'depositpaid null', overrides: { depositpaid: null }, error: 'Failed to create booking' },
  { label: 'roomid null', overrides: { roomid: null }, error: 'Failed to create booking' },
];

test.describe('matriz de validación — rechazos estrictos', () => {
  for (const { label, overrides, error } of strictRejections) {
    test(`rechaza ${label} y no persiste`, async ({
      roomUnderTest,
      guest,
      freeWindow,
      bookingApiFlow,
    }, testInfo) => {
      const payload = {
        ...guest,
        roomid: roomUnderTest.roomid,
        depositpaid: false,
        bookingdates: freeWindow,
        ...overrides,
      } as BookingRequest;

      const divergences = await bookingApiFlow.createExpectingRejection(payload, error);

      await attachDivergences(testInfo, divergences, 'divergencias-contrato', { caso: label });
      expect(divergences, `el payload con ${label} debe ser rechazado sin persistir`).toEqual([]);
    });
  }
});

/**
 * Escenarios 12-14 (docs/escenarios.md): reglas de negocio que el backend NO
 * enforcea hoy (BUG-06/07/08, docs/hallazgos.md). Fallos esperados: avisarán
 * ("unexpectedly passed") cuando el backend las implemente.
 */
const businessRules: Array<{ label: string; bug: string; overrides: PayloadOverrides }> = [
  { label: 'check-in en el pasado', bug: 'BUG-06', overrides: { bookingdates: { checkin: '2020-01-01', checkout: '2020-01-03' } } },
  { label: 'phone no numérico', bug: 'BUG-07', overrides: { phone: 'abcdefghijk' } },
  { label: 'checkout anterior al checkin (esperado 400, observado 409 genérico)', bug: 'BUG-08', overrides: { bookingdates: { checkin: '2027-03-05', checkout: '2027-03-03' } } },
];

test.describe('reglas de negocio no enforced por el backend', { tag: '@known-bug' }, () => {
  for (const { label, bug, overrides } of businessRules) {
    test(`${bug}: debería rechazar ${label}`, async ({
      api,
      roomUnderTest,
      guest,
      freeWindow,
    }, testInfo) => {
      const payload = {
        ...guest,
        roomid: roomUnderTest.roomid,
        depositpaid: false,
        bookingdates: freeWindow,
        ...overrides,
      } as BookingRequest;

      const response = await api.booking.create(payload);
      await testInfo.attach('respuesta-observada', {
        body: JSON.stringify({ caso: label, status: response.status(), body: await response.text() }, null, 2),
        contentType: 'application/json',
      });
      expect(response.status(), `${bug}: ${label} debe rechazarse con 400`).toBe(400);
    });
  }

  /**
   * Escenarios 15-16 (docs/escenarios.md), BUG-10: bookingdates null/ausente
   * NUNCA recibe respuesta HTTP (conexión colgada). El contrato exige 400.
   */
  for (const variant of [
    { label: 'bookingdates null', remove: false },
    { label: 'bookingdates ausente', remove: true },
  ]) {
    test(`BUG-10: ${variant.label} debe responder 400`, async ({
      api,
      roomUnderTest,
      guest,
      freeWindow,
    }) => {
      const payload: Record<string, unknown> = {
        ...guest,
        roomid: roomUnderTest.roomid,
        depositpaid: false,
        bookingdates: freeWindow,
      };
      if (variant.remove) {
        delete payload.bookingdates;
      } else {
        payload.bookingdates = null;
      }

      let outcome: string;
      try {
        const response = await api.booking.create(payload as unknown as BookingRequest, {
          timeout: 10_000,
        });
        outcome = `HTTP ${response.status()}`;
      } catch {
        outcome = 'sin respuesta HTTP (timeout/reset de conexión)';
      }
      expect(outcome, 'un payload sin bookingdates debe recibir 400, no colgar el endpoint').toBe(
        'HTTP 400',
      );
    });
  }
});
