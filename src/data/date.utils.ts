export interface DateWindow {
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
}

const DAY_MS = 86_400_000;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return toIsoDate(new Date(d.getTime() + days * DAY_MS));
}

/**
 * Dado el conjunto de rangos ocupados de una habitación, devuelve la primera
 * ventana libre de `nights` noches a partir de `startAfterDays` días desde hoy.
 * Garantiza que el test nunca dependa de fechas hardcodeadas (la demo se reinicia).
 *
 * `jitterDays` desplaza el inicio de búsqueda de forma pseudo-aleatoria: en la
 * demo COMPARTIDA, si todos los tests/usuarios toman "la primera ventana
 * libre", colisionan (409). El jitter dispersa las ventanas elegidas.
 */
export function findFreeWindow(
  booked: Array<{ start: string; end: string }>,
  nights = 2,
  startAfterDays = 3,
  searchHorizonDays = 180,
  jitterDays = 0,
): DateWindow {
  const occupied = new Set<string>();
  for (const { start, end } of booked) {
    // [start, end) — el día de checkout vuelve a estar libre
    for (let day = start; day < end; day = addDays(day, 1)) {
      occupied.add(day);
    }
  }

  const today = toIsoDate(new Date());
  for (let offset = startAfterDays + jitterDays; offset <= searchHorizonDays; offset++) {
    const checkin = addDays(today, offset);
    let free = true;
    for (let n = 0; n < nights; n++) {
      if (occupied.has(addDays(checkin, n))) {
        free = false;
        break;
      }
    }
    if (free) {
      return { checkin, checkout: addDays(checkin, nights) };
    }
  }
  throw new Error(`Sin ventana libre de ${nights} noches en ${searchHorizonDays} días`);
}
