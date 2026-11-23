import type { ApiClients } from '../fixtures/test.fixtures';
import type { BookingRequest } from '../api/types';
import { findFreeWindow } from '../data/date.utils';
import {
  checkBookingIdentity,
  checkCreateContract,
  checkRejectionContract,
  type Divergence,
} from '../oracle/booking.oracle';
import { BookingVerifier } from '../verification/booking.verifier';

/**
 * Flow de negocio del canal API: operaciones completas de reserva con sus
 * oráculos aplicados. Los specs declaran el escenario; el flow ejecuta la
 * mecánica y devuelve divergencias (el test decide el fallo).
 */
export class BookingApiFlow {
  constructor(
    private readonly api: ApiClients,
    private readonly verifier: BookingVerifier,
  ) {}

  /**
   * Alta exitosa + consulta: valida contrato del alta (status, headers,
   * esquema) e identidad exacta del registro persistido.
   *
   * Resiliencia a contención: la demo es compartida y una ventana calculada
   * libre puede ser tomada por otro usuario antes del POST (409). Ante un
   * conflicto se recalcula la ventana con la ocupación fresca y se reintenta
   * (máx. 3 intentos) — el 409 por contención es ruido del entorno, no una
   * divergencia de contrato.
   */
  async createAndVerifyIdentity(payload: BookingRequest): Promise<Divergence[]> {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const createResponse = await this.api.booking.create(payload);
      if (createResponse.status() === 409 && attempt < maxAttempts - 1) {
        payload.bookingdates = await this.freshWindow(payload.roomid, attempt + 1);
        continue;
      }
      const divergences = await checkCreateContract(createResponse);
      if (divergences.length > 0) {
        return divergences;
      }

      const created = (await createResponse.json()) as { bookingid: number };
      const persisted = (await this.verifier.snapshot(payload.roomid)).find(
        (b) => b.bookingid === created.bookingid,
      );
      if (!persisted) {
        return [
          {
            check: 'persistencia',
            expected: `reserva ${created.bookingid} visible en habitación ${payload.roomid}`,
            observed: 'no encontrada en el listado',
          },
        ];
      }
      return checkBookingIdentity(persisted, payload);
    }
    throw new Error('inalcanzable');
  }

  /** Ventana libre recalculada con ocupación fresca y jitter creciente. */
  private async freshWindow(roomId: number, attempt: number) {
    const ranges = (await this.verifier.snapshot(roomId)).map((e) => ({
      start: e.bookingdates.checkin,
      end: e.bookingdates.checkout,
    }));
    const jitter = Math.floor(Math.random() * 60) * attempt;
    return findFreeWindow(ranges, 2, 3, 180, jitter);
  }

  /**
   * Alta inválida: valida el rechazo (status, headers, esquema de error,
   * mensaje) y la NO-persistencia (diff de reservas antes/después).
   */
  async createExpectingRejection(
    payload: BookingRequest,
    errorFragment: string,
  ): Promise<Divergence[]> {
    const before = await this.verifier.snapshot(payload.roomid);
    const response = await this.api.booking.create(payload);
    const divergences = await checkRejectionContract(response, errorFragment);

    const newEntries = await this.verifier.newBookingsSince(payload.roomid, before);
    if (newEntries.length > 0) {
      divergences.push({
        check: 'no-persistencia',
        expected: 'un payload rechazado no persiste ninguna reserva',
        observed: `aparecieron ${newEntries.length} reserva(s) nueva(s)`,
      });
    }
    return divergences;
  }
}
