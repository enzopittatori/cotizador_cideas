// Rate limiting mínimo en memoria para los endpoints públicos (evitar
// scraping de precios, plan §5 "Seguridad mínima"). Ventana deslizante
// por clave (IP + ruta). Suficiente para una réplica única en Swarm;
// si algún día hay múltiples réplicas, migrar a un contador en Postgres.

const ventanas = new Map<string, number[]>();

const VENTANA_MS = 60_000;
const MAX_LIMPIEZA = 5_000; // límite de claves antes de purgar

export function rateLimitOk(
  clave: string,
  maxPorMinuto: number
): boolean {
  const ahora = Date.now();
  const marcas = (ventanas.get(clave) ?? []).filter(
    (t) => ahora - t < VENTANA_MS
  );

  if (marcas.length >= maxPorMinuto) {
    ventanas.set(clave, marcas);
    return false;
  }

  marcas.push(ahora);
  ventanas.set(clave, marcas);

  if (ventanas.size > MAX_LIMPIEZA) {
    for (const [k, v] of ventanas) {
      if (v.every((t) => ahora - t >= VENTANA_MS)) ventanas.delete(k);
    }
  }
  return true;
}

export function claveDesdeRequest(req: Request, ruta: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "sin-ip";
  return `${ruta}:${ip}`;
}
