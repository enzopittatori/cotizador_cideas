// Links wa.me — ÚNICO mecanismo de WhatsApp del producto (CLAUDE.md §2.5).
// Sin Business API, sin librerías: el mensaje lo envía el propio usuario
// desde su WhatsApp.

/**
 * Normaliza un número a dígitos internacionales para wa.me.
 * Acepta "+54 9 11 5555-4444", "54911...", etc. Devuelve null si no
 * queda un número plausible (7 a 15 dígitos, estándar E.164).
 */
export function normalizarNumeroWhatsapp(numero: string): string | null {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length < 7 || digitos.length > 15) return null;
  return digitos;
}

/** Construye el link wa.me con el mensaje URL-encoded. */
export function buildWaLink(numero: string, texto: string): string | null {
  const n = normalizarNumeroWhatsapp(numero);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}
