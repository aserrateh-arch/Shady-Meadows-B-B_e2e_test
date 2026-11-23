import { buildGuest } from '../../src/data/guest.factory';
import { findFreeWindow } from '../../src/data/date.utils';
import { checkBookingIdentity } from '../../src/oracle/booking.oracle';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario integrado UI + API:
 * 1. Se agenda por UI (backend real: el POST /api/booking/ lo hace el front).
 * 2. Se verifica la confirmación en pantalla.
 * 3. Se consulta el MISMO registro por API y se valida su identidad.
 *
 * La fixture roomDetailWorkaround solo suplanta el endpoint de lectura
 * GET /api/room/{id}, roto en el entorno (BUG-01, docs/hallazgos.md), con los
 * datos reales del listado. El alta y la verificación son 100% backend real.
 */
test.describe('UI + API — reserva integrada de punta a punta', () => {
  test('reserva por UI, confirma en pantalla y verifica el registro por API', async ({
    api,
    bookingFlow,
    roomUnderTest,
    reservationPage,
    roomDetailWorkaround,
  }, testInfo) => {
    void roomDetailWorkaround;
    const roomId = roomUnderTest.roomid;
    const entries = await api.booking.listByRoom(roomId);
    const window = findFreeWindow(
      entries.map((e) => ({ start: e.bookingdates.checkin, end: e.bookingdates.checkout })),
    );
    const guest = buildGuest();

    await bookingFlow.bookRoom(roomUnderTest, guest, window);
    await reservationPage.expectConfirmation(window);

    // Verificación cruzada: el registro creado por UI debe existir y ser
    // íntegro según la API (oráculo de identidad).
    const bookings = await api.booking.listByRoom(roomId);
    const match = bookings.find(
      (b) =>
        b.bookingdates.checkin === window.checkin &&
        b.bookingdates.checkout === window.checkout &&
        b.firstname === guest.firstname &&
        b.lastname === guest.lastname,
    );
    if (!match) {
      await testInfo.attach('reservas-de-la-habitacion', {
        body: JSON.stringify(bookings, null, 2),
        contentType: 'application/json',
      });
    }
    expect(match, 'la reserva creada por UI debe ser consultable por API').toBeDefined();

    const divergences = checkBookingIdentity(match!, {
      ...guest,
      roomid: roomId,
      depositpaid: false, // la UI no ofrece pagar depósito: default del front
      bookingdates: window,
    });
    if (divergences.length > 0) {
      await testInfo.attach('divergencias-contrato', {
        body: JSON.stringify(divergences, null, 2),
        contentType: 'application/json',
      });
    }
    expect(
      divergences,
      'los datos persistidos por UI deben coincidir con lo ingresado en pantalla',
    ).toEqual([]);
  });
});
