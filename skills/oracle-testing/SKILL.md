---
name: oracle-testing
description: Define y aplica oráculos de contrato para las pruebas de Restful Booker Platform. Usar cuando se deba decidir QUÉ verificar (status, payload, efectos laterales, no-persistencia) o cuando haya que registrar diferencias entre la documentación de la API y el comportamiento observado.
---

# Skill: oracle-testing

## Propósito
Cada expectativa se deriva de la DOCUMENTACIÓN (contrato) antes de ejecutar,
se compara con el comportamiento observado y toda diferencia se registra como
`Divergence` — nunca se ignora ni se "ajusta" la aserción para que pase.

## Entradas
- El artefacto bajo prueba: respuesta de API, estado persistido o salida de UI.
- La fuente del contrato: docs de la API, invariantes de negocio o el payload enviado.

## Los oráculos del proyecto
1. **Contrato de status**: POST /booking → 201; inválido → 400; GET by id → 200.
2. **Contrato de headers**: toda respuesta JSON lleva `content-type: application/json`.
3. **Contrato de esquema** (`src/oracle/schema.checker.ts` + `contracts.ts`):
   campos requeridos presentes y NO nulos, tipos, formatos (ISO date, email),
   sin campos inesperados.
4. **Contrato de datos**: el recurso consultado es eco exacto de lo enviado
   (huésped, habitación, fechas ISO, depositpaid).
5. **Oráculo de efectos**: una reserva creada aparece en el listado por
   habitación; una rechazada NO persiste (diff de bookingids antes/después).
6. **Oráculo de UI**: confirmación visible con las fechas exactas; ante fallo
   (mock), error visible y confirmación ausente.

## Pasos
1. Declara la expectativa ANTES de la llamada (constante o función `check*`).
2. Ejecuta la acción (crear, consultar, reservar).
3. Recoge divergencias con las funciones de `src/oracle/booking.oracle.ts`.
4. Adjunta divergencias al reporte (`testInfo.attach`) y falla con
   `expect(divergences).toEqual([])` incluyendo mensaje de negocio.
5. Si el comportamiento observado contradice la documentación: documenta el
   hallazgo en `docs/hallazgos.md` con esperado/observado/evidencia. No lo ocultes.

## Convenciones
- Los oráculos viven en `src/oracle/`, son funciones puras (sin expect dentro):
  devuelven `Divergence[]` y el test decide el fallo.
- Nunca comparar solo un campo "representativo": la identidad del registro es
  TODOS sus campos relevantes.
- Verificación cruzada UI↔API: lo creado por un canal se valida por el otro.

## Verificación
```bash
npm run typecheck
npx playwright test --workers 2
```

## Criterios de éxito
- Ninguna aserción compara contra valores observados a posteriori (self-fulfilling).
- Toda desviación conocida está en `docs/hallazgos.md` o el test la reporta.

## Ante errores o información insuficiente
- Si la documentación es ambigua: declara la expectativa más estricta razonable,
  ejecútala y registra la desviación real. Nunca asumas que "lo que hace" es "lo correcto".
