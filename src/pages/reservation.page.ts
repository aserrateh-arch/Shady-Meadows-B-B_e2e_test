import { expect, type Locator, type Page } from '@playwright/test';
import type { GuestData } from '../api/types';
import type { DateWindow } from '../data/date.utils';

/**
 * Página de reserva (/reservation/{roomId}): calendario de disponibilidad
 * (react-big-calendar) + formulario del huésped en dos pasos:
 *   1. fechas (preseleccionadas vía query params checkin/checkout)
 *   2. "Reserve Now" → formulario → "Reserve Now" → "Booking Confirmed"
 *
 * Los locators se derivan del front real (repo restful-booker-platform,
 * assets/src/components/reservation/BookingForm.tsx).
 */
export class ReservationPage {
  readonly firstnameInput: Locator;
  readonly lastnameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly reserveNowButton: Locator;
  readonly confirmationHeading: Locator;
  readonly confirmationDates: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.firstnameInput = page.locator('input[name="firstname"]');
    this.lastnameInput = page.locator('input[name="lastname"]');
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.reserveNowButton = page.getByRole('button', { name: 'Reserve Now' });
    this.confirmationHeading = page.getByRole('heading', { name: 'Booking Confirmed' });
    this.confirmationDates = page.locator('.booking-card p strong');
    this.errorAlert = page.locator('.alert-danger');
  }

  /** Eventos (ocupados o seleccionados) visibles en el calendario. */
  calendarEvents(): Locator {
    return this.page.locator('.rbc-event');
  }

  /**
   * Navega a la reserva con la ventana preseleccionada por query params,
   * el mismo deep-link que genera el botón "Book now" del home.
   */
  async gotoWithDates(roomId: number, window: DateWindow): Promise<void> {
    await this.page.goto(
      `/reservation/${roomId}?checkin=${window.checkin}&checkout=${window.checkout}`,
    );
  }

  /** Reemplaza las fechas del deep-link por la ventana libre calculada. */
  async setDates(roomId: number, window: DateWindow): Promise<void> {
    await this.gotoWithDates(roomId, window);
  }

  /** Paso 1 → 2: confirma la selección de fechas y abre el formulario. */
  async openGuestForm(): Promise<void> {
    await this.reserveNowButton.click();
    await expect(this.firstnameInput).toBeVisible();
  }

  async fillGuestForm(guest: GuestData): Promise<void> {
    await this.firstnameInput.fill(guest.firstname);
    await this.lastnameInput.fill(guest.lastname);
    await this.emailInput.fill(guest.email);
    await this.phoneInput.fill(guest.phone);
  }

  /** Paso 2: envía la reserva al backend. */
  async submit(): Promise<void> {
    await this.reserveNowButton.click();
  }

  async expectConfirmation(window: DateWindow): Promise<void> {
    await expect(this.confirmationHeading).toBeVisible();
    await expect(this.confirmationDates).toContainText(window.checkin);
    await expect(this.confirmationDates).toContainText(window.checkout);
  }
}
