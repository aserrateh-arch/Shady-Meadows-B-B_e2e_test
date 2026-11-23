# Checklist de cumplimiento — Prueba técnica QE

Verificación del enunciado (`Prueba_Tecnica_Quality_Engineer.docx`) contra la
entrega. Estado auditado el 2026-11-23.

## 1. Alcance mínimo

| Requisito | Dónde | Estado |
|---|---|---|
| API exitosa: crear y consultar reserva (status HTTP, identidad, habitación, fechas, datos del huésped) | `tests/api/01-create-booking.spec.ts` (escenarios 01-02) | ✅ |
| API negativa: dato obligatorio ausente → rechazo + no persistida | `tests/api/02-reject-invalid-booking.spec.ts` (escenario 03) | ✅ |
| UI+API integradas: reserva por UI, confirmación, misma reserva por API | `tests/ui/01-book-room-ui-verify-api.spec.ts` (escenario 17) | ✅* |
| Parametrización con 2 conjuntos de datos | Escenarios 01-02 (depósito pagado / sin depósito) | ✅ |
| 3 casos priorizados documentados con riesgo, sin automatizar | `docs/casos-prioritarios.md` | ✅ |

\* con el workaround acotado y documentado de BUG-01 (ver hallazgos).

## 2. Criterios técnicos

| Requisito | Dónde | Estado |
|---|---|---|
| TypeScript + Playwright Test | todo el repo, `npm run typecheck` | ✅ |
| POM para UI | `src/pages/` (único lugar con locators) | ✅ |
| Clientes de API separados | `src/api/` (booking, room, report, auth) | ✅ |
| Locators estables | rol/nombre, `input[name]`, `#id` — sin CSS generado ni XPath | ✅ |
| Aserciones con espera automática, sin esperas fijas | `expect(locator)` auto-wait; cero `waitForTimeout` | ✅ |
| Sin dependencias entre pruebas | datos propios por test, fixtures, habitación por worker | ✅ |
| Backend real en los 3 escenarios | mocks solo en fallo/inestabilidad (declarados) | ✅ |
| Ejecución con al menos 2 workers | `workers: 2` en `playwright.config.ts` | ✅ |
| Reporte de Playwright conservado + evidencias ante fallos | `playwright-report/`, `test-results/` (trace, video, foto) | ✅ |

## 3. Uso de IA y entrega

| Requisito | Dónde | Estado |
|---|---|---|
| SKILL.md: propósito, entradas, pasos, convenciones POM/fixtures, comandos, criterios de éxito, actuación ante errores | `skills/*/SKILL.md` (4 skills, + salidas y limitaciones) | ✅ |
| Skill usada con un agente para el escenario integrado UI+API | `docs/evidencia-ia.md` (invocación, cambios, ejecución, correcciones) | ✅ |
| Commit de la skill ANTES de usarla | `4167e2c` (skills) → `fc5149a` (implementación) | ✅ |
| Revisión sin ocultar fallos ni debilitar aserciones | suite `@known-bug` roja con evidencia; 10 hallazgos documentados | ✅ |

## 4. Otras skills propuestas

| Requisito | Dónde | Estado |
|---|---|---|
| 3 skills adicionales justificadas (propósito, usuario, entradas/salidas, verificación, prioridad) | `docs/skills-propuestas.md` | ✅ |
| Cuál primero, cómo medir utilidad, qué se resuelve con script/fixture | misma sección, cierre del documento | ✅ |
| (Extra) visual-regression-testing documentada con capacidades Playwright + Figma | `docs/skills-propuestas.md` §4 | ✅ |

## 5. Harness mínimo

| Requisito | Dónde | Estado |
|---|---|---|
| Comandos de instalación y ejecución para personas y agentes | `README.md` + `agents/qa-orchestrator/AGENT.md` | ✅ |
| Códigos de salida conservados y explicados | README §"Cómo leer la ejecución" (exit 0 estable / exit 1 bugs) | ✅ |
| Cómo otro desarrollador usa la solución | README §"Cómo usarla otra persona" | ✅ |
| Conexión con gates smoke/regresión | README §"Conexión con gates" | ✅ |

## 6. Entregables

| Requisito | Dónde | Estado |
|---|---|---|
| Repo GitHub accesible con código, lockfile, configuración, skill, README | github.com/aserrateh-arch/Shady-Meadows-B-B_e2e_test | ✅ |
| README con instalación, entorno, comandos, evidencia de uso de IA | `README.md` | ✅ |
| Reporte de ejecución + resumen de casos, riesgos y limitaciones | `docs/resumen-ejecucion.md` + `docs/escenarios.md` | ✅ |
| Bugs con pasos, esperado, observado y evidencia | `docs/hallazgos.md` (10 hallazgos) | ✅ |
| Propuestas de skills + adopción | `docs/skills-propuestas.md` | ✅ |
| Tiempo invertido y pendientes | README §"Tiempo invertido y pendientes" | ✅ |

## Brechas declaradas (honestidad del alcance)

- La UI de reserva del entorno está rota (BUG-01): el escenario integrado usa
  un workaround acotado y documentado; el contrato real corre rojo en la suite
  de bugs.
- El escenario API→UI no puede pasar mientras BUG-04 exista (rojo documentado).
- Email/phone no verificables por API mientras BUG-03 exista.
