import { expect, test } from '../../src/fixtures/test.fixtures';

/**
 * Resiliencia de la UI ante inestabilidad del backend (mocks de red).
 * Complementan al mock de fallo binario (500): aquí el objetivo es el
 * comportamiento del front bajo LENTITUD y CORTE DE CONEXIÓN.
 * El alta real se verifica por API; solo la red se perturba de forma acotada.
 */
test.describe('UI — resiliencia ante inestabilidad del backend', () => {
  test('tolera lentitud del alta: confirma y persiste una sola reserva', async ({
    api,
    bookingFlow,
    reservationPage,
    roomUnderTest,
    roomDetailWorkaround,
    guest,
    freeWindow,
    page,
  }) => {
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

    const window = freeWindow;
    await bookingFlow.bookRoom(roomUnderTest, guest, window);

    await expect(reservationPage.confirmationHeading).toBeVisible({ timeout: 20_000 });
    await expect(reservationPage.errorAlert).toBeHidden();

    // Oráculo de integridad: exactamente UNA reserva persistida con esos datos.
    const bookings = await api.booking.listByRoom(roomUnderTest.roomid);
    const matches = bookings.filter(
      (b) =>
        b.bookingdates.checkin === window.checkin &&
        b.bookingdates.checkout === window.checkout &&
        b.firstname === guest.firstname &&
        b.lastname === guest.lastname,
    );
    expect(matches.length, 'la lentitud no debe duplicar la reserva').toBe(1);
    expect(postCount, 'el front no debe reintentar ni duplicar el POST').toBe(1);
  });

  test('ante corte de conexión la UI informa el error (BUG-05: hoy no lo hace)', async ({
    bookingFlow,
    reservationPage,
    roomUnderTest,
    roomDetailWorkaround,
    guest,
    freeWindow,
    page,
  }) => {
    test.fail();
    void roomDetailWorkaround;
    await page.route(/\/api\/booking\/?$/, (route) => {
      if (route.request().method() === 'POST') {
        return route.abort('connectionfailed');
      }
      return route.continue();
    });

    await bookingFlow.bookRoom(roomUnderTest, guest, freeWindow);

    // Expectativa de UX: un fallo de red debe ser visible para el usuario.
    await expect(reservationPage.errorAlert).toBeVisible();
    await expect(reservationPage.confirmationHeading).toBeHidden();
  });

  test('doble clic en Reserve Now no duplica el envío (BUG-09: no hay guard)', async ({
    api,
    homePage,
    reservationPage,
    roomUnderTest,
    roomDetailWorkaround,
    guest,
    freeWindow,
    page,
  }) => {
    test.fail();
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

    const window = freeWindow;
    await homePage.goto();
    await homePage.openReservation(roomUnderTest);
    await reservationPage.setDates(roomUnderTest.roomid, window);
    await reservationPage.openGuestForm();
    await reservationPage.fillGuestForm(guest);
    await reservationPage.reserveNowButton.dblclick();

    // Comportamiento correcto: una sola petición, confirmación sin errores,
    // exactamente una reserva persistida.
    await expect(reservationPage.confirmationHeading).toBeVisible({ timeout: 20_000 });
    await expect(reservationPage.errorAlert).toBeHidden();
    expect(postCount, 'el doble clic no debe producir dos POST').toBe(1);

    const bookings = await api.booking.listByRoom(roomUnderTest.roomid);
    const matches = bookings.filter(
      (b) =>
        b.bookingdates.checkin === window.checkin &&
        b.bookingdates.checkout === window.checkout &&
        b.firstname === guest.firstname &&
        b.lastname === guest.lastname,
    );
    expect(matches.length, 'no debe persistirse más de una reserva').toBe(1);
  });
});
