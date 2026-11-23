import { attachScreenshot } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenario 19 (docs/escenarios.md): mock enfocado al fallo.
 * El backend se simula caído (500) al crear la reserva. La UI debe informar
 * el error y NO mostrar confirmación. Es la única prueba que mockea la
 * escritura: su objetivo es el comportamiento de la UI ante un fallo, no el
 * contrato del servidor (skill mock-resilience-testing).
 * (La lectura GET /api/room/{id} además se suplanta por BUG-01 del entorno.)
 */
test('muestra el error y no confirma cuando el alta falla con 500', async ({
  bookingFlow,
  reservationPage,
  roomUnderTest,
  roomDetailWorkaround,
  guest,
  freeWindow,
  page,
}, testInfo) => {
  void roomDetailWorkaround;
  await page.route(/\/api\/booking\/?$/, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errors: ['Internal Server Error (simulado)'] }),
      });
    }
    return route.continue();
  });

  await bookingFlow.bookRoom(roomUnderTest, guest, freeWindow, { testInfo });

  await expect(reservationPage.errorAlert).toBeVisible();
  await expect(reservationPage.confirmationHeading).toBeHidden();
  await attachScreenshot(testInfo, page, 'error-500-visible-en-ui');
});
