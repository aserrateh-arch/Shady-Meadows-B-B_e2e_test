import { test as pwTest, type TestInfo } from '@playwright/test';
import type { GuestData, Room } from '../api/types';
import type { DateWindow } from '../data/date.utils';
import { HomePage } from '../pages/home.page';
import { ReservationPage } from '../pages/reservation.page';

/**
 * Flow de negocio: reserva de habitación de punta a punta por UI.
 * Orquesta Page Objects; los tests consumen el flow y nunca locators.
 *
 * Con `testInfo` registra cada paso con nombre (`test.step`) y adjunta fotos
 * del estado de la pantalla — la evidencia visual queda en el reporte HTML.
 */
export class BookingFlow {
  constructor(
    private readonly homePage: HomePage,
    private readonly reservationPage: ReservationPage,
  ) {}

  async bookRoom(
    room: Room,
    guest: GuestData,
    window: DateWindow,
    testInfo?: TestInfo,
  ): Promise<void> {
    await pwTest.step('Home: abrir la habitación y fijar fechas libres', async () => {
      await this.homePage.goto();
      await this.homePage.openReservation(room);
      // El deep-link del home trae "hoy/mañana"; se sustituye por la ventana
      // libre calculada para no depender de la ocupación del día.
      await this.reservationPage.setDates(room.roomid, window);
    });

    await pwTest.step('Reserva: abrir formulario y diligenciar huésped', async () => {
      await this.reservationPage.openGuestForm();
      await this.reservationPage.fillGuestForm(guest);
      if (testInfo) {
        await testInfo.attach('paso-1-formulario-diligenciado', {
          body: await this.reservationPage.takeScreenshot(),
          contentType: 'image/png',
        });
      }
    });

    await pwTest.step('Reserva: enviar al backend', async () => {
      await this.reservationPage.submit();
    });
  }
}
