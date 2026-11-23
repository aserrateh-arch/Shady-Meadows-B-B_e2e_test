import type { APIResponse } from '@playwright/test';
import type { Divergence } from './booking.oracle';

/**
 * Validador de esquema mínimo (sin dependencias): verifica campos requeridos,
 * tipos, nulabilidad, formatos y campos no esperados. Devuelve divergencias;
 * el test decide el fallo.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';
export type FieldFormat = 'iso-date' | 'email';

export interface FieldSpec {
  type: FieldType;
  required?: boolean; // default true
  nullable?: boolean; // default false
  format?: FieldFormat;
  /** Esquema anidado para type: 'object'. */
  properties?: Record<string, FieldSpec>;
}

const FORMATS: Record<FieldFormat, RegExp> = {
  'iso-date': /^\d{4}-\d{2}-\d{2}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

function typeOf(value: unknown): FieldType | 'null' {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value === 'object' ? 'object' : (typeof value as FieldType);
}

export function checkSchema(
  body: unknown,
  schema: Record<string, FieldSpec>,
  path = 'body',
  options: { allowExtraFields?: boolean } = {},
): Divergence[] {
  const divergences: Divergence[] = [];
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return [
      {
        check: `${path} (tipo)`,
        expected: 'object',
        observed: JSON.stringify(typeOf(body)),
      },
    ];
  }
  const record = body as Record<string, unknown>;

  for (const [field, spec] of Object.entries(schema)) {
    const fieldPath = `${path}.${field}`;
    const value = record[field];
    const required = spec.required !== false;

    if (value === undefined) {
      if (required) {
        divergences.push({
          check: `${fieldPath} (requerido)`,
          expected: `presente (${spec.type})`,
          observed: 'ausente',
        });
      }
      continue;
    }
    if (value === null) {
      if (!spec.nullable) {
        divergences.push({
          check: `${fieldPath} (nulabilidad)`,
          expected: 'no nulo',
          observed: 'null',
        });
      }
      continue;
    }
    const actualType = typeOf(value);
    if (actualType !== spec.type) {
      divergences.push({
        check: `${fieldPath} (tipo)`,
        expected: spec.type,
        observed: actualType,
      });
      continue;
    }
    if (spec.format && spec.type === 'string' && !FORMATS[spec.format].test(value as string)) {
      divergences.push({
        check: `${fieldPath} (formato)`,
        expected: spec.format,
        observed: JSON.stringify(value),
      });
    }
    if (spec.properties && spec.type === 'object') {
      divergences.push(...checkSchema(value, spec.properties, fieldPath, options));
    }
  }

  if (!options.allowExtraFields) {
    for (const key of Object.keys(record)) {
      if (!(key in schema)) {
        divergences.push({
          check: `${path}.${key} (campo inesperado)`,
          expected: 'no presente en el contrato',
          observed: JSON.stringify(record[key]).slice(0, 80),
        });
      }
    }
  }
  return divergences;
}

/** Contrato de headers HTTP: Content-Type JSON en toda respuesta de la API. */
export function checkHeaders(response: APIResponse): Divergence[] {
  const divergences: Divergence[] = [];
  const headers = response.headers();
  const contentType = headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    divergences.push({
      check: 'header content-type',
      expected: 'application/json',
      observed: contentType || '<ausente>',
    });
  }
  return divergences;
}
