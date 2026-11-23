import type { GuestData, Room } from '../api/types';
import type { DateWindow } from '../data/date.utils';
import { HomePage } from '../pages/home.page';
import { ReservationPage } from '../pages/reservation.page';

/**
 * Flow de negocio: reserva de habitación de punta a punta por UI.
 * Orquesta Page Objects; los tests consumen el flow y nunca locators.
 */
export class BookingFlow {
  constructor(
    private readonly homePage: HomePage,
    private readonly reservationPage: ReservationPage,
  ) {}

  async bookRoom(room: Room, guest: GuestData, window: DateWindow): Promise<void> {
    await this.homePage.goto();
    await this.homePage.openReservation(room);
    // El deep-link del home trae "hoy/mañana"; se sustituye por la ventana
    // libre calculada para no depender de la ocupación del día.
    await this.reservationPage.setDates(room.roomid, window);
    await this.reservationPage.openGuestForm();
    await this.reservationPage.fillGuestForm(guest);
    await this.reservationPage.submit();
  }
}
