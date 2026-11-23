/** Sonda profunda de /reservation/1: errores JS + HTML renderizado. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()); });

await page.goto('https://automationintesting.online/reservation/1?checkin=2026-11-23&checkout=2026-11-24');
await page.waitForTimeout(6000);

const html = await page.locator('#root').innerHTML().catch(() => page.locator('body').innerHTML());
console.log('--- HTML renderizado (trunc 3000) ---');
console.log(html.slice(0, 3000));
await browser.close();
