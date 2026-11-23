import { test as pwTest, type TestInfo } from '@playwright/test';
import type { GuestData, Room } from '../api/types';
import type { DateWindow } from '../data/date.utils';
import { HomePage } from '../pages/home.page';
import { ReservationPage } from '../pages/reservation.page';

export interface BookRoomOptions {
  /** Si se pasa, registra pasos con nombre y fotos en el reporte. */
  testInfo?: TestInfo;
  /**
   * Resiliencia a contención de la demo compartida: si el alta choca con un
   * 409 ("Failed to create booking"), se invoca para obtener una ventana
   * fresca y se reintenta el flujo completo una vez.
   */
  onConflictRetry?: () => Promise<DateWindow>;
}

/**
 * Flow de negocio: reserva de habitación de punta a punta por UI.
 * Orquesta Page Objects; los tests consumen el flow y nunca locators.
 * Devuelve la ventana efectivamente reservada (puede cambiar si hubo
 * reintento por conflicto).
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
    options: BookRoomOptions = {},
  ): Promise<DateWindow> {
    let current = window;
    const maxAttempts = options.onConflictRetry ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.executeBooking(room, guest, current, options.testInfo);
      if (!options.onConflictRetry || attempt === maxAttempts - 1) {
        return current;
      }
      if ((await this.detectOutcome()) === 'confirmed') {
        return current;
      }
      // Conflicto 409 (alerta) o crash del front (BUG-09: el 409 rompe el
      // render): en ambos casos la causa es contención de la demo compartida
      // — se reintenta con ventana fresca (ruido de entorno, no bug).
      current = await options.onConflictRetry();
    }
    return current;
  }

  private async executeBooking(
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

  /** Detecta el resultado del envío: confirmación, conflicto/crash u otro. */
  private async detectOutcome(): Promise<'confirmed' | 'conflict' | 'other'> {
    const conflictAlert = this.reservationPage.errorAlert.filter({
      hasText: 'Failed to create booking',
    });
    const outcome = await Promise.race([
      this.reservationPage.confirmationHeading
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'confirmed' as const),
      conflictAlert
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'conflict' as const),
      // BUG-09: ante un 409 el front revienta en vez de mostrar la alerta.
      this.reservationPage.crashIndicator
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'conflict' as const),
    ]).catch(() => 'other' as const);
    return outcome;
  }
}
