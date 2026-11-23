import type { BookingRequest } from '../../src/api/types';
import { findFreeWindow } from '../../src/data/date.utils';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario 18 (docs/escenarios.md): API → UI.
 * Se agenda por API y se verifica que el front refleja la ocupación en el
 * calendario de la habitación.
 *
 * BLOQUEADO por BUG-01 y BUG-04 del entorno (docs/hallazgos.md):
 * - GET /api/room/{id} → 500: la página de reserva no renderiza.
 * - GET /api/report/room/{id} → 500: el calendario nunca recibe la ocupación.
 * Fallo esperado: avisará ("unexpectedly passed") cuando el entorno se repare.
 */
test('una reserva creada por API aparece como ocupada en el calendario', {
  tag: '@known-bug',
}, async ({
  api,
  reservationPage,
  roomUnderTest,
  guest,
  freeWindow,
  verifier,
}) => {
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
  await expect
    .poll(() => reservationPage.calendarEvents().count(), {
      message: 'el calendario debe reflejar la reserva creada por API',
    })
    .toBeGreaterThan(eventsBefore);
});
