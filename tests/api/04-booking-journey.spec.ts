import { test as pwTest } from '@playwright/test';
import type { BookingRequest } from '../../src/api/types';
import { findFreeWindow } from '../../src/data/date.utils';
import {
  checkBookingIdentity,
  checkCreateContract,
} from '../../src/oracle/booking.oracle';
import { attachDivergences } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario 27 (docs/escenarios.md): journey API completo de una reserva.
 * Encadena TODOS los endpoints del negocio en orden, con cada paso visible
 * en el reporte (test.step): autenticar → descubrir habitaciones → consultar
 * disponibilidad → crear → verificar persistencia e identidad.
 *
 * Es la versión explícita de lo que las fixtures hacen implícito en los
 * demás escenarios: aquí la cadena completa ES el sujeto de la prueba.
 */
test('journey API: auth → habitaciones → disponibilidad → crear → verificar', async ({
  api,
  roomUnderTest,
  guest,
  verifier,
}, testInfo) => {
  // 1. Autenticación: sin token válido no hay consultas protegidas.
  const token = await pwTest.step('1. Autenticar (POST /api/auth/login)', async () => {
    const token = await api.auth.login();
    expect(token, 'el login debe devolver un token').toBeTruthy();
    return token;
  });
  void token; // las fixtures ya operan con contexto autenticado

  // 2. Descubrimiento: las habitaciones reales del entorno.
  const rooms = await pwTest.step('2. Descubrir habitaciones (GET /api/room)', async () => {
    const rooms = await api.room.listRooms();
    expect(rooms.length, 'el entorno debe exponer habitaciones').toBeGreaterThan(0);
    return rooms;
  });
  expect(
    rooms.some((r) => r.roomid === roomUnderTest.roomid),
    'la habitación del test debe existir en el catálogo',
  ).toBe(true);

  // 3. Disponibilidad: ocupación real de la habitación elegida.
  const window = await pwTest.step('3. Consultar disponibilidad (GET /api/booking?roomid=N)', async () => {
    const occupied = (await verifier.snapshot(roomUnderTest.roomid)).map((e) => ({
      start: e.bookingdates.checkin,
      end: e.bookingdates.checkout,
    }));
    return findFreeWindow(occupied);
  });

  // 4. Alta de la reserva con contrato completo.
  const payload: BookingRequest = {
    ...guest,
    roomid: roomUnderTest.roomid,
    depositpaid: true,
    bookingdates: window,
  };
  const bookingId = await pwTest.step('4. Crear la reserva (POST /api/booking)', async () => {
    const response = await api.booking.create(payload);
    const divergences = await checkCreateContract(response);
    await attachDivergences(testInfo, divergences);
    expect(divergences, 'el alta debe cumplir el contrato').toEqual([]);
    return ((await response.json()) as { bookingid: number }).bookingid;
  });

  // 5. Verificación: el registro persistido es eco exacto de lo enviado.
  await pwTest.step('5. Verificar persistencia e identidad (GET /api/booking?roomid=N)', async () => {
    const persisted = (await verifier.snapshot(roomUnderTest.roomid)).find(
      (b) => b.bookingid === bookingId,
    );
    expect(persisted, `la reserva ${bookingId} debe quedar persistida`).toBeDefined();
    const divergences = checkBookingIdentity(persisted!, payload);
    await attachDivergences(testInfo, divergences);
    expect(divergences, 'los datos persistidos deben ser idénticos a los enviados').toEqual([]);
  });
});
