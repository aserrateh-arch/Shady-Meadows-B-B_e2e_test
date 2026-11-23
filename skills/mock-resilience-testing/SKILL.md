---
name: mock-resilience-testing
description: Diseña pruebas con mocks de red para evaluar el comportamiento de la UI ante fallos e inestabilidad del backend (errores 4xx/5xx, cortes de conexión, latencia, doble envío) en Restful Booker Platform. Usar cuando se pidan pruebas de resiliencia, manejo de errores en front o simulación de fallos sin tocar el backend real.
---

# Skill: mock-resilience-testing

## Propósito
Probar el **comportamiento de la UI ante la adversidad**, no el contrato del
servidor. Los mocks perturban la red de forma acotada mientras el resto del
flujo sigue contra el backend real.

## Entradas
- Clase de fallo a simular: error de negocio (400), error de servidor (500),
  corte de conexión (`abort`), latencia (delay), o comportamiento del usuario
  bajo latencia (doble clic).
- La expectativa de UX a validar (qué debería ver/sufrir el usuario).

## Reglas duras
1. **El mock nunca suplanta la verificación de negocio**: si el escenario crea
   datos, la verificación final es contra el backend real (listado por API).
2. **Interceptar lo mínimo**: solo el endpoint perturbado (`/\/api\/booking\/?$/`
   para el alta); todo lo demás pasa con `route.continue()`.
3. **Declarar el mock explícitamente** en el comentario del spec: qué se
   intercepta, por qué y qué NO está mockeado.
4. **No mockear para que una prueba pase**: si el comportamiento observado es
   incorrecto, el test se taggea `@known-bug` (falla en rojo) y se documenta en
   `docs/hallazgos.md` — nunca se ajusta el mock para esconderlo.
5. Excepción única permitida fuera de esta clase: `roomDetailWorkaround`
   (BUG-01), documentada en fixtures y hallazgos.

## Catálogo de perturbaciones (con `page.route`)
| Perturbación | Implementación | Qué valida |
|---|---|---|
| 500 con body JSON | `route.fulfill({status: 500, body: ...})` | Alerta de error visible, sin confirmación |
| Corte de conexión | `route.abort('connectionfailed')` | Feedback visible al usuario (BUG-05) |
| Latencia | `await delay(ms)` + `route.continue()` | Sin duplicados, confirmación íntegra |
| Doble envío | latencia + `dblclick()` | Guard de idempotencia (BUG-09) |
| Body de error sin `errors` | fulfill 409 con `{"error": ...}` | Robustez del parser del front |

## Pasos
1. Declara la expectativa de UX ANTES de ejecutar (oráculo de UI, skill
   `oracle-testing`).
2. Registra el `page.route` antes de cualquier navegación.
3. Ejecuta el flujo con POM/Flow (nunca locators en el test).
4. Verifica UI (alerta/confirmación) **y** estado real por API (una sola
   reserva, conteo de POSTs con un contador en el route handler).
5. Si falla el comportamiento esperado: tag `@known-bug` + hallazgo documentado
   (la suite de bugs corre roja hasta que se repare).

## Verificación
```bash
npm run typecheck
npx playwright test tests/ui --workers 2
```

## Criterios de éxito
- El mock es visible, mínimo y justificado en comentarios.
- La aserción de negocio final usa el backend real.
- Toda desviación queda en `docs/hallazgos.md` con evidencia.

## Ante errores o información insuficiente
- Si no sabes qué DEBERÍA hacer la UI ante ese fallo: escribe la expectativa
  razonable (feedback visible, sin corrupción de datos), márcala como supuesto
  en el test y documéntala. Nunca derives la expectativa de lo que la UI hace hoy.
