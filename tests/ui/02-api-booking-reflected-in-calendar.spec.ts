import type { BookingRequest } from '../../src/api/types';
import { findFreeWindow } from '../../src/data/date.utils';
import { attachScreenshot } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario 18 (docs/escenarios.md): API → UI.
 * Se agenda por API y se verifica que el front refleja la ocupación en el
 * calendario de la habitación.
 *
 * BLOQUEADO por BUG-04 del entorno (docs/hallazgos.md):
 * GET /api/report/room/{id} → 500, así que el calendario nunca recibe la
 * ocupación. La lectura de habitación (BUG-01) se suplanta con el workaround
 * documentado para AISLAR la aserción en el calendario — sin él, la página
 * ni siquiera renderiza y el test no podría distinguir los dos bugs.
 * Suite @known-bug: quedará verde cuando el entorno se repare.
 */
test('una reserva creada por API aparece como ocupada en el calendario', {
  tag: '@known-bug',
}, async ({
  api,
  reservationPage,
  roomUnderTest,
  roomDetailWorkaround,
  guest,
  freeWindow,
  verifier,
  page,
}, testInfo) => {
  void roomDetailWorkaround;
  const roomId = roomUnderTest.roomid;

  // Ventana de visualización distinta a la reservada, para distinguir el
  // evento "Selected" de los eventos de ocupación.
  const viewWindow = findFreeWindow(
    [
      ...(await verifier.snapshot(roomId)).map((e) => ({
        start: e.bookingdates.checkin,
        end: e.bookingdates.checkout,
      })),
      { start: freeWindow.checkin, end: freeWindow.checkout },
    ],
    2,
    60,
  );

  await reservationPage.gotoWithDates(roomId, viewWindow);
  const eventsBefore = await reservationPage.calendarEvents().count();

  const payload: BookingRequest = {
    ...guest,
    roomid: roomId,
    depositpaid: false,
    bookingdates: freeWindow,
  };
  const createResponse = await api.booking.create(payload);
  expect(createResponse.status(), 'el alta por API debe ser 201').toBe(201);

  await reservationPage.gotoWithDates(roomId, viewWindow);
  // La foto evidencia el estado real: calendario renderizado pero SIN la
  // ocupación creada por API (BUG-04).
  await attachScreenshot(testInfo, page, 'BUG-04-calendario-sin-ocupacion-api');
  await expect
    .poll(() => reservationPage.calendarEvents().count(), {
      message: 'BUG-04: el calendario debe reflejar la reserva creada por API',
      timeout: 8_000,
    })
    .toBeGreaterThan(eventsBefore);
});
