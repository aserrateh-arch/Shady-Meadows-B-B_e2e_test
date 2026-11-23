/** Sonda del home: descubre cómo se navega a la reserva en la UI real. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://automationintesting.online/');
try {
  await page.getByRole('button', { name: /let me hack/i }).click({ timeout: 5000 });
} catch {}
await page.waitForLoadState('networkidle');

console.log('URL:', page.url());
console.log('--- botones ---');
console.log(await page.getByRole('button').evaluateAll((els) => els.map((e) => e.textContent?.trim())));
console.log('--- links ---');
console.log(await page.getByRole('link').evaluateAll((els) => els.map((e) => `${e.textContent?.trim()} -> ${e.getAttribute('href')}`)));
console.log('--- headings ---');
console.log(await page.getByRole('heading').evaluateAll((els) => els.map((e) => e.textContent?.trim())));
const roomHtml = await page.locator('.hotel-room-info').first().innerHTML().catch(() => '<no .hotel-room-info>');
console.log('--- primera room card (trunc) ---');
console.log(roomHtml.slice(0, 800));
await browser.close();
