import type { BookingRequest } from '../../src/api/types';
import { buildGuest } from '../../src/data/guest.factory';
import { findFreeWindow } from '../../src/data/date.utils';
import { checkFullBookingContract } from '../../src/oracle/booking.oracle';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Bugs conocidos del entorno (detalle y evidencia en docs/hallazgos.md).
 * Se ejecutan con test.fail(): fallan HOY porque el sistema no cumple el
 * contrato documentado, y avisarán ("unexpectedly passed") cuando el
 * entorno se repare — entonces se mueven a la suite estable.
 */
test.describe('Bugs conocidos del entorno (contrato documentado)', () => {
  test('BUG-01: GET /api/room/{id} debe responder 200 con la habitación', async ({
    api,
    roomUnderTest,
  }) => {
    test.fail();
    const response = await api.room.getById(roomUnderTest.roomid);
    expect(response.status()).toBe(200);
    const room = (await response.json()) as { roomid: number };
    expect(room.roomid).toBe(roomUnderTest.roomid);
  });

  test('BUG-01 (impacto UI): la página de reserva renderiza sin workarounds', async ({
    reservationPage,
    roomUnderTest,
  }) => {
    test.fail();
    await reservationPage.gotoWithDates(roomUnderTest.roomid, {
      checkin: '2027-01-10',
      checkout: '2027-01-12',
    });
    await expect(reservationPage.reserveNowButton).toBeVisible({ timeout: 15_000 });
  });

  test('BUG-02: GET /api/booking/{id} debe responder 200 con la reserva', async ({
    api,
    roomUnderTest,
  }) => {
    test.fail();
    const entries = await api.booking.listByRoom(roomUnderTest.roomid);
    const window = findFreeWindow(
      entries.map((e) => ({ start: e.bookingdates.checkin, end: e.bookingdates.checkout })),
    );
    const payload: BookingRequest = {
      ...buildGuest(),
      roomid: roomUnderTest.roomid,
      depositpaid: false,
      bookingdates: window,
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
  }) => {
    test.fail();
    const entries = await api.booking.listByRoom(roomUnderTest.roomid);
    const window = findFreeWindow(
      entries.map((e) => ({ start: e.bookingdates.checkin, end: e.bookingdates.checkout })),
    );
    const payload: BookingRequest = {
      ...buildGuest(),
      roomid: roomUnderTest.roomid,
      depositpaid: true,
      bookingdates: window,
    };
    const createResponse = await api.booking.create(payload);
    expect(createResponse.status()).toBe(201);
    const body = (await createResponse.json()) as Record<string, unknown>;
    expect(body.email, 'la respuesta del alta debe incluir email').toBe(payload.email);
    expect(body.phone, 'la respuesta del alta debe incluir phone').toBe(payload.phone);
  });
});
