import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Reintenta GETs idempotentes ante 5xx transitorios del entorno compartido
 * (la demo pública devuelve 500 intermitentes bajo carga). Un 5xx transitorio
 * es ruido del entorno; un 4xx o el 5xx persistente siguen llegando intactos
 * al oráculo. NUNCA usar para mutaciones (POST/PUT/DELETE).
 */
export async function getWithRetry(
  request: APIRequestContext,
  url: string,
  attempts = 3,
): Promise<APIResponse> {
  let last: APIResponse | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await request.get(url);
    if (last.status() < 500) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
  }
  return last!;
}
