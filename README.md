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
  api/           Clientes tipados por recurso (booking, room, report, auth)
  data/          Fábrica de datos sintéticos + utilidades de fechas libres
  oracle/        Oráculo de contrato: esquemas, headers, identidad, rechazo
  verification/  BookingVerifier: cómo localizar y comparar estado persistido
  pages/         Page Objects (Home, Reservation) — único lugar con locators
  flows/         Flujos de negocio (UI y API) con oráculos aplicados
  fixtures/      test.extend(): clientes autenticados, POMs, flows, verifier,
                 habitación por worker, data sintética preparada pre-test
tests/           SOLO escenarios declarativos (sin mecánica); ver matriz en
                 docs/escenarios.md — archivos numerados por escenario
  api/           01 alta parametrizada x2 · 02 rechazo · 03 matriz de validación
  ui/            01 integración UI+API · 02 API→UI · 03 mock de fallo · 04 resiliencia
  bugs/          01 contrato documentado que el entorno no cumple (test.fail)
skills/          api-contract-testing, oracle-testing, synthetic-data,
                 mock-resilience-testing
agents/          qa-orchestrator (orquesta las skills)
docs/            escenarios, hallazgos, casos priorizados, skills propuestas,
                 evidencia IA, cobertura del oráculo, resumen de ejecución
```

**Principio de diseño (SOLID aplicado a tests)**: cada pieza tiene una sola
responsabilidad — fixtures preparan, POMs localizan, flows orquestan, el
verifier consulta estado, el oráculo juzga, y el spec solo declara el
escenario y decide el fallo. Un escenario nuevo = un spec nuevo que compone
esas piezas, sin copiar mecánica.

## Cómo leer la ejecución y el reporte (importante)

La suite tiene dos clases de pruebas, separadas con el tag `@known-bug`:

| Comando | Qué corre | Cómo debe verse |
|---|---|---|
| `npm run test:stable` | Los 14 escenarios estables | **100% verdes, sin un solo ✘** |
| `npm run test:bugs` | Los 12 bugs conocidos del entorno | 12 ✘ **esperados** (cada uno evidencia un bug documentado) |
| `npm test` | Los 26 juntos | 26 "passed", donde los ✘ son los esperados |

**Semántica clave**: los bugs conocidos usan `test.fail()` ("espero que
falle"). Playwright los cuenta como *passed* porque fallaron *como se
esperaba* — en consola y en el reporte HTML aparecen con ✘ pero en verde
"expected". Por eso `npm test` dice "26 passed" aunque haya 12 ✘. Si algún
día el entorno se repara, esos tests pasarán y Playwright los marcará
**unexpectedly passed** (rojo): la suite avisa sola que hay que promoverlos a
estables.

Para la sustentación: `npm run test:stable` es la señal de calidad
(todo verde); `npm run test:bugs` es la evidencia de bugs (cada ✘ abre su
hallazgo con adjuntos en el reporte HTML).

## Reporte y evidencias

**Herramienta: el reporter HTML nativo de Playwright** (decisión deliberada
sobre Allure). Razones:

- **Cero dependencias para quien evalúa**: `npm run report` abre el reporte sin
  instalar Java ni CLIs extra — reproducibilidad máxima, que es criterio del reto.
- **Evidencia integrada**: cada escenario es una fila con trace interactivo,
  screenshots, video y los adjuntos de divergencias de contrato. Todo viaja en
  una sola carpeta auto-contenida (`playwright-report/`, publicable como
  artefacto de CI).
- **Allure** aporta valor cuando hay histórico/tendencias y dashboards para
  stakeholders; para una suite de 26 escenarios sin servidor de reportes, es
  sobrecoste (Java + generación) sin beneficio demostrable aquí.

Artefactos por ejecución:

| Artefacto | Ruta | Contenido |
|---|---|---|
| Reporte HTML | `playwright-report/` | 26 escenarios, duraciones, adjuntos, fallos |
| Evidencias de fallo | `test-results/` | trace.zip, screenshots, video, error-context |
| Lista de escenarios | `npm run scenarios` | los 26 títulos con su archivo y línea |

## Los 26 escenarios

La carpeta `tests/` tiene **8 archivos pero 26 escenarios**: los casos
data-driven (matriz de validación, parametrizados) se generan desde datasets
tipados — es la práctica estándar para no duplicar 13 archivos con el mismo
cuerpo. La visibilidad completa está en tres lugares:

1. **`docs/escenarios.md`** — matriz numerada 01-26 con archivo y estado.
2. **`npm run scenarios`** — lista los 26 con su ubicación exacta.
3. **El reporte HTML** — cada escenario aparece como fila independiente.

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

- **Smoke (bloquea PR)**: `tests/api` + `tests/ui/01-book-room-ui-verify-api.spec.ts`
  — alta, rechazo y flujo integrado. `npx playwright test tests/api tests/ui/01-book-room-ui-verify-api.spec.ts`.
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
