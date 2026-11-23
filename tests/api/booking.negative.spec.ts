import type { BookingRequest } from '../../src/api/types';
import { buildGuest } from '../../src/data/guest.factory';
import { findFreeWindow } from '../../src/data/date.utils';
import { checkRejectionContract } from '../../src/oracle/booking.oracle';
import { expect, test } from '../../src/fixtures/test.fixtures';

test.describe('API — reserva inválida (dato obligatorio ausente)', () => {
  test('rechaza la reserva sin firstname y no persiste ningún registro', async ({
    api,
    roomUnderTest,
  }, testInfo) => {
    const roomId = roomUnderTest.roomid;
    const before = await api.booking.listByRoom(roomId);
    const knownIds = new Set(before.map((b) => b.bookingid));

    const window = findFreeWindow(
      before.map((b) => ({ start: b.bookingdates.checkin, end: b.bookingdates.checkout })),
    );
    const { firstname: _omitted, ...withoutFirstname } = {
      ...buildGuest(),
      roomid: roomId,
      depositpaid: true,
      bookingdates: window,
    } satisfies BookingRequest;

    const response = await api.booking.create(withoutFirstname);

    const divergences = await checkRejectionContract(response, 'Firstname should not be blank');
    if (divergences.length > 0) {
      await testInfo.attach('divergencias-contrato', {
        body: JSON.stringify(divergences, null, 2),
        contentType: 'application/json',
      });
    }
    expect(divergences, 'el rechazo debe cumplir el contrato documentado').toEqual([]);

    // Oracle de no-persistencia: ninguna reserva nueva debe aparecer en la habitación.
    const after = await api.booking.listByRoom(roomId);
    const newEntries = after.filter((b) => !knownIds.has(b.bookingid));
    expect(newEntries, 'una reserva rechazada no debe quedar persistida').toEqual([]);
  });
});
