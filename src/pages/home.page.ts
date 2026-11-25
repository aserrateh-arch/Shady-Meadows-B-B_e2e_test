import { type Locator, type Page } from '@playwright/test';
import type { Room } from '../api/types';

/**
 * Página principal: listado de habitaciones del B&B.
 * POM estricto: solo locators y acciones. Las aserciones de negocio viven
 * en los specs; la sincronización la provee el auto-waiting de Playwright
 * (click/fill esperan actionability por defecto).
 */
export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  roomCard(room: Room): Locator {
    return this.page
      .locator('.room-card')
      .filter({ has: this.page.locator(`a[href^="/reservation/${room.roomid}?"]`) });
  }

  async openReservation(room: Room): Promise<void> {
    await this.roomCard(room).getByRole('link', { name: 'Book now' }).click();
  }
}
