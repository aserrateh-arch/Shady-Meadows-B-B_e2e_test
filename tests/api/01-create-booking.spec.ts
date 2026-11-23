import type { BookingRequest } from '../../src/api/types';
import { attachDivergences } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenarios 01-02 (docs/escenarios.md): API exitosa parametrizada.
 * Crear una reserva y consultarla: status, headers, esquema, identidad
 * (huésped, habitación, fechas) y persistencia.
 *
 * Nota de contrato: la consulta documentada GET /api/booking/{id} responde 500
 * (BUG-02); la identidad se verifica con el listado por habitación.
 */
const dataSets = [
  { label: 'depósito pagado', depositpaid: true },
  { label: 'sin depósito', depositpaid: false },
];

for (const { label, depositpaid } of dataSets) {
  test(`crear y consultar reserva — ${label}`, async ({
    roomUnderTest,
    guest,
    freeWindow,
    bookingApiFlow,
  }, testInfo) => {
    const payload: BookingRequest = {
      ...guest,
      roomid: roomUnderTest.roomid,
      depositpaid,
      bookingdates: freeWindow,
    };

    const divergences = await bookingApiFlow.createAndVerifyIdentity(payload);

    await attachDivergences(testInfo, divergences);
    expect(divergences, 'el alta y la consulta deben cumplir el contrato').toEqual([]);
  });
}
