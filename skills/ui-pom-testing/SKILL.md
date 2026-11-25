---
name: ui-pom-testing
description: Convenciones de Page Object Model estricto y pirámide de locators para las pruebas UI de Restful Booker Platform. Usar cuando se creen o modifiquen Page Objects, locators, o escenarios UI; define qué puede vivir en un POM y qué no.
---

# Skill: ui-pom-testing

## Propósito
Mantener la capa de páginas pura y los locators resilientes. Un POM es la
traducción de una pantalla a código — nunca un lugar donde decidir si el
negocio funciona.

## Entradas
- La página/componente a modelar (con su DOM real o el código fuente del front).
- La interacción de negocio que se quiere exponer a los flows.

## Reglas duras del POM estricto

1. **El POM solo expone locators y acciones.** Prohibido `expect(...)` de
   negocio dentro de un page object: las aserciones viven en los specs.
2. **Sincronización operativa, no aserciones disfrazadas**: si una acción
   necesita que la UI esté lista, usa `waitFor({ state: 'visible' })` —
   nunca `waitForTimeout` ni esperas fijas.
3. **Lógica de interacción sí pertenece** (cómo navegar el calendario, cómo
   abrir el formulario en dos pasos): es el "cómo operar la página".
4. **Lógica de negocio no pertenece** (qué fechas son válidas, qué texto de
   confirmación es correcto): eso va en el spec u oráculo.
5. Los locators son `readonly` y públicos: el spec puede asertar sobre ellos
   sin que el POM decida por él.
6. Cambio de UI = cambio en el POM (un solo lugar). Prohibido parchear el
   spec con un locator nuevo.

## Pirámide de locators (orden de prioridad obligatorio)

1. **`getByRole` + nombre accesible** (rol, aria-label, texto visible del
   control) — primera opción siempre.
2. **`getByLabel` / `getByPlaceholder` / `getByText`** — cuando el rol no
   aplica o el nombre accesible no es único.
3. **Atributos funcionales semánticos** (`input[name]`, `a[href^=...]`) —
   solo si no son generados ni posicionales.
4. **Clases CSS / estructura** — último recurso, solo clases semánticas de
   librerías (`.rbc-*`, `.alert-danger`); prohibidos hashes generados,
   XPath posicional y selectores por índice.
5. **`data-testid`** — el ideal cuando el equipo de front lo provee; si falta,
   es deuda de testabilidad a negociar con desarrollo (documentarla).

## Pasos
1. Inspecciona el DOM real (o el código fuente del front) y elige el locator
   más alto posible en la pirámide. Justifica en comentario si usas nivel 4.
2. Declara locators en el constructor como `readonly`.
3. Expón acciones de interacción con nombres de negocio (`openGuestForm`,
   `fillGuestForm`), no de mecánica (`clickButton1`).
4. Si necesitas verificar estado, expón el locator y deja el `expect` al spec.
5. Ejecuta los escenarios UI que usan el POM antes de dar por terminado.

## Verificación
```bash
npm run typecheck
npm run test:ui        # escenarios UI estables verdes
```

## Criterios de éxito
- Ningún `expect` de negocio dentro de `src/pages/`.
- Ninguna espera fija (`waitForTimeout`) en el proyecto.
- Todo locator nuevo está en el nivel más alto posible de la pirámide.

## Ante errores o información insuficiente
- Si el front no ofrece hook accesible: usa el nivel más alto disponible y
  documenta la deuda de testabilidad (pedir `data-testid` a desarrollo).
- Si un locator se rompe por cambio de UI: se corrige en el POM, nunca en
  el spec.
