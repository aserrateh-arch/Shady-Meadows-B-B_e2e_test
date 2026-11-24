# Caso candidato: formulario de contacto ("Send Us a Message")

> **Estado**: documentado, NO automatizado. Vive en la rama
> `docs/caso-contacto` — fuera del alcance mínimo del reto, que prioriza la
> reserva de habitación. Se promovería a `main` solo si se decide ampliar
> cobertura.

## Origen

Descubierto durante la exploración del home (`/`): sección "Send Us a
Message" con campos nombre, email, teléfono, asunto y mensaje. No aparece en
el enunciado del reto.

## Sonda del endpoint (2026-11-24, ambiente real)

- `POST /api/message` con payload válido → **200** `{"success": true}`
- `POST /api/message` con payload inválido → **400** con array de mensajes:
  `["Message may not be blank","Message must be set","Name may not be blank",
  "Subject must be set","Phone may not be blank",
  "must be a well-formed email address", ...]`

El endpoint es funcional y valida. Nota de contrato: responde 200 (no 201)
porque no crea un recurso consultable — no hay GET público de mensajes (el
listado es del panel admin, `GET /api/message` con auth).

## Riesgo que cubriría

1. **Canal de comunicación con clientes**: un fallo silencioso aquí = leads
   perdidos sin que nadie lo note (a diferencia de la reserva, no hay
   confirmación transaccional que alerte).
2. **PII y abuso**: el formulario recolecta datos personales y es un punto de
   entrada público sin autenticación — candidato a validaciones de formato,
   longitud, y (en un sistema real) rate limiting / anti-spam.
3. **Consistencia UI↔API**: el front valida en cliente; verificar que el
   backend enforce las mismas reglas (ya sabemos por BUG-06/07 que el backend
   no siempre enforce lo que el front sugiere).

## Escenarios propuestos (si se implementa)

| # | Escenario | Oráculo |
|---|---|---|
| C1 | Enviar mensaje válido | 200 + `{"success": true}` |
| C2 | Matriz de validación (nombre/email/phone/asunto/mensaje vacíos o mal formados) | 400 + mensaje por campo |
| C3 | UI: enviar por el formulario y verificar confirmación en pantalla | Toast/alerta de éxito visible |
| C4 | UI→API cruzado: enviar por UI y verificar en el panel admin por API | Mensaje presente con los datos exactos |

Encaja sin fricción en la arquitectura: `MessageClient` en `src/api/`,
esquema en `src/oracle/contracts.ts`, `MessageSection` como componente del
POM del home, y los mismos patrones de oráculo/no-persistencia.

## Por qué quedó fuera del alcance mínimo

El enunciado pide explícitamente "prioriza el alcance mínimo sobre
funcionalidades adicionales" y el alcance es la reserva. Documentar y sondear
el endpoint (hecho) demuestra exploración del sistema sin incurrir en
scope creep.
