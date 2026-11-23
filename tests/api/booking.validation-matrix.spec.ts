import type { BookingRequest } from '../../src/api/types';
import { checkRejectionContract } from '../../src/oracle/booking.oracle';
import { expect, test } from '../../src/fixtures/test.fixtures';

type PayloadOverrides = Record<string, unknown>;

/**
 * Matriz de validación derivada del contrato documentado (colección Postman):
 * cada regla del payload genera un caso negativo con oráculo de rechazo
 * (400 + mensaje de validación + NO persistencia).
 */
const strictRejections: Array<{ label: string; overrides: PayloadOverrides; error: string }> = [
  {
    label: 'firstname vacío',
    overrides: { firstname: '' },
    error: 'Firstname should not be blank',
  },
  {
    label: 'lastname vacío',
    overrides: { lastname: '' },
    error: 'Lastname should not be blank',
  },
  {
    label: 'email mal formado',
    overrides: { email: 'no-es-un-email' },
    error: 'well-formed email',
  },
  {
    label: 'phone de 10 dígitos (mínimo 11)',
    overrides: { phone: '1234567890' },
    error: 'size must be between 11 and 21',
  },
  {
    label: 'roomid inválido (0)',
    overrides: { roomid: 0 },
    error: 'must be greater than or equal to 1',
  },
  {
    label: 'firstname null',
    overrides: { firstname: null },
    error: 'Firstname should not be blank',
  },
  {
    label: 'depositpaid null',
    overrides: { depositpaid: null },
    error: 'Failed to create booking',
  },
  {
    label: 'roomid null',
    overrides: { roomid: null },
    error: 'Failed to create booking',
  },
];

test.describe('API — matriz de validación (rechazos estrictos)', () => {
  for (const { label, overrides, error } of strictRejections) {
    test(`rechaza ${label} y no persiste`, async ({
      api,
      roomUnderTest,
      guest,
      freeWindow,
    }, testInfo) => {
      const roomId = roomUnderTest.roomid;
      const before = await api.booking.listByRoom(roomId);
      const knownIds = new Set(before.map((b) => b.bookingid));

      const payload = {
        ...guest,
        roomid: roomId,
        depositpaid: false,
        bookingdates: freeWindow,
        ...overrides,
      } as BookingRequest;
      const response = await api.booking.create(payload);

      const divergences = await checkRejectionContract(response, error);
      if (divergences.length > 0) {
        await testInfo.attach('divergencias-contrato', {
          body: JSON.stringify({ caso: label, divergences }, null, 2),
          contentType: 'application/json',
        });
      }
      expect(divergences, `el payload con ${label} debe ser rechazado`).toEqual([]);

      const after = await api.booking.listByRoom(roomId);
      const newEntries = after.filter((b) => !knownIds.has(b.bookingid));
      expect(newEntries, 'un payload inválido no debe persistir').toEqual([]);
    });
  }
});

/**
 * Reglas de negocio que el backend NO enforcea hoy (hallazgos BUG-06/07/08 en
 * docs/hallazgos.md). Corren como fallo esperado: cuando el backend las
 * implemente, estos tests avisarán ("unexpectedly passed").
 */
const businessRules: Array<{ label: string; bug: string; overrides: PayloadOverrides }> = [
  {
    label: 'check-in en el pasado',
    bug: 'BUG-06',
    overrides: { bookingdates: { checkin: '2020-01-01', checkout: '2020-01-03' } },
  },
  {
    label: 'phone no numérico',
    bug: 'BUG-07',
    overrides: { phone: 'abcdefghijk' },
  },
  {
    label: 'checkout anterior al checkin (esperado 400, observado 409 genérico)',
    bug: 'BUG-08',
    overrides: { bookingdates: { checkin: '2027-03-05', checkout: '2027-03-03' } },
  },
];

test.describe('API — reglas de negocio no enforced por el backend', () => {
  for (const { label, bug, overrides } of businessRules) {
    test(`${bug}: debería rechazar ${label}`, async ({
      api,
      roomUnderTest,
      guest,
      freeWindow,
    }, testInfo) => {
      test.fail();
      const payload = {
        ...guest,
        roomid: roomUnderTest.roomid,
        depositpaid: false,
        bookingdates: freeWindow,
        ...overrides,
      } as BookingRequest;
      const response = await api.booking.create(payload);
      await testInfo.attach('respuesta-observada', {
        body: JSON.stringify(
          { caso: label, status: response.status(), body: await response.text() },
          null,
          2,
        ),
        contentType: 'application/json',
      });
      expect(response.status(), `${bug}: ${label} debe rechazarse con 400`).toBe(400);
    });
  }

  /**
   * BUG-10: bookingdates null o ausente NUNCA recibe respuesta HTTP
   * (la conexión queda colgada hasta timeout/reset). El contrato exige 400.
   */
  for (const variant of [
    { label: 'bookingdates null', overrides: { bookingdates: null } },
    { label: 'bookingdates ausente', overrides: {} },
  ]) {
    test(`BUG-10: ${variant.label} debe responder 400`, async ({
      api,
      roomUnderTest,
      guest,
      freeWindow,
    }) => {
      test.fail();
      const base: Record<string, unknown> = {
        ...guest,
        roomid: roomUnderTest.roomid,
        depositpaid: false,
        bookingdates: freeWindow,
      };
      const payload = { ...base, ...variant.overrides };
      if (variant.label.endsWith('ausente')) {
        delete payload.bookingdates;
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
