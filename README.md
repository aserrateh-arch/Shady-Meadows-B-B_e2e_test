# Restful Booker Platform — Automatización API + UI

Prueba técnica QE: suite Playwright (TypeScript) contra la demo pública de
**Restful Booker Platform** (`https://automationintesting.online`), con
**POM + Flows + Fixtures**, **oráculo de contrato** y **skills** para guiar a
agentes de IA.

## Requisitos

- Node.js 20+ (probado con Node 26)
- `npm install` y `npx playwright install chromium`

## Comandos

```bash
npm install                  # dependencias
npx playwright install chromium
npm run typecheck            # tsc --noEmit (gate de tipos)
npm test                     # suite completa, 2 workers, backend real
npm run test:api             # solo API
npm run test:ui              # solo UI
npm run report               # abre el reporte HTML de la última ejecución
```

Códigos de salida: `0` = todo verde (incluye bugs conocidos como fallo
esperado); `≠0` = fallo inesperado. La evidencia de cada ejecución queda en
`playwright-report/` (HTML) y `test-results/` (traces, screenshots, videos de
fallos).

## Estructura

```
src/
  api/        Clientes tipados por recurso (booking, room, report, auth)
  data/       Fábrica de datos sintéticos + utilidades de fechas libres
  oracle/     Oráculo de contrato: documentación vs. comportamiento observado
  pages/      Page Objects (Home, Reservation) — único lugar con locators
  flows/      Flujos de negocio que orquestan POMs
  fixtures/   test.extend(): clientes API autenticados, POMs, flows,
              habitación por worker, workaround documentado del entorno
tests/
  api/        Éxito (parametrizado x2) y negativo (no-persistencia)
  ui/         Integración UI+API, API→UI (bloqueado por bugs), mocks de fallo
              y resiliencia (500, corte de conexión, latencia)
  bugs/       Contrato documentado que el entorno no cumple (test.fail)
skills/       api-contract-testing, oracle-testing, synthetic-data
agents/       qa-orchestrator (orquesta las skills)
docs/         hallazgos (bugs), casos priorizados, skills propuestas, evidencia IA
```

## Decisiones clave

- Backend real en todos los escenarios; los únicos mocks permitidos son los de
  fallo/inestabilidad (500 simulado, corte de conexión, latencia inyectada) y
  el workaround acotado de BUG-01 (ver abajo).
- **Sin datos hardcodeados ni fechas fijas**: huéspedes sintéticos únicos por
  ejecución y ventanas libres calculadas desde la ocupación real — la demo se
  reinicia y es compartida, así que ningún test depende de estado previo.
- **Oracle testing**: las expectativas se derivan de la documentación antes de
  ejecutar; las divergencias se adjuntan al reporte, no se ocultan.
- **Sin librerías de fake data**: fábrica propia determinista y trazable
  (timestamp base36 + aleatorio), una dependencia menos y datos auditables.

## Estado del entorno (importante)

La demo actual tiene **10 hallazgos confirmados** que rompen parte del contrato
o de las reglas de negocio (`GET /api/room/{id}` y `GET /api/booking/{id}` →
500, alta sin eco de email/phone, `GET /api/report/room/{id}` → 500,
validaciones de negocio ausentes, endpoint colgado ante `bookingdates` nulo,
crashes de UI ante fallos). Detalle, pasos y evidencia en
[`docs/hallazgos.md`](docs/hallazgos.md). Consecuencias honestas en la suite:

- Los tests de esos contratos corren con `test.fail()` — **fallan hoy y
  avisarán solos cuando el entorno se repare**.
- El escenario UI+API usa `roomDetailWorkaround`: intercepta **solo** la
  lectura rota de habitación con datos reales del listado; el alta y la
  verificación son 100 % backend real.
- El escenario API→UI (agendar por API y ver el bloqueo en el calendario)
  queda como fallo esperado: el calendario no puede recibir la ocupación
  porque el endpoint de reporte por habitación está roto.

## Cómo usarla otra persona (o un agente)

1. Clona, `npm install`, `npx playwright install chromium`.
2. `npm test` — todo debe quedar verde en ~40 s.
3. Para agregar un escenario: lee `agents/qa-orchestrator/AGENT.md` y la skill
   del canal correspondiente (`skills/*/SKILL.md`).
4. Credenciales admin de la demo: `admin` / `password` (públicas), variables
   `RBP_ADMIN_USER` / `RBP_ADMIN_PASSWORD` para sobreescribir.

## Conexión con gates (smoke / regresión)

- **Smoke (bloquea PR)**: `tests/api` + `tests/ui/booking.integration.spec.ts`
  — alta, rechazo y flujo integrado. `npx playwright test tests/api tests/ui/booking.integration.spec.ts`.
- **Regresión (pipeline nocturno)**: suite completa incluyendo mocks y bugs
  conocidos. El exit code es semántico: los `test.fail()` documentados no
  bloquean; cualquier otro rojo sí.
- El reporte HTML (`playwright-report/`) se publica como artefacto del pipeline.

## Uso de IA

Ver [`docs/evidencia-ia.md`](docs/evidencia-ia.md): invocación de las skills,
cambios generados, ejecución y correcciones humanas justificadas.

## Resumen de ejecución

Casos, riesgos, limitaciones y pendientes en
[`docs/resumen-ejecucion.md`](docs/resumen-ejecucion.md).

## Tiempo invertido y pendientes

- **Invertido**: ~4 h (exploración del entorno real, diseño, implementación,
  ejecución y documentación).
- **Pendientes (post-alcance mínimo)**: automatizar los 3 casos priorizados de
  [`docs/casos-prioritarios.md`](docs/casos-prioritarios.md), eliminar el
  workaround cuando se repare BUG-01, y promover los tests de `tests/bugs/` a
  la suite estable cuando el entorno cumpla el contrato.
