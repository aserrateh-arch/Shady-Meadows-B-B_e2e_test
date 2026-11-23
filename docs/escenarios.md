# Matriz de escenarios — 26 pruebas

Listado explícito de todos los escenarios (también visible con
`npx playwright test --list`). Estado: ✅ estable (suite `npm test`, siempre verde) · ⚠️ bug conocido
(suite `npm run test:bugs`: **falla en rojo** mientras el bug exista, documentado en
[`hallazgos.md`](hallazgos.md)).

## API (`tests/api/`)

| # | Escenario | Archivo | Estado |
|---|---|---|---|
| 01 | Crear y consultar reserva — depósito pagado | `01-create-booking.spec.ts` | ✅ |
| 02 | Crear y consultar reserva — sin depósito | `01-create-booking.spec.ts` | ✅ |
| 03 | Rechazar reserva sin firstname y no persistirla | `02-reject-invalid-booking.spec.ts` | ✅ |
| 04 | Rechazar firstname vacío | `03-validation-matrix.spec.ts` | ✅ |
| 05 | Rechazar lastname vacío | `03-validation-matrix.spec.ts` | ✅ |
| 06 | Rechazar email mal formado | `03-validation-matrix.spec.ts` | ✅ |
| 07 | Rechazar phone de 10 dígitos (mínimo 11) | `03-validation-matrix.spec.ts` | ✅ |
| 08 | Rechazar roomid inválido (0) | `03-validation-matrix.spec.ts` | ✅ |
| 09 | Rechazar firstname null | `03-validation-matrix.spec.ts` | ✅ |
| 10 | Rechazar depositpaid null | `03-validation-matrix.spec.ts` | ✅ |
| 11 | Rechazar roomid null | `03-validation-matrix.spec.ts` | ✅ |
| 12 | BUG-06: debería rechazar check-in en el pasado | `03-validation-matrix.spec.ts` | ⚠️ |
| 13 | BUG-07: debería rechazar phone no numérico | `03-validation-matrix.spec.ts` | ⚠️ |
| 14 | BUG-08: fechas invertidas deben ser 400 (hoy 409 genérico) | `03-validation-matrix.spec.ts` | ⚠️ |
| 15 | BUG-10: bookingdates null debe responder 400 (hoy cuelga) | `03-validation-matrix.spec.ts` | ⚠️ |
| 16 | BUG-10: bookingdates ausente debe responder 400 (hoy cuelga) | `03-validation-matrix.spec.ts` | ⚠️ |

## UI (`tests/ui/`)

| # | Escenario | Archivo | Estado |
|---|---|---|---|
| 17 | Reservar por UI, confirmar en pantalla y verificar por API | `01-book-room-ui-verify-api.spec.ts` | ✅* |
| 18 | Reserva creada por API aparece como ocupada en el calendario | `02-api-booking-reflected-in-calendar.spec.ts` | ⚠️ (BUG-01/04) |
| 19 | Mock: alta falla con 500 → error visible, sin confirmación | `03-backend-failure-mock.spec.ts` | ✅ |
| 20 | Resiliencia: lentitud 6 s → confirma, una sola reserva, un solo POST | `04-resilience.spec.ts` | ✅ |
| 21 | BUG-05: corte de conexión debe mostrar error al usuario | `04-resilience.spec.ts` | ⚠️ |
| 22 | BUG-09: doble clic en Reserve Now no duplica el envío | `04-resilience.spec.ts` | ⚠️ |

\* con el workaround acotado de BUG-01 (ver README y hallazgos).

## Contrato documentado del entorno (`tests/bugs/`)

| # | Escenario | Archivo | Estado |
|---|---|---|---|
| 23 | BUG-01: GET /api/room/{id} debe responder 200 | `01-known-bugs.spec.ts` | ⚠️ |
| 24 | BUG-01 (impacto UI): la página de reserva renderiza sin workarounds | `01-known-bugs.spec.ts` | ⚠️ |
| 25 | BUG-02: GET /api/booking/{id} debe responder 200 con la reserva | `01-known-bugs.spec.ts` | ⚠️ |
| 26 | BUG-03: el alta debe devolver el esquema completo (email/phone) | `01-known-bugs.spec.ts` | ⚠️ |

**Totales**: 14 estables ✅ + 12 fallos esperados ⚠️ = 26 escenarios.
Ejecución: `npx playwright test --workers 2` → exit 0 (~1.1 min).
