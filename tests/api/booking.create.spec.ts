import type { TestInfo } from '@playwright/test';
import type { BookingRequest } from '../../src/api/types';
import {
  checkBookingIdentity,
  checkCreateContract,
  type Divergence,
} from '../../src/oracle/booking.oracle';
import { expect, test } from '../../src/fixtures/test.fixtures';

async function attachDivergences(testInfo: TestInfo, divergences: Divergence[]): Promise<void> {
  if (divergences.length > 0) {
    await testInfo.attach('divergencias-contrato', {
      body: JSON.stringify(divergences, null, 2),
      contentType: 'application/json',
    });
  }
}

/**
 * Escenario API exitoso, parametrizado con dos conjuntos de datos:
 * depósito pagado y no pagado.
 *
 * Nota de contrato: la consulta documentada es GET /api/booking/{id}, pero ese
 * endpoint responde 500 en el entorno actual (BUG-02, ver docs/hallazgos.md y
 * tests/bugs/known-bugs.spec.ts). La identidad se verifica con el listado por
 * habitación GET /api/booking?roomid=N, que sí está operativo.
 */
const dataSets = [
  { label: 'depósito pagado', depositpaid: true },
  { label: 'sin depósito', depositpaid: false },
];

for (const { label, depositpaid } of dataSets) {
  test.describe(`API — crear y consultar reserva (${label})`, () => {
    test('crea una reserva y la consulta validando contrato e identidad', async ({
      api,
      roomUnderTest,
      guest,
      freeWindow,
    }, testInfo) => {
      const roomId = roomUnderTest.roomid;
      const payload: BookingRequest = {
        ...guest,
        roomid: roomId,
        depositpaid,
        bookingdates: freeWindow,
      };

      const createResponse = await api.booking.create(payload);
      const createDivergences = await checkCreateContract(createResponse);
      await attachDivergences(testInfo, createDivergences);
      expect(createDivergences, 'el alta debe cumplir el contrato documentado').toEqual([]);

      const created = (await createResponse.json()) as { bookingid: number };

      const bookings = await api.booking.listByRoom(roomId);
      const persisted = bookings.find((b) => b.bookingid === created.bookingid);
      expect(
        persisted,
        `la reserva ${created.bookingid} debe existir en la habitación ${roomId}`,
      ).toBeDefined();

      const dataDivergences = checkBookingIdentity(persisted!, payload);
      await attachDivergences(testInfo, dataDivergences);
      expect(
        dataDivergences,
        'los datos consultados deben ser idénticos a los enviados',
      ).toEqual([]);
    });
  });
}
