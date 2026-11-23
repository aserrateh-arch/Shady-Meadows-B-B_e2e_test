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
- **Evidencia**: `tests/bugs/known-bugs.spec.ts` (BUG-01 y su impacto UI),
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
