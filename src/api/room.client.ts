import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Room } from './types';

/** Cliente del recurso Room: descubre habitaciones reales del entorno. */
export class RoomClient {
  constructor(private readonly request: APIRequestContext) {}

  async listRooms(): Promise<Room[]> {
    const response = await this.request.get('/api/room');
    if (!response.ok()) {
      throw new Error(`GET /api/room falló con ${response.status()}`);
    }
    const body = (await response.json()) as { rooms: Room[] };
    return body.rooms;
  }

  /** Endpoint documentado de detalle de habitación (BUG-01: 500 en el entorno). */
  getById(roomId: number): Promise<APIResponse> {
    return this.request.get(`/api/room/${roomId}`);
  }
}
