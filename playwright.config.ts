import { defineConfig } from '@playwright/test';

/**
 * Entorno bajo prueba: Restful Booker Platform (demo pública compartida).
 * - UI:  https://automationintesting.online
 * - API: https://automationintesting.online/api
 *
 * La demo puede reiniciarse: ningún test depende de datos preexistentes;
 * cada uno crea y consulta sus propios registros.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'https://automationintesting.online',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
