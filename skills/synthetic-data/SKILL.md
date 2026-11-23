---
name: synthetic-data
description: Genera datos sintéticos trazables (huéspedes, fechas) para las pruebas de Restful Booker Platform. Usar cuando un test necesite datos de huésped, emails/teléfonos válidos o ventanas de fechas libres; prohíbe datos hardcodeados y compartidos entre tests.
---

# Skill: synthetic-data

## Propósito
Cada test crea sus propios datos: únicos por ejecución (trazables al debuggear
la demo compartida), válidos según las reglas de la API, y sin dependencias de
datos preexistentes (la demo se reinicia).

## Entradas
- Tipo de dato: `GuestData` (huésped) o `DateWindow` (fechas).
- Overrides opcionales para escenarios negativos (ej. email inválido, phone corto).

## Reglas de validez del dominio (observadas en la API)
- `firstname`/`lastname`: solo letras, sin espacios ni dígitos.
- `email`: formato email válido; usamos dominio `example.com` (RFC 2606).
- `phone`: mínimo 11 dígitos numéricos.
- Fechas: ISO `YYYY-MM-DD`, check-in futuro, checkout posterior al check-in,
  y la ventana NO puede solapar reservas existentes (409).

## Pasos
1. Huésped nuevo → fixture `guest` (inyectada; prepara `buildGuest()` ANTES
   del test). Fechas libres → fixture `freeWindow` (calcula la ventana desde
   la ocupación real ANTES del test, via `findFreeWindow()` de
   `src/data/date.utils.ts`).
2. Escenario negativo → spread sobre la fixture: `{ ...guest, phone: '123' }`
   u omitir el campo en el payload.
3. Solo se usa `buildGuest()` / `findFreeWindow()` directo en el test cuando el
   escenario necesita una variante que la fixture no modela (ej. una segunda
   ventana de visualización desplazada).
4. Parametrización: define datasets como constantes tipadas al inicio del spec
   (ej. depósito pagado / sin depósito) e itera con `for...of` + `test.describe`.

## Convenciones
- **La preparación de datos vive en fixtures, no en el cuerpo del test**:
  `guest`, `freeWindow` y `roomUnderTest` se resuelven antes de que el test
  arranque (equivalente a hooks `beforeEach` declarativos). El test solo
  declara intención y oráculos.
- La data se construye en la fábrica o en utils de `src/data/`, nunca inline
  en el test salvo el override explícito del escenario.
- Sin librerías externas de fake data: los datos deben ser deterministas y
  trazables (decisión documentada en README).
- El dato sintético NO define la expectativa: el oráculo compara lo persistido
  contra lo enviado, sea cual sea el valor generado.

## Verificación
```bash
npm run typecheck
npx playwright test --workers 2   # dos ejecuciones seguidas deben pasar (unicidad)
```

## Criterios de éxito
- Dos ejecuciones consecutivas pasan sin colisiones ni residuos.
- Ningún literal de persona/email/teléfono/fecha hardcodeado en `tests/`.

## Ante errores o información insuficiente
- Si la API rechaza un dato generado: revisa las reglas de validez arriba y
  ajusta la FÁBRICA, no el test. Si el rechazo contradice la documentación,
  repórtalo vía skill oracle-testing.

## Salidas
- Fixtures `guest` y `freeWindow` resueltas antes de cada test.
- Datasets tipados para parametrización.
- Cero literales de datos en `tests/`.

## Limitaciones
- No hay teardown de los datos creados (la demo se reinicia sola; en un
  entorno persistente haría falta la skill propuesta `data-cleanup-hygiene`).
- La unicidad por timestamp no es garantía absoluta entre máquinas que
  ejecuten en el mismo milisegundo (riesgo aceptado para una demo).
