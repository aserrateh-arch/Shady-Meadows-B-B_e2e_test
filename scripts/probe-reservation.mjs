/** Sonda de la página de reserva del nuevo demo (.online). */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('https://automationintesting.online/');
await page.waitForLoadState('networkidle');

const resLinks = page.locator('a[href^="/reservation/"]');
console.log('links /reservation/:', await resLinks.count());
const card = await resLinks.first().evaluate((el) => {
  let node = el;
  for (let i = 0; i < 5 && node.parentElement; i++) node = node.parentElement;
  return node.outerHTML;
});
console.log('--- room card ---');
console.log(card.slice(0, 1500));

await resLinks.first().click();
await page.waitForLoadState('networkidle');
console.log('URL reserva:', page.url());

console.log('toolbar label:', JSON.stringify(await page.locator('.rbc-toolbar-label').textContent().catch(() => null)));
console.log('toolbar buttons:', await page.locator('.rbc-toolbar button').allTextContents());
console.log('date-cells visibles:', await page.locator('.rbc-date-cell:not(.rbc-off-range)').count());
console.log('rbc-events:', await page.locator('.rbc-event').count());
console.log('rbc-event sample:', (await page.locator('.rbc-event').first().innerHTML().catch(() => '<none>'))?.slice(0, 300));

console.log('--- inputs visibles ---');
console.log(await page.locator('input:visible').evaluateAll((els) =>
  els.map((e) => ({ name: e.getAttribute('name'), id: e.id, ph: e.getAttribute('placeholder'), type: e.type })),
));
console.log('--- botones ---');
console.log(await page.getByRole('button').evaluateAll((els) => els.map((e) => e.textContent?.trim()).filter(Boolean)));
console.log('--- headings ---');
console.log(await page.getByRole('heading').evaluateAll((els) => els.map((e) => e.textContent?.trim())));

await browser.close();
