import type { ApiClients } from '../fixtures/test.fixtures';
import type { BookingRequest } from '../api/types';
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
   */
  async createAndVerifyIdentity(payload: BookingRequest): Promise<Divergence[]> {
    const createResponse = await this.api.booking.create(payload);
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
