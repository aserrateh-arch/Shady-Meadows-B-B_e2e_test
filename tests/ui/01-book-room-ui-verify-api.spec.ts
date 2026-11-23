import { checkBookingIdentity } from '../../src/oracle/booking.oracle';
import { attachDivergences, attachScreenshot } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario 17 (docs/escenarios.md): integración UI + API.
 * 1. Se agenda por UI (backend real: el POST /api/booking lo hace el front).
 * 2. Se verifica la confirmación en pantalla.
 * 3. Se consulta el MISMO registro por API y se valida su identidad.
 *
 * La fixture roomDetailWorkaround solo suplanta la lectura GET /api/room/{id}
 * (BUG-01) con datos reales del listado; alta y verificación son 100% reales.
 */
test('reservar por UI, confirmar en pantalla y verificar el registro por API', async ({
  bookingFlow,
  reservationPage,
  roomUnderTest,
  roomDetailWorkaround,
  guest,
  freeWindow,
  verifier,
  page,
}, testInfo) => {
  void roomDetailWorkaround;

  await bookingFlow.bookRoom(roomUnderTest, guest, freeWindow, testInfo);
  await reservationPage.expectConfirmation(freeWindow);
  await attachScreenshot(testInfo, page, 'paso-2-confirmacion-ui');

  const match = await verifier.findByIdentity(roomUnderTest.roomid, guest, freeWindow);
  if (!match) {
    await testInfo.attach('reservas-de-la-habitacion', {
      body: JSON.stringify(await verifier.snapshot(roomUnderTest.roomid), null, 2),
      contentType: 'application/json',
    });
  }
  expect(match, 'la reserva creada por UI debe ser consultable por API').toBeDefined();

  const divergences = checkBookingIdentity(match!, {
    ...guest,
    roomid: roomUnderTest.roomid,
    depositpaid: false, // la UI no ofrece pagar depósito: default del front
    bookingdates: freeWindow,
  });
  await attachDivergences(testInfo, divergences);
  expect(divergences, 'los datos persistidos por UI deben coincidir con lo ingresado').toEqual([]);
});
