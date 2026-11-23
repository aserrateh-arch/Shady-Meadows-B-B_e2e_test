import type { GuestData } from '../api/types';

/**
 * Fábrica de datos sintéticos de huésped.
 * - Sin dependencias externas: datos deterministas trazables por timestamp.
 * - Teléfono de 11 dígitos (mínimo exigido por la API).
 * - Nombres solo alfabéticos (la API valida formato).
 */
export function buildGuest(overrides: Partial<GuestData> = {}): GuestData {
  const stamp = Date.now().toString(36).slice(-6);
  const rand = Math.floor(Math.random() * 900) + 100;
  return {
    firstname: `Auto${stamp}`,
    lastname: `Qa${rand}test`,
    email: `qa.auto.${stamp}${rand}@example.com`,
    phone: `57${String(Date.now()).slice(-9)}`,
    ...overrides,
  };
}
