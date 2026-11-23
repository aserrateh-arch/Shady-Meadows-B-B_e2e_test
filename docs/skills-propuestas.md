# Skills propuestas (no implementadas)

Además de las implementadas (`api-contract-testing`, `oracle-testing`,
`synthetic-data` + agente `qa-orchestrator`), propondría estas tres.

## 1. contract-diff-reporter

- **Propósito**: derivar el oráculo desde una fuente formal (colección Postman /
  OpenAPI) y generar el reporte de divergencias contrato↔comportamiento de
  forma automática por endpoint.
- **Usuario**: QE y desarrolladores al integrar una API nueva o al versionar una existente.
- **Entradas**: URL/archivo de la colección Postman u OpenAPI; lista de endpoints en scope.
- **Salidas**: `Divergence[]` por endpoint + `docs/hallazgos.md` actualizado + spec de
  bugs conocidos (`test.fail()`) generado.
- **Verificación**: el spec generado compila (`npm run typecheck`) y cada divergencia
  queda con esperado/observado/evidencia.
- **Prioridad**: **ALTA — construiría esta primero.** En esta misma prueba, tres de los
  cuatro bugs se encontraron comparando a mano el contrato con el comportamiento;
  automatizar esa comparación convierte horas de exploración en un artefacto repetible.
- **Utilidad medible**: n.º de divergencias detectadas por release sin esfuerzo manual;
  tiempo de redacción de hallazgos antes/después.
- **Script vs skill**: la extracción del contrato (Postman JSON → tipos) es un script
  puro; el juicio de "¿es bug o comportamiento aceptable?" es lo que queda en la skill.

## 2. data-cleanup-hygiene

- **Propósito**: estrategia de higiene de datos para entornos compartidos: teardown de
  registros creados por la suite (vía API admin), detección de residuos y cuarentena de
  tests que ensucian el entorno.
- **Usuario**: todo el equipo; corre como paso post-suite (CI o local).
- **Entradas**: manifiesto de recursos creados por test (fixture que registra bookingids);
  credenciales admin.
- **Salidas**: entorno sin residuos + reporte de tests que no limpiaron.
- **Verificación**: segundo run consecutivo verde y conteo de reservas del entorno
  estable entre ejecuciones.
- **Prioridad**: media. En este proyecto la demo se reinicia sola y los datos son
  sintéticos únicos; una **fixture** de registro+teardown resuelve el 80 % — la skill
  tendría sentido cuando haya ambientes persistentes compartidos por varios equipos.

## 3. e2e-gate-integrator

- **Propósito**: conectar resultados de Playwright con gates de pipeline: clasificar
  specs en `smoke` / `regression` (tags), publicar reporte HTML como artefacto y fallar
  el gate según política (smoke roto = bloquea; expected-fail conocido = no bloquea).
- **Usuario**: dev que abre PR; CI.
- **Entradas**: `test-results/results.json`, política de gates (umbrales, tags).
- **Salidas**: exit code semántico + resumen en PR (casos, riesgos, evidencias).
- **Verificación**: PR de prueba con fallo intencional bloqueado; PR verde aprobado.
- **Prioridad**: media-alta. Es lo que convierte "las pruebas pasan en mi máquina" en
  señal de calidad del equipo. La parte de clasificación/reporte es script; la política
  de qué bloquea (riesgo de negocio) es decisión humana asistida por la skill.

### Cuál primero y por qué

**contract-diff-reporter** primero: es la que más esfuerzo repetitivo elimina del flujo
que este proyecto ya hace a mano (registrar divergencias contrato↔comportamiento), y
alimenta directamente el oráculo y los bugs conocidos. Su éxito se mide en divergencias
detectadas automáticamente y en tiempo ahorrado por release.
