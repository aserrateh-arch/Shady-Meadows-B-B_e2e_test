# Resumen de ejecución — casos, riesgos y limitaciones

Fecha: 2026-11-23 · Comando: `npx playwright test --workers 2` · Resultado:
**27/27** (15 estables verdes + 12 fallos esperados documentados) en ~1.1 min.
Reporte: `playwright-report/` · Evidencias de fallo: `test-results/` (trace,
screenshot, video, `error-context.md`).

## Casos ejecutados

| Escenario | Specs | Estado | Riesgo que cubre |
|---|---|---|---|
| API éxito: crear y consultar reserva (parametrizado x2: con/sin depósito) | 2 | ✅ estables | Alta íntegra e identidad del registro |
| Journey API completo (auth → habitaciones → disponibilidad → crear → verificar) | 1 | ✅ estable | Encadenamiento de endpoints del negocio |
| API negativa: dato obligatorio ausente | 1 | ✅ estable | Rechazo correcto + no-persistencia |
| Matriz de validación estricta (campos vacíos, formatos, nulos) | 8 | ✅ estables | Robustez del contrato ante payloads inválidos |
| UI+API integrada (reserva por UI, verificación por API) | 1 | ✅ estable* | Consistencia entre canales (*usa workaround acotado de BUG-01) |
| Mock de fallo 500 en el alta | 1 | ✅ estable | UX ante error del backend |
| Resiliencia: lentitud inyectada | 1 | ✅ estable | Tolerancia a latencia sin duplicar reserva |

> Los mocks se rigen por la skill `mock-resilience-testing`: perturbación
> mínima y declarada, verificación de negocio siempre contra el backend real.
| Bugs del entorno / reglas no enforced (BUG-01…10) | 12 | 🔴 rojos por diseño (`npm run test:bugs`) | Contrato documentado que el sistema no cumple |

## Riesgos principales detectados

1. **BUG-10 (crítico)**: `bookingdates` nulo/ausente cuelga el endpoint sin
   respuesta HTTP — riesgo de agotamiento de conexiones.
2. **BUG-09 (alto)**: doble clic en "Reserve Now" revienta la app completa
   tras crear la reserva → reintentos ciegos del usuario.
3. **BUG-01/02/04 (alto)**: endpoints de lectura rotos (500) — la página de
   reserva de la UI no funciona sin workaround.
4. **BUG-06/07 (medio)**: reservas en el pasado y teléfonos no numéricos
   aceptados — integridad de datos de negocio.
5. **BUG-03 (medio)**: el alta no devuelve email/phone — imposible verificar
   PII del huésped por API.

Detalle completo con pasos/esperado/observado en [`hallazgos.md`](hallazgos.md).

## Limitaciones

- **Entorno compartido y con reinicios**: los ids se reciclan y otros usuarios
  agendan en paralelo. Mitigado con datos únicos por ejecución, ventanas libres
  calculadas en vivo y habitación por worker; aun así, una ejecución puede
  colisionar con otro usuario de la demo (probabilidad baja).
- **BUG-01 obliga al workaround** `roomDetailWorkaround` en los tests de UI de
  reserva: se intercepta solo la lectura de habitación (con datos reales del
  listado). El alta y la verificación son backend real.
- **El escenario API→UI corre en la suite de bugs (rojo)**: el calendario no puede
  reflejar lo agendado porque `GET /api/report/room/{id}` está roto (BUG-04).
- **Email/phone no verificables por API** (BUG-03): la verificación cruzada
  UI→API usa nombre + apellido + fechas.
- **Cobertura de un solo navegador** (Chromium): suficiente para el alcance
  mínimo; Firefox/WebKit serían el siguiente paso.

## Pendientes priorizados

1. Automatizar los 3 casos de [`casos-prioritarios.md`](casos-prioritarios.md)
   (conflicto de disponibilidad, fronteras de fechas, matriz de seguridad auth).
2. Retirar `roomDetailWorkaround` cuando se repare BUG-01 (el test de impacto
   UI avisará solo).
3. Promover `tests/bugs/` a la suite estable cuando el entorno cumpla contrato.
4. Implementar la skill propuesta `contract-diff-reporter` para derivar los
   oráculos desde la colección Postman/OpenAPI.
