# Casos priorizados (documentados, no automatizados)

Tres casos que priorizaría a continuación, con el riesgo que cubre cada uno.

## 1. Conflicto de disponibilidad (doble reserva del mismo rango)

- **Qué**: intentar crear por API una reserva cuyas fechas solapan una
  existente en la misma habitación; esperar 409 y cero solapamiento persistido.
  Variante UI: dos sesiones concurrentes reservando el mismo rango.
- **Riesgo que cubre**: el invariante de negocio más crítico de un sistema de
  reservas — sobreventa de habitaciones. Un fallo aquí es pérdida directa de
  dinero y confianza. Además el mensaje actual (`Failed to create booking`)
  no distingue conflicto de error interno: habría que verificar que el front
  comunica "no disponible" y no "error".

## 2. Fronteras de fechas (mismo día, checkout = checkin ajeno, pasado)

- **Qué**: matriz de bordes — checkout de una reserva = checkin de la siguiente
  (debe permitirse), checkin = checkout (debe rechazarse), fechas pasadas,
  estancia de 1 noche, estancias largas (30+ noches).
- **Riesgo que cubre**: la lógica de intervalos [checkin, checkout) es el
  punto típico de off-by-one. Una habitación que no se puede reservar el día
  de checkout del huésped anterior es inventario perdido; el caso inverso es
  sobreventa. La demo ya mezcla convenciones (`report` usa start/end, la API
  checkin/checkout), lo que aumenta el riesgo.

## 3. Seguridad de endpoints autenticados (IDOR / escalación)

- **Qué**: sin token y con token de otro contexto, intentar: listar reservas
  (`GET /api/booking?roomid=N`), ver reportes (`/api/report`), y modificar o
  borrar reservas ajenas (`PUT/DELETE /api/booking/{id}`). Verificar 401/403
  y que el token expira/renueva.
- **Riesgo que cubre**: exposición de datos personales de huéspedes
  (nombre, email, teléfono — PII sujeta a privacidad). Hoy el listado exige
  auth (bien), pero BUG-02/03 impiden verificar si `GET /booking/{id}` filtra
  PII al estar roto. Es el caso de mayor impacto regulatorio.

> Criterio de orden: 1 y 2 protegen el dinero del negocio; 3 protege al
> huésped y al cumplimiento. El 3 escala en severidad si la plataforma se usa
> con datos reales.
