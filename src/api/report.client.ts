import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ReportEntry } from './types';

/**
 * Cliente de los reportes de ocupación.
 * - roomReport: alimenta el calendario de la UI (público según el front).
 * - fullReport: reporte global (requiere auth).
 */
export class ReportClient {
  constructor(private readonly request: APIRequestContext) {}

  roomReport(roomId: number): Promise<APIResponse> {
    return this.request.get(`/api/report/room/${roomId}`);
  }

  async fullReport(): Promise<ReportEntry[]> {
    const response = await this.request.get('/api/report');
    if (!response.ok()) {
      throw new Error(`GET /api/report falló con ${response.status()}`);
    }
    const body = (await response.json()) as { report: ReportEntry[] };
    return body.report;
  }
}
