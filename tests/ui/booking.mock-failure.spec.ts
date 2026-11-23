import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Prueba con mock enfocada al fallo: el backend se simula caído (500) al
 * crear la reserva. La UI debe informar el error y NO mostrar confirmación.
 * Es la única prueba del proyecto que mockea la escritura: su objetivo es el
 * comportamiento de la UI ante un fallo, no el contrato del servidor.
 * (La lectura GET /api/room/{id} además se suplanta por BUG-01 del entorno.)
 */
test.describe('UI — fallo del backend simulado (mock)', () => {
  test('muestra el error y no confirma cuando el alta falla con 500', async ({
    bookingFlow,
    reservationPage,
    roomUnderTest,
    roomDetailWorkaround,
    guest,
    freeWindow,
    page,
  }) => {
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

    await bookingFlow.bookRoom(roomUnderTest, guest, freeWindow);

    await expect(reservationPage.errorAlert).toBeVisible();
    await expect(reservationPage.confirmationHeading).toBeHidden();
  });
});
