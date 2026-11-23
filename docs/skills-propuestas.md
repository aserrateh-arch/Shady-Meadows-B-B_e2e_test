# Skills propuestas (no implementadas)

Además de las implementadas (`api-contract-testing`, `oracle-testing`,
`synthetic-data` + agente `qa-orchestrator`), propondría estas cuatro (las tres primeras + visual-regression-testing como demostración de alcance).

## 1. contract-diff-reporter

- **Propósito**: derivar el oráculo desde una fuente formal (colección Postman /
  OpenAPI) y generar el reporte de divergencias contrato↔comportamiento de
  forma automática por endpoint.
- **Usuario**: QE y desarrolladores al integrar una API nueva o al versionar una existente.
- **Entradas**: URL/archivo de la colección Postman u OpenAPI; lista de endpoints en scope.
- **Salidas**: `Divergence[]` por endpoint + `docs/hallazgos.md` actualizado + spec de
  bugs conocidos (tag `@known-bug`) generado.
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

## 4. visual-regression-testing

- **Propósito**: detectar regresiones visuales de la UI comparando screenshots
  contra una línea base aprobada — o contra nodos de referencia exportados de
  Figma cuando exista diseño formal.
- **Usuario**: QE y frontend; corre en regresión, nunca como smoke (es
  sensible por naturaleza).
- **Entradas**: páginas/estados a cubrir (home, tarjeta de habitación,
  formulario de reserva, confirmación), referencias visuales (baselines
  aprobadas o PNG exportados de nodos Figma), viewports objetivo, umbrales de
  tolerancia (`maxDiffPixelRatio`), lista de elementos dinámicos a enmascarar
  (fechas, precios, datos del huésped sintético).
- **Salidas**: diff visual por escenario (actual / expected / diff heatmap),
  veredicto por umbral, y flujo de actualización de baseline SOLO con
  aprobación humana.
- **Verificación**: dos ejecuciones consecutivas sin cambios deben dar 0 diffs;
  un cambio intencional de UI debe ser detectado y aprobado explícitamente.
- **Prioridad**: media. Es la primera propuesta que requiere madurez previa:
  app visualmente estable y referencias de diseño. Sin Figma ni diseño formal,
  el baseline lo define la primera ejecución aprobada.
- **Cómo se implementaría (Playwright nativo, sin dependencias nuevas)**:
  ```ts
  await expect(page).toHaveScreenshot('home.png', {
    maxDiffPixelRatio: 0.01,      // umbral de tolerancia
    animations: 'disabled',       // anti-flake
    mask: [page.locator('.rbc-calendar')], // zonas dinámicas fuera del diff
  });
  ```
  Con Figma: exportar el nodo de referencia como PNG (`GET
  /v1/images/:fileKey?ids=<nodeId>` de la API de Figma) y usarlo como baseline
  del snapshot, o compararlo con `pixelmatch` en un paso previo.
- **Utilidad medible**: regresiones visuales detectadas antes de producción
  vs. escapes reportados; falsos positivos por flake visual (meta: <2 %).
- **Script vs skill**: la captura y comparación las hace Playwright solo; la
  skill gobierna la disciplina: umbrales por página, qué se enmascara, cuándo
  y quién aprueba una actualización de baseline (`--update-snapshots`
  bloqueado en CI), y cómo versionar las referencias de Figma.

### Cuál primero y por qué

**contract-diff-reporter** primero: es la que más esfuerzo repetitivo elimina del flujo
que este proyecto ya hace a mano (registrar divergencias contrato↔comportamiento), y
alimenta directamente el oráculo y los bugs conocidos. Su éxito se mide en divergencias
detectadas automáticamente y en tiempo ahorrado por release.
