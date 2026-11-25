import { type Locator, type Page } from '@playwright/test';
import type { GuestData } from '../api/types';
import type { DateWindow } from '../data/date.utils';

/**
 * Página de reserva (/reservation/{roomId}): calendario de disponibilidad
 * (react-big-calendar) + formulario del huésped en dos pasos:
 *   1. fechas (preseleccionadas vía query params checkin/checkout)
 *   2. "Reserve Now" → formulario → "Reserve Now" → "Booking Confirmed"
 *
 * POM estricto: solo locators y acciones (sin aserciones de negocio — esas
 * viven en los specs). La sincronización se hace con waitFor (operativo),
 * nunca con esperas fijas.
 *
 * Locators por pirámide de prioridad: rol+nombre accesible primero (los
 * inputs tienen aria-label en el front), getByText para mensajes, y clases
 * CSS semánticas solo donde el componente no ofrece hook mejor
 * (react-big-calendar: .rbc-*, alertas Bootstrap: .alert-danger).
 * Deuda de testabilidad documentada: pedir data-testid al equipo de front.
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
  /** Página de error global de Next.js ("This page couldn't load"). */
  readonly crashIndicator: Locator;

  constructor(private readonly page: Page) {
    this.firstnameInput = page.getByRole('textbox', { name: 'Firstname' });
    this.lastnameInput = page.getByRole('textbox', { name: 'Lastname' });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.phoneInput = page.getByRole('textbox', { name: 'Phone' });
    this.reserveNowButton = page.getByRole('button', { name: 'Reserve Now' });
    this.confirmationHeading = page.getByRole('heading', { name: 'Booking Confirmed' });
    this.confirmationDates = page.locator('.booking-card p strong');
    this.errorAlert = page.locator('.alert-danger');
    this.crashIndicator = page.getByText("This page couldn't load");
  }

  /** Foto del estado actual de la página (para evidencia por pasos). */
  async takeScreenshot(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: true });
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
    // Sincronización operativa (no aserción): el formulario debe estar montado
    // antes de diligenciarlo.
    await this.firstnameInput.waitFor({ state: 'visible' });
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
}
