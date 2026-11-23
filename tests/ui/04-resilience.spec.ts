import { attachScreenshot } from '../../src/oracle/reporting';
import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Escenarios 20-22 (docs/escenarios.md): resiliencia de la UI ante
 * inestabilidad del backend (skill mock-resilience-testing). Solo la red se
 * perturba de forma acotada; la verificación de negocio es backend real.
 */
test.describe('resiliencia ante inestabilidad del backend', () => {
  test('tolera lentitud del alta: confirma y persiste una sola reserva', async ({
    bookingFlow,
    reservationPage,
    roomUnderTest,
    roomDetailWorkaround,
    guest,
    freeWindow,
    verifier,
    page,
  }, testInfo) => {
    void roomDetailWorkaround;
    let postCount = 0;
    await page.route(/\/api\/booking\/?$/, async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 6_000)); // latencia inyectada
        return route.continue(); // el alta sigue yendo al backend real
      }
      return route.continue();
    });

    await bookingFlow.bookRoom(roomUnderTest, guest, freeWindow, testInfo);

    await expect(reservationPage.confirmationHeading).toBeVisible({ timeout: 20_000 });
    await expect(reservationPage.errorAlert).toBeHidden();
    await attachScreenshot(testInfo, page, 'confirmacion-tras-latencia');

    const matches = await verifier.findAllByIdentity(roomUnderTest.roomid, guest, freeWindow);
    expect(matches.length, 'la lentitud no debe duplicar la reserva').toBe(1);
    expect(postCount, 'el front no debe reintentar ni duplicar el POST').toBe(1);
  });

  test('ante corte de conexión la UI informa el error (BUG-05: hoy no lo hace)', {
    tag: '@known-bug',
  }, async ({
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
        return route.abort('connectionfailed');
      }
      return route.continue();
    });

    await bookingFlow.bookRoom(roomUnderTest, guest, freeWindow, testInfo);

    // Expectativa de UX: un fallo de red debe ser visible para el usuario.
    // La foto evidencia el estado real: sin alerta, sin feedback (BUG-05).
    await attachScreenshot(testInfo, page, 'BUG-05-sin-feedback-tras-corte-de-red');
    await expect(reservationPage.errorAlert).toBeVisible();
    await expect(reservationPage.confirmationHeading).toBeHidden();
  });

  test('doble clic en Reserve Now no duplica el envío (BUG-09: no hay guard)', {
    tag: '@known-bug',
  }, async ({
    homePage,
    reservationPage,
    roomUnderTest,
    roomDetailWorkaround,
    guest,
    freeWindow,
    verifier,
    page,
  }, testInfo) => {
    void roomDetailWorkaround;
    let postCount = 0;
    await page.route(/\/api\/booking\/?$/, async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 3_000)); // ventana de latencia
        return route.continue();
      }
      return route.continue();
    });

    await homePage.goto();
    await homePage.openReservation(roomUnderTest);
    await reservationPage.setDates(roomUnderTest.roomid, freeWindow);
    await reservationPage.openGuestForm();
    await reservationPage.fillGuestForm(guest);
    await reservationPage.reserveNowButton.dblclick();

    // Comportamiento correcto: una sola petición, confirmación sin errores,
    // exactamente una reserva persistida. La foto captura el estado real
    // (BUG-09: hoy la app revienta en "This page couldn't load").
    await attachScreenshot(testInfo, page, 'BUG-09-estado-tras-doble-clic');
    await expect(reservationPage.confirmationHeading).toBeVisible({ timeout: 20_000 });
    await expect(reservationPage.errorAlert).toBeHidden();
    expect(postCount, 'el doble clic no debe producir dos POST').toBe(1);

    const matches = await verifier.findAllByIdentity(roomUnderTest.roomid, guest, freeWindow);
    expect(matches.length, 'no debe persistirse más de una reserva').toBe(1);
  });
});
