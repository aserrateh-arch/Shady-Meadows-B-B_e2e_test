import type { Page, TestInfo } from '@playwright/test';
import type { Divergence } from './booking.oracle';

/** Adjunta divergencias de contrato al reporte de Playwright como evidencia. */
export async function attachDivergences(
  testInfo: TestInfo,
  divergences: Divergence[],
  name = 'divergencias-contrato',
  extra?: Record<string, unknown>,
): Promise<void> {
  if (divergences.length === 0) return;
  await testInfo.attach(name, {
    body: JSON.stringify({ ...extra, divergences }, null, 2),
    contentType: 'application/json',
  });
}

/** Adjunta una foto del estado actual de la página (evidencia visual por paso). */
export async function attachScreenshot(
  testInfo: TestInfo,
  page: Page,
  name: string,
): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}
