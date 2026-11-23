# Hallazgos — diferencias entre contrato documentado y comportamiento observado

Entorno: `https://automationintesting.online` (demo pública compartida de
Restful Booker Platform). Contrato de referencia: colección Postman
"Restful Booker Platform" enlazada en el enunciado.
Fecha de observación: 2026-11-23. Todos reproducibles de forma consistente
(no transitorios; verificados por curl y por la suite).

---

## BUG-01 — `GET /api/room/{id}` responde 500 para toda habitación

- **Pasos**: `curl https://automationintesting.online/api/room/1`
  (probado con ids 1, 2, 3, reintentos, headers de navegador y trailing slash).
- **Esperado (contrato)**: 200 con el detalle de la habitación.
- **Observado**: 500 `Internal Server Error` (texto plano, no JSON).
- **Impacto**: la página de reserva de la UI (`/reservation/{id}`) hace
  `fetch('/api/room/{id}')` al montar y revienta con `SyntaxError` al parsear
  el 500 — queda en spinner infinito. **La reserva por UI es imposible sin
  workaround.**
- **Evidencia**: `tests/bugs/01-known-bugs.spec.ts` (BUG-01 y su impacto UI),
  `test-results/` de la ejecución.

## BUG-02 — `GET /api/booking/{id}` responde 500 (con y sin autenticación)

- **Pasos**: crear una reserva (201, `bookingid` válido) y luego
  `GET /api/booking/{id}` con `Cookie: token=...` válido.
- **Esperado (contrato)**: 200 con la reserva completa.
- **Observado**: 500 `Internal Server Error`.
- **Impacto**: la consulta individual documentada no es usable. La suite
  verifica identidad con `GET /api/booking?roomid=N` (operativo con auth).

## BUG-03 — El alta de reserva no devuelve `email` ni `phone`

- **Pasos**: `POST /api/booking` con payload completo e inspeccionar la respuesta.
- **Esperado (contrato)**: eco de la reserva incluyendo `email` y `phone`.
- **Observado**: la respuesta incluye `bookingid`, `roomid`, `firstname`,
  `lastname`, `depositpaid`, `bookingdates` — omite `email` y `phone`.
  Tampoco los expone `GET /api/booking?roomid=N`.
- **Impacto**: no es posible verificar por API los datos de contacto del
  huésped; la verificación cruzada UI→API usa nombre + apellido + fechas.

## BUG-04 — `GET /api/report/room/{id}` responde 500

- **Pasos**: `curl https://automationintesting.online/api/report/room/1`.
- **Esperado**: 200 con los rangos ocupados de la habitación (el front lo usa
  para pintar el calendario; ver `BookingForm.tsx` del repo).
- **Observado**: 500.
- **Impacto**: el calendario de la UI nunca muestra ocupación; el escenario
  "API → UI" (agendar por API y ver el bloqueo en el front) queda bloqueado
  por entorno y corre como fallo esperado (`test.fail()`).

## BUG-05 — La UI no informa nada ante un corte de conexión en el alta
- **Pasos**: mock de red (`route.abort('connectionfailed')`) sobre el POST
  `/api/booking` durante una reserva por UI; observar la pantalla.
- **Esperado (UX)**: mensaje de error visible para el usuario.
- **Observado**: el `submitBooking` del front solo hace `console.error` en el
  `catch` (`BookingForm.tsx`): no hay alerta, ni spinner detenido, ni retry.
  La pantalla queda en el formulario sin feedback alguno.
- **Impacto**: el usuario no sabe si reservó o no; riesgo de doble envío
  manual. Nota: tampoco existe guard de doble clic en "Reserve Now".
- **Evidencia**: `tests/ui/04-resilience.spec.ts` (fallo esperado).

## BUG-06 — El backend acepta reservas con check-in en el pasado

- **Pasos**: `POST /api/booking` con `bookingdates.checkin` = 2020-01-01.
- **Esperado (negocio)**: 400 de validación.
- **Observado**: 201 Created, la reserva queda persistida.
- **Evidencia**: `tests/api/03-validation-matrix.spec.ts` (fallo esperado).

## BUG-07 — El backend acepta teléfonos no numéricos

- **Pasos**: `POST /api/booking` con `phone: "abcdefghijk"` (11 caracteres).
- **Esperado (negocio)**: 400 de validación de formato.
- **Observado**: 201 Created. El contrato Postman solo exige tamaño 11–21, así
  que es divergencia de regla de negocio, no de contrato estricto.
- **Evidencia**: misma spec (fallo esperado).

## BUG-08 — Fechas invertidas o iguales responden 409 genérico

- **Pasos**: `POST /api/booking` con checkout < checkin, o checkin == checkout.
- **Esperado**: 400 con mensaje de validación de fechas.
- **Observado**: 409 `{"error":"Failed to create booking"}` — semántica de
  status incorrecta y mensaje indistinguible de un conflicto de disponibilidad.
- **Impacto**: el front (y cualquier consumidor) no puede diferenciar "fechas
  inválidas" de "habitación ocupada" (ver BUG-09).

## BUG-09 — Doble clic en "Reserve Now" revienta la aplicación

- **Pasos**: mock de latencia (3 s) en el POST `/api/booking`; doble clic en
  "Reserve Now" antes de que llegue la primera respuesta.
- **Esperado**: guard de doble envío (botón deshabilitado); una sola reserva.
- **Observado**: se envían 2 POST. El primero crea la reserva (201); el segundo
  choca por conflicto (409) con cuerpo `{"error": ...}` **sin** propiedad
  `errors`. El front hace `setBookingErrors(errorData.errors)` → `undefined`,
  y el render revienta en `bookingErrors.length`: la app entera cae en la
  página de error "This page couldn't load". La reserva SÍ quedó creada,
  pero el usuario ve una pantalla rota y probablemente reintentará
  (riesgo de reservas duplicadas por reintento manual).
- **Evidencia**: `tests/ui/04-resilience.spec.ts` (fallo esperado),
  `error-context.md` de la ejecución.

## BUG-10 — `bookingdates` null o ausente cuelga el endpoint (sin respuesta HTTP)

- **Pasos**: `POST /api/booking` con `bookingdates: null` o sin la propiedad.
- **Esperado (contrato)**: 400 con mensaje de validación.
- **Observado**: el servidor **nunca responde** — la conexión queda colgada
  hasta timeout/reset (verificado con curl y con Playwright, timeout 10 s).
  Ni siquiera hay status HTTP.
- **Impacto**: el más grave de los encontrados — un payload malformado deja
  conexiones colgadas (riesgo de agotamiento de recursos / DoS accidental) y
  cualquier consumidor queda esperando indefinidamente.
- **Evidencia**: `tests/api/03-validation-matrix.spec.ts` (2 fallos
  esperados, ~10 s cada uno por el timeout de la llamada).

## Divergencias menores (no bug, comportamiento a conocer)

- Las rutas con trailing slash (`/api/room/`, `/api/booking/`) responden 308
  al path sin slash; en redirects los headers `Cookie` se pierden (los
  clientes del proyecto usan paths sin slash).
- La creación con fechas solapadas responde 409 `Failed to create booking`
  (mensaje genérico, sin detalle del conflicto).

## Workaround adoptado (explícito y acotado)

`roomDetailWorkaround` (fixture en `src/fixtures/test.fixtures.ts`): intercepta
**solo** `GET /api/room/{id}` y lo sirve con los datos reales obtenidos en vivo
de `GET /api/room`. El alta (POST /api/booking) y toda la verificación posterior
siguen contra el backend real. Se eliminará cuando BUG-01 se repare; el test
"BUG-01 (impacto UI)" lo detectará automáticamente.
