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
1. Huésped nuevo → `buildGuest()` de `src/data/guest.factory.ts`
   (timestamp en base36 + aleatorio = único por ejecución y por test).
2. Escenario negativo → `buildGuest({ phone: '123' })` u omitir el campo en el payload.
3. Fechas → `findFreeWindow(await api.report.bookedRanges(roomId))` de
   `src/data/date.utils.ts`. Nunca `new Date()` suelto en tests ni fechas literales.
4. Parametrización: define datasets como constantes tipadas al inicio del spec
   (ej. depósito pagado / sin depósito) e itera con `for...of` + `test.describe`.

## Convenciones
- La data se construye en la fábrica o en utils de `src/data/`, nunca inline en el test
  salvo el override explícito del escenario.
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
