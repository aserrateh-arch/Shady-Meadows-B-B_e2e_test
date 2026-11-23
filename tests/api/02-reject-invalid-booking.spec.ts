import type { BookingRequest } from '../../src/api/types';
import { attachDivergences } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario 03 (docs/escenarios.md): API negativa.
 * Enviar un dato obligatorio ausente: se valida el rechazo (400, headers,
 * esquema de error, mensaje) y que la reserva NO queda persistida.
 */
test('rechazar reserva sin firstname y no persistirla', async ({
  roomUnderTest,
  guest,
  freeWindow,
  bookingApiFlow,
}, testInfo) => {
  const { firstname: _omitted, ...withoutFirstname } = {
    ...guest,
    roomid: roomUnderTest.roomid,
    depositpaid: true,
    bookingdates: freeWindow,
  } satisfies BookingRequest;

  const divergences = await bookingApiFlow.createExpectingRejection(
    withoutFirstname as BookingRequest,
    'Firstname should not be blank',
  );

  await attachDivergences(testInfo, divergences);
  expect(divergences, 'el rechazo debe cumplir el contrato y no persistir').toEqual([]);
});
