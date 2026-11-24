# Guía detallada de la automatización — desde cero

> Documento para alguien que **nunca ha usado Playwright**. Explica qué se
> construyó, pieza por pieza, por qué existe cada una y cómo se conectan.
> Léelo en orden: cada sección usa solo lo explicado antes.

---

## 1. ¿Qué es Playwright?

Playwright es un framework de pruebas creado por Microsoft. Su fama viene de
automatizar navegadores (UI), pero tiene **dos motores**:

1. **Motor de navegador**: abre un Chrome/Firefox real, hace clics, llena
   formularios, lee la pantalla — como un robot que usa la aplicación.
2. **Motor de API (`APIRequestContext`)**: hace llamadas HTTP directas
   (GET, POST...) sin abrir navegador, como haría Postman pero desde código.

Esta automatización usa **ambos motores**, y esa es una de sus fortalezas:
probar lo que ve el usuario (UI) y lo que responde el servidor (API) con la
misma herramienta, el mismo lenguaje (TypeScript) y el mismo reporte.

Conceptos mínimos para seguir el documento:

- **Test (spec)**: un archivo con escenarios de prueba (`*.spec.ts`).
- **`test(...)`**: define un escenario: qué hace y qué verifica.
- **`expect(...)`**: una aserción — "espero que esto sea así". Si no se cumple,
  el test falla.
- **Locator**: la forma de encontrar un elemento en la pantalla (un botón, un
  campo de texto) sin usar coordenadas frágiles.
- **Fixture**: preparación automática que ocurre ANTES de cada test (equivalente
  a un "setup"): abrir la conexión, autenticarse, generar datos.
- **Reporte**: al terminar, Playwright genera un HTML interactivo con el
  resultado de cada escenario, fotos, videos y trazas.

---

## 2. ¿Qué se automatizó?

El sistema bajo prueba es **Restful Booker Platform**
(`https://automationintesting.online`): un sitio demo de un hotel ("Shady
Meadows B&B") donde se reservan habitaciones. Tiene:

- Una **UI web**: página con habitaciones → "Book now" → calendario →
  formulario del huésped → confirmación.
- Una **API REST**: endpoints para crear reservas (`POST /api/booking`),
  consultarlas (`GET /api/booking?roomid=N`), listar habitaciones
  (`GET /api/room`), autenticarse (`POST /api/auth/login`).

Se construyeron **26 escenarios de prueba** que cubren tres canales:

| Canal | Qué prueba | Ejemplo |
|---|---|---|
| **API** | El servidor directamente | Crear reserva por HTTP y verificarla |
| **UI** | La pantalla como la usa una persona | Reservar con clics y ver "Booking Confirmed" |
| **Integración UI↔API** | Que ambos canales cuenten la misma verdad | Reservar por UI y comprobar ese mismo registro por API |

---

## 3. El mapa del proyecto

```
restful-booker-automation/
├── playwright.config.ts   ← configuración del runner
├── package.json           ← comandos npm y dependencias
├── src/
│   ├── api/               ← clientes HTTP (una clase por recurso)
│   ├── data/              ← fábrica de datos sintéticos + cálculo de fechas
│   ├── oracle/            ← "qué es correcto": contratos y validadores
│   ├── pages/             ← Page Objects: la UI traducida a código
│   ├── flows/             ← flujos de negocio completos (UI y API)
│   ├── verification/      ← cómo consultar el estado guardado
│   └── fixtures/          ← la preparación automática de cada test
├── tests/                 ← SOLO escenarios (declarativos, sin mecánica)
│   ├── api/               ← 16 escenarios de API
│   ├── ui/                ← 6 escenarios de UI/integración
│   └── bugs/              ← 4 escenarios del contrato roto del entorno
├── skills/                ← 4 guías (SKILL.md) para que un agente de IA
│                            escriba pruebas siguiendo nuestras reglas
├── agents/                ← el agente orquestador que coordina las skills
└── docs/                  ← evidencia, hallazgos, matrices, esta guía
```

La idea de diseño (una frase): **cada pieza tiene UNA sola
responsabilidad y el test solo declara el escenario**.

---

## 4. Pieza por pieza

### 4.1 `playwright.config.ts` — las reglas del juego

```ts
export default defineConfig({
  testDir: './tests',       // dónde están los escenarios
  workers: 2,               // 2 procesos en paralelo (requisito del reto)
  retries: 0,               // sin reintentos mágicos: un fallo es un fallo
  reporter: [['list'], ['html', ...]],  // consola + reporte HTML
  use: {
    baseURL: 'https://automationintesting.online',  // URL base de todo
    trace: 'retain-on-failure',        // traza interactiva solo si falla
    screenshot: 'only-on-failure',     // foto automática solo si falla
    video: 'retain-on-failure',        // video solo si falla
  },
});
```

**Por qué importa**: es la única fuente de verdad de la ejecución. Cambiar el
ambiente (DEV/QA) sería cambiar una línea.

### 4.2 Los clientes API (`src/api/`) — hablar con el servidor

Problema que resuelven: sin ellos, cada test escribiría
`request.post('https://.../api/booking', ...)` a mano, repitiendo URLs y
formatos en docenas de lugares.

Solución: **una clase por recurso**, con un método por endpoint:

```ts
// src/api/booking.client.ts (simplificado)
export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  create(payload: BookingRequest) {          // POST /api/booking
    return this.request.post('/api/booking', { data: payload });
  }

  async listByRoom(roomId: number) {         // GET /api/booking?roomid=N
    const response = await getWithRetry(this.request, `/api/booking?roomid=${roomId}`);
    return (await response.json()).bookings;
  }
}
```

El test dice "crear" y "listar"; no sabe de URLs. Si el endpoint cambia, se
arregla en un solo archivo.

Hay 4 clientes: `booking`, `room` (habitaciones), `report` (ocupación) y
`auth` (login → token).

**Detalle de robustez — `http.utils.ts`**: la demo pública a veces responde
500 transitorios bajo carga. Los GET (que son seguros de repetir) reintentan
hasta 3 veces. Los POST nunca se reintentan ciegamente (podrían crear
duplicados) — solo ante el 409 específico de "fechas ya tomadas".

### 4.3 Autenticación sin dolor

El ambiente exige token para consultar reservas. Flujo:

```
POST /api/auth/login {username: admin, password: password}
   → devuelve {"token": "abc123"}
   → las consultas lo envían como cookie: Cookie: token=abc123
```

Esto ocurre **una sola vez por test, automáticamente**, en la fixture `api`
(ver 4.7). El test jamás ve el token.

### 4.4 Datos sintéticos (`src/data/`) — nada hardcodeado

La demo es **compartida con otros usuarios y se reinicia**. Dos
consecuencias: no puedes usar fechas fijas (alguien ya las reservó) ni datos
fijos (chocan entre ejecuciones).

**`guest.factory.ts`** — fabrica un huésped único por test:

```ts
buildGuest() → {
  firstname: 'Autox7k2p9',          // timestamp en base36: único
  lastname: 'Qa482test',
  email: 'qa.auto.x7k2p9482@example.com',
  phone: '573812345678',            // 11 dígitos (regla de la API)
}
```

**`date.utils.ts` → `findFreeWindow()`** — calcula fechas libres DE VERDAD:

```
1. Pregunta a la API: ¿qué días están ocupados en esta habitación?
2. Busca la primera ventana de 2 noches libre a partir de pasado mañana
   (+ un "jitter" aleatorio de 0-60 días para que tests paralelos no
   elijan todos la misma ventana)
3. Devuelve { checkin: '2027-03-14', checkout: '2027-03-16' }
```

Ningún test elige fechas: las **descubre** consultando la ocupación real.

### 4.5 El oráculo (`src/oracle/`) — decidir qué es "correcto"

El patrón central del proyecto. Un oráculo es la fuente que dice **cómo
debería comportarse** el sistema. Aquí el oráculo es la **documentación de la
API** (la colección Postman enlazada en el reto), convertida en código.

Tres niveles:

**a) Contratos de esquema (`contracts.ts`)** — la forma documentada de cada
respuesta:

```ts
CREATE_BOOKING_RESPONSE_MIN = {
  bookingid:   { type: 'number' },              // requerido, no nulo
  firstname:   { type: 'string' },
  bookingdates: { type: 'object', properties: {
    checkin:  { type: 'string', format: 'iso-date' },  // YYYY-MM-DD
    checkout: { type: 'string', format: 'iso-date' },
  }},
  // ...
}
```

**b) El validador (`schema.checker.ts`)** — compara una respuesta real contra
ese contrato: campos requeridos presentes, no nulos, tipos correctos,
formatos válidos, y **campos inesperados** (si el servidor manda algo no
documentado, también se reporta).

**c) Las funciones de verificación (`booking.oracle.ts`)** — no lanzan el
assert; **devuelven una lista de divergencias**:

```ts
checkCreateContract(response) → [
  // vacío si todo bien; si no:
  { check: 'status', expected: '201 Created', observed: '409' },
  { check: 'body.email (requerido)', expected: 'presente', observed: 'ausente' },
]
```

**Por qué una lista y no asserts sueltos**: en una sola ejecución se acumulan
TODAS las desviaciones (no solo la primera), y se adjuntan como JSON de
evidencia al reporte. El test decide al final:

```ts
expect(divergencias, 'el alta debe cumplir el contrato').toEqual([]);
```

Fue exactamente así como se detectaron los 10 hallazgos del ambiente: el
oráculo dijo "la documentación promete X, observé Y".

### 4.6 Page Objects (`src/pages/`) — la UI traducida a código

Problema: si los tests escriben `page.locator('input[name="firstname"]')` por
todas partes, un cambio en la pantalla rompe 20 tests.

Solución (patrón **POM**): una clase por página que **es el único lugar con
locators**:

```ts
// src/pages/reservation.page.ts (simplificado)
export class ReservationPage {
  readonly firstnameInput = page.locator('input[name="firstname"]');
  readonly reserveNowButton = page.getByRole('button', { name: 'Reserve Now' });
  readonly confirmationHeading = page.getByRole('heading', { name: 'Booking Confirmed' });

  async fillGuestForm(guest: GuestData) {
    await this.firstnameInput.fill(guest.firstname);
    // ...
  }

  async expectConfirmation(window: DateWindow) {
    await expect(this.confirmationHeading).toBeVisible();       // ← auto-wait
    await expect(this.confirmationDates).toContainText(window.checkin);
  }
}
```

Dos detalles clave de Playwright visibles aquí:

- **Locators estables**: se busca por *rol y nombre visible*
  (`getByRole('button', { name: 'Reserve Now' })`) o por `name` del input —
  sobreviven a cambios de estilos/clases CSS.
- **Auto-waiting**: `expect(locator).toBeVisible()` **espera y reintenta solo**
  hasta 10 segundos. Por eso el proyecto no tiene NI UNA espera fija
  (`waitForTimeout`) — requisito explícito del reto.

### 4.7 Las fixtures (`src/fixtures/test.fixtures.ts`) — el setup declarativo

La pieza más importante de Playwright para entender el proyecto. Una fixture
es un objeto que Playwright **construye automáticamente antes del test** si el
test lo declara en su firma:

```ts
test('crear y consultar reserva', async ({
  roomUnderTest,   // ← Playwright lo construye antes de empezar
  guest,           // ← idem
  freeWindow,      // ← idem
  bookingApiFlow,  // ← idem
}) => { ... });
```

El grafo de construcción (Playwright infiere el orden solo):

```
roomUnderTest  (1 vez por worker): GET /api/room → habitación N según worker
      ↓
api            (por test): login → token → clientes autenticados
      ↓
guest          (por test): buildGuest() → huésped único
freeWindow     (por test): lee ocupación real → ventana libre
verifier       (por test): nuevo BookingVerifier(api)
bookingApiFlow (por test): nuevo BookingApiFlow(api, verifier)
```

Ventaja: el test **no prepara nada** — solo declara lo que necesita. Y como
cada test recibe datos propios, no hay dependencias entre tests (otro
requisito del reto).

También hay una fixture especial: `roomDetailWorkaround` (ver sección 6).

### 4.8 Flows (`src/flows/`) — un caso de uso completo en una llamada

Los tests no deben conocer la mecánica (qué clic va primero, qué endpoint va
después). Eso vive en los **flows**:

**`booking.flow.ts` (UI)** — reservar de punta a punta:

```ts
await bookingFlow.bookRoom(habitacion, huesped, ventana, { testInfo });
// internamente:
//   1. Home: abrir la habitación y fijar fechas libres     (test.step + foto)
//   2. Reserva: abrir formulario y diligenciar huésped     (test.step + foto)
//   3. Reserva: enviar al backend                          (test.step)
```

Los `test.step()` hacen que el reporte HTML muestre los pasos con nombre, y
las fotos adjuntas permiten "ver lo que hizo el robot" sin ejecutar nada.

**`booking-api.flow.ts` (API)** — crear y verificar con oráculo:

```ts
await bookingApiFlow.createAndVerifyIdentity(payload);
// internamente:
//   POST /api/booking → checkCreateContract (status, headers, esquema)
//   si 409 (otro usuario tomó las fechas) → ventana fresca y reintenta (máx 3)
//   GET listado por habitación → ¿existe ese bookingid?
//   checkBookingIdentity → ¿los datos guardados == lo enviado?
//   devuelve Divergence[]
```

### 4.9 El verifier (`src/verification/`) — comprobar efectos reales

Separado del oráculo a propósito: el oráculo **juzga respuestas**; el
verifier **consulta el estado guardado**:

```ts
verifier.snapshot(roomId)                     // foto de reservas actuales
verifier.newBookingsSince(roomId, antes)      // diff: ¿apareció algo nuevo?
verifier.findByIdentity(roomId, guest, dates) // localizar MI reserva
```

Esto habilita el oráculo más potente del proyecto: la **no-persistencia** —
"el servidor dijo 400 (rechazo)... ¿pero de verdad no guardó nada?":

```ts
const antes = await verifier.snapshot(roomId);
await api.booking.create(payloadInvalido);
const nuevas = await verifier.newBookingsSince(roomId, antes);
expect(nuevas).toEqual([]);   // nada nuevo debe haber aparecido
```

---

## 5. Los 26 escenarios, explicados por familia

Matriz completa en `docs/escenarios.md`. Resumen por familia:

### 5.1 API exitosa (escenarios 01-02) — `tests/api/01-create-booking.spec.ts`

Parametrizado con **dos conjuntos de datos** (depósito pagado / sin depósito —
requisito del reto). Cada uno:

1. Arma el payload con las fixtures (huésped único + ventana libre real).
2. Crea por API y valida contrato completo (status 201, headers, esquema).
3. Consulta la reserva creada y valida que sea **eco exacto** de lo enviado.

### 5.2 API negativa (03) — `tests/api/02-reject-invalid-booking.spec.ts`

Envía una reserva **sin `firstname`** y valida tres cosas: status 400, el
mensaje de validación documentado, y la **no-persistencia** (diff antes/después).

### 5.3 Matriz de validación (04-16) — `tests/api/03-validation-matrix.spec.ts`

Cada regla del contrato genera su caso: firstname vacío, lastname vacío, email
mal formado, phone corto, roomid inválido, firstname null, depositpaid null,
roomid null (todos verdes: el backend sí rechaza), **más** los casos donde el
backend NO valida lo que debería (checkin en el pasado, phone con letras,
fechas invertidas, `bookingdates` nulo) — esos son hallazgos reales y corren
en la suite de bugs.

### 5.4 Integración UI+API (17) — `tests/ui/01-book-room-ui-verify-api.spec.ts`

El escenario estrella del reto:

```
1. El robot reserva por UI (clics reales, POST real al backend)
2. Verifica la confirmación en pantalla ("Booking Confirmed" + fechas)
3. Consulta ESE MISMO registro por API
4. Verifica que nombre, apellido, fechas y habitación coincidan con lo digitado
```

Prueba que los dos canales cuentan la misma verdad.

### 5.5 API→UI (18) — `tests/ui/02-api-booking-reflected-in-calendar.spec.ts`

El camino inverso: crear por API y verificar que el calendario de la UI marca
esas fechas como ocupadas. Hoy está roto por un bug del entorno (BUG-04) y
corre en la suite de bugs con su evidencia.

### 5.6 Mock de fallo (19) — `tests/ui/03-backend-failure-mock.spec.ts`

El único mock de escritura: se intercepta el POST y se responde 500 simulado.
Verifica que la UI muestra el error y NO confirma. Su objetivo es el
comportamiento de la UI ante fallos, no el servidor.

### 5.7 Resiliencia (20-22) — `tests/ui/04-resilience.spec.ts`

- **Lentitud**: 6 segundos inyectados en el POST → la UI confirma, se persiste
  exactamente UNA reserva, un solo 201.
- **Corte de red**: conexión abortada → la UI debería mostrar error (hoy no lo
  hace: BUG-05).
- **Doble clic**: dos clics durante la latencia → hoy revienta la app (BUG-09).

### 5.8 Contrato documentado del entorno (23-26) — `tests/bugs/01-known-bugs.spec.ts`

Los endpoints documentados que el ambiente no cumple (GET room por id → 500,
GET booking por id → 500, alta sin email/phone). Corren rojos con evidencia.

---

## 6. Los 10 hallazgos (bugs encontrados)

El oráculo + la exploración encontraron **10 diferencias reales** entre el
contrato documentado y el comportamiento del ambiente. Todas documentadas con
pasos/esperado/observado en `docs/hallazgos.md`. Las más importantes:

| Bug | Qué pasa | Severidad |
|---|---|---|
| BUG-01 | `GET /api/room/{id}` → 500 → **la página de reserva no carga** (spinner infinito) | Alta |
| BUG-02 | `GET /api/booking/{id}` → 500 (la consulta documentada no sirve) | Alta |
| BUG-04 | `GET /api/report/room/{id}` → 500 → el calendario UI nunca muestra ocupación | Alta |
| BUG-10 | `bookingdates` nulo/ausente → **el servidor nunca responde** (conexión colgada) | Crítica |
| BUG-09 | Doble clic en "Reserve Now" → **la app entera revienta** tras crear la reserva | Alta |
| BUG-06 | Acepta reservas con check-in en el pasado | Media |
| BUG-03 | El alta no devuelve email/phone (documentado que sí) | Media |

**Cómo se manejan sin maquillar la suite**: los tests que los evidencian llevan
el tag `@known-bug` y corren en una suite separada que **falla en rojo** a
propósito (`npm run test:bugs`, exit 1). La suite principal
(`npm test`) solo contiene lo que debe estar verde.

### El workaround honesto (BUG-01)

Como la página de reserva no carga por BUG-01, el escenario UI+API no podría
ejecutarse. La fixture `roomDetailWorkaround` intercepta **únicamente** esa
lectura rota y la sirve con los datos reales del listado de habitaciones. El
alta (POST) y toda la verificación posterior siguen yendo **100% al backend
real**. Está documentado en código, README y hallazgos, y se eliminará cuando
el entorno se repare.

---

## 7. El reporte y la evidencia

Se usa el **reporter HTML nativo de Playwright** (decisión deliberada sobre
Allure: cero dependencias para quien evalúa, evidencia integrada,
autocontenido para CI).

Qué produce cada ejecución:

- `playwright-report/` — el HTML: una fila por escenario, con duración, pasos
  con nombre (`test.step`), fotos adjuntas por paso, y en los fallos: error,
  screenshot, video y **traza interactiva** (una "máquina del tiempo" para
  recorrer cada acción con el DOM de ese instante).
- `test-results/` — los artefactos crudos de los fallos.
- `docs/evidencia/` — fotos fijas commiteadas: la suite estable verde (14 ✅)
  y la suite de bugs roja (12 🔴), para ver el comportamiento sin ejecutar.

Comandos:

```bash
npm test              # 14 escenarios estables → todo verde, exit 0
npm run test:bugs     # 12 hallazgos → rojo con evidencia, exit 1 (por diseño)
npm run test:all      # los 26 juntos
npm run scenarios     # lista los 26 con archivo y línea
npm run report        # abre el reporte HTML
```

---

## 8. Las skills y el agente de IA

El reto pedía crear una skill para guiar a un agente de IA. Se construyeron
**4 skills especializadas** (`skills/`) + **1 agente orquestador** (`agents/`):

| Pieza | Su dominio |
|---|---|
| `api-contract-testing` | Cómo escribir pruebas API: clientes, contrato, no-persistencia |
| `oracle-testing` | Cómo decidir qué verificar y registrar divergencias sin ocultarlas |
| `synthetic-data` | Cómo generar datos: fixtures, reglas de validez, prohibiciones |
| `mock-resilience-testing` | Cómo mockear fallos sin falsear la verificación de negocio |
| `agents/qa-orchestrator` | Coordina las 4 según el canal del escenario pedido |

Cada skill tiene: propósito, entradas, pasos, convenciones, comandos de
verificación, criterios de éxito, actuación ante errores, salidas y
limitaciones. Y hay evidencia del proceso en `docs/evidencia-ia.md`: la skill
se commiteó **antes** de usarse (`4167e2c` → `fc5149a`), como pedía el reto.

---

## 9. Decisiones de diseño que suelen preguntar

**¿Por qué 8 archivos si hay 26 escenarios?**
Los casos data-driven se generan desde datasets tipados
(`for (const caso of casos) { test(...) }`) — la práctica estándar para no
duplicar el mismo cuerpo 13 veces. Los 26 se ven con `npm run scenarios`, en
`docs/escenarios.md` y como filas independientes del reporte.

**¿Por qué no reintentos automáticos (`retries: 0`)?**
Porque un reintento oculta flakiness. Preferimos: suite estable verde sin
reintentos, y resiliencia explícita solo contra el ruido conocido del entorno
compartido (409 de contención, 500 transitorios en lecturas).

**¿Por qué la suite de bugs falla en rojo en vez de marcarse "expected fail"?**
Porque un fallo esperado se ve verde en el reporte y **esconde el hallazgo**.
Rojo en una suite aparte = la evidencia visible, sin contaminar la señal de
calidad. Cuando el vendor repare el ambiente, esa suite quedará verde sola y
esos tests se promueven a estables.

**¿Cómo se conecta con CI/CD (gates)?**
- **Smoke (bloquea PR)**: `tests/api` + la integración UI+API.
- **Regresión (nocturna)**: `npm test` debe pasar siempre; `test:bugs` se
  monitorea como tendencia hasta que el ambiente se repare.
- El reporte HTML se publica como artefacto del pipeline.

---

## 10. Ruta de lectura recomendada del código

1. `playwright.config.ts` — las reglas.
2. `src/fixtures/test.fixtures.ts` — cómo se prepara todo.
3. `tests/api/01-create-booking.spec.ts` — el escenario más simple y completo.
4. `src/flows/booking-api.flow.ts` + `src/oracle/booking.oracle.ts` — la mecánica y el juicio.
5. `tests/ui/01-book-room-ui-verify-api.spec.ts` — la integración UI↔API.
6. `src/pages/reservation.page.ts` — el POM real.
7. `docs/hallazgos.md` — los 10 bugs con su evidencia.
8. `docs/escenarios.md` — la matriz de los 26.

Y para verlo en vivo: `npx playwright test --ui` (modo interactivo con
timeline por acción) o `npm run test:headed` (navegador visible).
