import { expect, type Locator, type Page } from '@playwright/test';
import type { Room } from '../api/types';

/** Página principal: listado de habitaciones del B&B. */
export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(
      this.page.getByRole('heading', { name: 'Our Rooms' }),
    ).toBeVisible();
  }

  roomCard(room: Room): Locator {
    return this.page
      .locator('.room-card')
      .filter({ has: this.page.locator(`a[href^="/reservation/${room.roomid}?"]`) });
  }

  async openReservation(room: Room): Promise<void> {
    await this.roomCard(room).getByRole('link', { name: 'Book now' }).click();
    await expect(this.page).toHaveURL(new RegExp(`/reservation/${room.roomid}`));
  }
}
