import { test as base } from '@playwright/test';
import { AuthClient } from '../api/auth.client';
import { BookingClient } from '../api/booking.client';
import { ReportClient } from '../api/report.client';
import { RoomClient } from '../api/room.client';
import type { Room } from '../api/types';
import { BookingFlow } from '../flows/booking.flow';
import { HomePage } from '../pages/home.page';
import { ReservationPage } from '../pages/reservation.page';

export interface ApiClients {
  /** Contexto autenticado (Cookie: token=...): alta y consulta de reservas. */
  booking: BookingClient;
  room: RoomClient;
  report: ReportClient;
}

interface WorkerFixtures {
  /**
   * Habitación asignada por worker (round-robin) para minimizar colisiones
   * de fechas entre tests que corren en paralelo sobre la demo compartida.
   */
  roomUnderTest: Room;
}

interface TestFixtures {
  api: ApiClients;
  homePage: HomePage;
  reservationPage: ReservationPage;
  bookingFlow: BookingFlow;
  /**
   * Workaround documentado (ver docs/hallazgos.md, BUG-01): el endpoint
   * GET /api/room/{id} del entorno responde 500 y la página de reserva no
   * renderiza. Esta fixture intercepta SOLO ese endpoint y lo sirve con los
   * datos reales de GET /api/room/ (listado). El alta de la reserva y toda
   * verificación posterior siguen contra el backend real.
   */
  roomDetailWorkaround: void;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  roomUnderTest: [
    async ({ playwright }, use, workerInfo) => {
      const context = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL as string,
      });
      const rooms = await new RoomClient(context).listRooms();
      await context.dispose();
      if (rooms.length === 0) {
        throw new Error('El entorno no devolvió habitaciones (¿demo reiniciada?)');
      }
      await use(rooms[workerInfo.workerIndex % rooms.length]);
    },
    { scope: 'worker' },
  ],

  api: async ({ playwright }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string;
    const publicContext = await playwright.request.newContext({ baseURL });
    const token = await new AuthClient(publicContext).login();
    const authedContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `token=${token}` },
    });
    await use({
      booking: new BookingClient(authedContext),
      room: new RoomClient(publicContext),
      report: new ReportClient(authedContext),
    });
    await publicContext.dispose();
    await authedContext.dispose();
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  reservationPage: async ({ page }, use) => {
    await use(new ReservationPage(page));
  },

  bookingFlow: async ({ homePage, reservationPage }, use) => {
    await use(new BookingFlow(homePage, reservationPage));
  },

  roomDetailWorkaround: [
    async ({ page, api, roomUnderTest }, use) => {
      const rooms = await api.room.listRooms();
      const room = rooms.find((r) => r.roomid === roomUnderTest.roomid);
      await page.route(
        new RegExp(`/api/room/${roomUnderTest.roomid}$`),
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(room),
          }),
      );
      await use();
    },
    { auto: false },
  ],
});

export { expect } from '@playwright/test';
