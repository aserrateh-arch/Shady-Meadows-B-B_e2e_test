---
name: api-contract-testing
description: Implementa pruebas API contra Restful Booker Platform usando los clientes tipados del proyecto (BookingClient, RoomClient, ReportClient), con aserciones de contrato y verificación cruzada. Usar cuando se pidan tests de API, nuevos endpoints o escenarios de aceptación/rechazo.
---

# Skill: api-contract-testing

## Propósito
Crear o extender pruebas de API en `tests/api/` usando los clientes de `src/api/`,
nunca `request.post` suelto en los tests. Toda prueba valida status HTTP **y**
datos de negocio (identidad, habitación, fechas, huésped) contra el backend real.

## Entradas
- Escenario a cubrir (éxito, rechazo, conflicto de fechas, etc.).
- Payload esperado: usar `BookingRequest` de `src/api/types.ts`.
- Habitación bajo prueba: SIEMPRE la fixture `roomUnderTest` (round-robin por worker).

## Pasos
1. Lee `src/api/types.ts` y el cliente existente del recurso. Si el endpoint no
   existe, agrégalo al cliente correspondiente (o crea `src/api/<recurso>.client.ts`
   con constructor `(request: APIRequestContext)` y rutas relativas `/api/...`).
2. Fechas: NUNCA hardcodeadas. Obtén rangos ocupados con `api.report.bookedRanges(roomId)`
   y calcula la ventana con `findFreeWindow()` de `src/data/date.utils.ts`.
3. Huésped: SIEMPRE `buildGuest()` de `src/data/guest.factory.ts` (ver skill synthetic-data).
4. Aserciones: usa el oráculo (`src/oracle/booking.oracle.ts`) para status/payload,
   y `expect(...).toEqual([])` sobre la lista de divergencias. Adjunta las
   divergencias con `testInfo.attach('divergencias-contrato', ...)`.
5. Pruebas negativas: además del status de rechazo, verifica NO-persistencia
   (reporte antes/después, sin bookingid nuevo).

## Convenciones
- Los tests importan `test`/`expect` de `src/fixtures/test.fixtures.ts`, nunca de `@playwright/test`.
- Los clientes devuelven `APIResponse` cruda; la interpretación es del test/oráculo.
- Un test = un registro propio creado en el test. Prohibido depender de datos
   preexistentes o del orden de ejecución (la demo se reinicia).

## Verificación
```bash
npm run typecheck
npx playwright test tests/api --workers 2
```
Ambos deben terminar con exit code 0.

## Criterios de éxito
- Status y payload validados por oráculo, no solo `expect(res.ok())`.
- La prueba pasa con 2+ workers sin colisiones de datos.
- Divergencias contrato vs. comportamiento quedan adjuntas en el reporte.

## Ante errores o información insuficiente
- Si el endpoint difiere de la documentación: NO debilites la aserción.
  Registra la divergencia en el oráculo y documéntala en `docs/hallazgos.md`.
- Si no hay ventana libre: amplía `searchHorizonDays` en `findFreeWindow`, no
  hardcodees fechas.
- Si falta un dato del entorno (habitaciones, auth), falla rápido con mensaje claro.
