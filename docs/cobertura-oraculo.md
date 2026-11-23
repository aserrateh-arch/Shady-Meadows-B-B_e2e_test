# Cobertura del oráculo — qué falta para cazar los bugs a completitud

Estado actual: los oráculos cazan todo lo que está **codificado como contrato o
regla de negocio explícita**. Los 9 hallazgos demuestran los dos mundos:

- **Cazados por oráculo desde el diseño**: BUG-03 (eco incompleto), toda la
  matriz de validación estricta, no-persistencia en rechazos, integridad
  UI↔API.
- **Descubiertos explorando y luego blindados**: BUG-01/02/04 (endpoints 500),
  BUG-05/09 (UX ante fallos), BUG-06/07/08 (reglas no enforced).

Para que la caza sea completa *sin exploración manual*, faltan cinco piezas:

## 1. Contrato machine-readable como fuente del oráculo

Hoy el contrato se codificó a mano leyendo la colección Postman. Si la doc
cambia, el oráculo no se entera. Falta: derivar los `check*` desde la colección
/OpenAPI (skill propuesta `contract-diff-reporter`). Con eso, BUG-02/03 se
habrían generado solos al primer run.

## 2. Validación de esquema exhaustiva por endpoint

**Implementada** (`src/oracle/schema.checker.ts` + `contracts.ts`): campos
requeridos, tipos, nulabilidad, formatos (ISO date, email), detección de campos
inesperados y contrato de headers (`content-type: application/json`), aplicados
en alta, rechazo y esquema documentado completo (BUG-03). Pendiente: cubrir
todos los endpoints restantes (room, report, auth) con la misma rigurosidad.

## 3. Derivación sistemática de casos negativos

La matriz de validación nació de leer constraints a mano. Cada constraint del
contrato (min/max, formato, obligatoriedad) debería generar su caso negativo
automáticamente. BUG-06/07/08 habrían aparecido el primer día con una matriz
derivada, no escrita.

## 4. Oráculos no funcionales

- **Seguridad**: matriz auth — cada endpoint protegido probado sin token y con
  token inválido (401/403). Hoy solo el uso legítimo está cubierto.
- **Performance**: budget de latencia por endpoint (p95) como aserción.
- **Idempotencia**: reenvío del mismo payload (lo que BUG-09 expone en UI).

## 5. Oráculo de salud del entorno y de UX estructural

- **Contract health**: un smoke que golpee *cada* endpoint documentado
  verificando status + esquema mínimo habría cazado BUG-01/02/04 en segundos
  (hoy `tests/bugs/` lo hace, pero como consecuencia, no como descubrimiento).
- **UX estructural**: regla "toda mutación async tiene feedback visible ante
  éxito, error y red" habría cazado BUG-05/09 sin leer el código fuente del
  front. Es formalizable como checklist de oráculo de UI en `oracle-testing`.

## Prioridad pragmática

1 y 5 (health) dan el mayor salto de cobertura por esfuerzo: un endpoint roto
se detecta antes de escribir un solo test de negocio. 3 es la que más bugs de
negocio nuevos descubriría en este sistema concreto.
