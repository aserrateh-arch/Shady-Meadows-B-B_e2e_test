import type { BookingRequest } from '../../src/api/types';
import { checkFullBookingContract } from '../../src/oracle/booking.oracle';
import { CREATE_BOOKING_RESPONSE_DOCUMENTED } from '../../src/oracle/contracts';
import { checkSchema } from '../../src/oracle/schema.checker';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Bugs conocidos del entorno (detalle y evidencia en docs/hallazgos.md).
 * Se ejecutan con test.fail(): fallan HOY porque el sistema no cumple el
 * contrato documentado, y avisarán ("unexpectedly passed") cuando el
 * entorno se repare — entonces se mueven a la suite estable.
 */
test.describe('Bugs conocidos del entorno (contrato documentado)', { tag: '@known-bug' }, () => {
  test('BUG-01: GET /api/room/{id} debe responder 200 con la habitación', async ({
    api,
    roomUnderTest,
  }) => {
    const response = await api.room.getById(roomUnderTest.roomid);
    expect(response.status()).toBe(200);
    const room = (await response.json()) as { roomid: number };
    expect(room.roomid).toBe(roomUnderTest.roomid);
  });

  test('BUG-01 (impacto UI): la página de reserva renderiza sin workarounds', async ({
    reservationPage,
    roomUnderTest,
  }) => {
    await reservationPage.gotoWithDates(roomUnderTest.roomid, {
      checkin: '2027-01-10',
      checkout: '2027-01-12',
    });
    await expect(
      reservationPage.reserveNowButton,
      'BUG-01: la página de reserva debe renderizar el formulario (hoy GET /api/room/{id} → 500 la rompe)',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('BUG-02: GET /api/booking/{id} debe responder 200 con la reserva', async ({
    api,
    roomUnderTest,
    guest,
    freeWindow,
  }) => {
    const payload: BookingRequest = {
      ...guest,
      roomid: roomUnderTest.roomid,
      depositpaid: false,
      bookingdates: freeWindow,
    };
    const createResponse = await api.booking.create(payload);
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { bookingid: number };

    const getResponse = await api.booking.getById(created.bookingid);
    expect(getResponse.status()).toBe(200);

    const details = (await getResponse.json()) as Record<string, unknown>;
    expect(checkFullBookingContract(details, payload)).toEqual([]);
  });

  test('BUG-03: el alta debe devolver email y phone del huésped (contrato documentado)', async ({
    api,
    roomUnderTest,
    guest,
    freeWindow,
  }, testInfo) => {
    const payload: BookingRequest = {
      ...guest,
      roomid: roomUnderTest.roomid,
      depositpaid: true,
      bookingdates: freeWindow,
    };
    const createResponse = await api.booking.create(payload);
    expect(createResponse.status()).toBe(201);
    const body = (await createResponse.json()) as Record<string, unknown>;

    // Contrato documentado completo: esquema exhaustivo (requeridos, tipos,
    // formatos, nulabilidad, sin campos inesperados).
    const schemaDivergences = checkSchema(body, CREATE_BOOKING_RESPONSE_DOCUMENTED);
    if (schemaDivergences.length > 0) {
      await testInfo.attach('divergencias-esquema', {
        body: JSON.stringify(schemaDivergences, null, 2),
        contentType: 'application/json',
      });
    }
    expect(
      schemaDivergences,
      'el alta debe devolver el esquema documentado completo (incluye email y phone)',
    ).toEqual([]);
  });
});
