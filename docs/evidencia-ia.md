# Evidencia de uso de IA

Fecha: 2026-11-23 · Agente: Kimi Code (CLI) · Humano supervisor: autor del repo.

## Invocación

Las skills y el agente orquestador se escribieron y **commitearon primero**
(commit `skills y agente orquestador`), y la implementación de la suite se
hizo siguiéndolos (commit posterior). El prompt de trabajo dado al agente fue,
en síntesis:

> Implementa la suite de pruebas del reto siguiendo `agents/qa-orchestrator/AGENT.md`:
> canal `api` (éxito parametrizado x2 y negativo) con `api-contract-testing`,
> `synthetic-data` y `oracle-testing`; canal `ui+api` integrado; canal `api→ui`
> (agendar por API y verificar el reflejo en el front); y una prueba con mock
> enfocada al fallo. Todo contra el backend real salvo el mock declarado.

Las skills usadas por escenario:

| Escenario | Skills aplicadas |
|---|---|
| API éxito (x2) / API negativa | `api-contract-testing` + `synthetic-data` + `oracle-testing` |
| Integración UI + API | `qa-orchestrator` (POM+Flows+fixtures) + las tres anteriores |
| API → UI (reflejo en calendario) | `api-contract-testing` + `oracle-testing` (oráculo de efectos) |
| Mock de fallo (500 simulado) | `mock-resilience-testing` + `oracle-testing` (oráculo de UI ante fallo) |
| Resiliencia (latencia, corte, doble clic) | `mock-resilience-testing` + verificación por API |

## Cambios producidos por el agente

- Scaffold completo (config, tsconfig, scripts), clientes API, oráculo,
  fábrica de datos, POMs, flow, fixtures y 10 pruebas.
- Documentación (`README`, hallazgos, casos priorizados, skills propuestas).

## Ejecución

- `npm run typecheck` → exit 0.
- `npx playwright test --workers 2` → **10/10** (6 estables verdes +
  4 fallos esperados documentados como bugs del entorno). Reporte en
  `playwright-report/`, evidencias por fallo en `test-results/`.

## Correcciones humanas / de supervisión (justificadas)

1. **Punto de entrada del entorno**: el enunciado enlaza
   `automationintesting.online`, no el histórico `.com` (retirado). El agente
   lo detectó al sondear el DOM (home sin habitaciones) y extrajo los
   hyperlinks reales del `.docx`. *Sin esta corrección toda la suite apuntaba
   a un sitio muerto.*
2. **Dirección de alcance**: el supervisor pidió explícitamente skills
   separadas (API, oráculo, data) + agente orquestador, el escenario API→UI y
   la prueba de mock de fallo. El agente los implementó sin debilitar
   aserciones.
3. **Revisión de aserciones**: se verificó que ninguna expectativa se derivó
   del comportamiento observado a posteriori. Las divergencias reales
   (BUG-01…04) quedaron como `test.fail()` documentado, no como aserciones
   relajadas.
4. **Workaround acotado**: ante BUG-01 (UI de reserva imposible), se aprobó
   interceptar **solo** la lectura de habitación con datos reales del listado,
   manteniendo alta y verificación contra el backend real. Queda marcado en
   código (`roomDetailWorkaround`) y en `docs/hallazgos.md`, con test que
   avisará cuando pueda retirarse.

## Lo que NO se ocultó

- 4 bugs del entorno documentados con pasos/esperado/observado.
- El escenario API→UI queda bloqueado por entorno (fallo esperado), no
  "adaptado para pasar".
- El contrato documentado de eco completo (email/phone) no se cumple: está en
  BUG-03, no se eliminó la verificación del oráculo.
