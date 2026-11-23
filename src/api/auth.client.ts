import type { APIRequestContext } from '@playwright/test';

/**
 * Cliente de autenticación. Las credenciales de la demo son públicas
 * (admin/password); se pueden sobreescribir con variables de entorno.
 */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(
    username = process.env.RBP_ADMIN_USER ?? 'admin',
    password = process.env.RBP_ADMIN_PASSWORD ?? 'password',
  ): Promise<string> {
    const response = await this.request.post('/api/auth/login', {
      data: { username, password },
    });
    if (!response.ok()) {
      throw new Error(`POST /api/auth/login falló con ${response.status()}`);
    }
    const body = (await response.json()) as { token?: string };
    if (!body.token) {
      throw new Error('POST /api/auth/login no devolvió token');
    }
    return body.token;
  }
}
