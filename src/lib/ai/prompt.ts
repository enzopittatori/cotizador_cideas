import type { QuoteCalculada } from "@/lib/engine/calculate";
import { formatearARS } from "@/lib/formato";

// Versión del prompt: entra en el hash de caché. Subirla invalida los
// textos cacheados y permite iterar el prompt sin servir versiones viejas.
export const PROMPT_VERSION = 1;

export const AI_MODEL = "claude-sonnet-4-6";

export interface ContextoTexto {
  nombre_negocio: string;
  cliente_ideal: string | null;
  beneficios_generales: string[];
  beneficios_productos: Record<string, string[]>; // nombre producto → beneficios
  condiciones: string | null;
  unidad: string;
}

export { formatearARS };

function resumenItems(quote: QuoteCalculada, unidad: string): string {
  return quote.items
    .map(
      (it) =>
        `- ${it.producto_nombre}: ${it.cantidad} ${unidad} — subtotal ${formatearARS(it.subtotal)}`
    )
    .join("\n");
}

/**
 * Prompt del texto de presupuesto según plan §4.4:
 * qué pidió → 1-2 beneficios con impacto personal para el cliente ideal
 * → para qué sirve, breve → precio y condiciones.
 */
export function buildPrompt(
  ctx: ContextoTexto,
  quote: QuoteCalculada
): { system: string; user: string } {
  const beneficios = [
    ...ctx.beneficios_generales,
    ...quote.items.flatMap(
      (it) => ctx.beneficios_productos[it.producto_nombre] ?? []
    ),
  ];

  const system = `Escribís textos de presupuesto para ${ctx.nombre_negocio}. Reglas estrictas:
- Estructura: (1) qué pidió el cliente, (2) UN beneficio (máximo dos) contado desde el impacto personal para el cliente, (3) qué incluye, breve y en lenguaje simple, (4) precio y condiciones.
- Tono conversacional argentino (voseo), sin clichés de marketing, sin superlativos vacíos. El cliente es el protagonista, no el producto.
- Usá SOLO los beneficios provistos; no inventes características ni promesas.
- Usá EXACTAMENTE los montos provistos; no calcules ni redondees nada.
- Extensión: 90 a 150 palabras. Sin títulos, sin markdown, sin emojis. Texto plano en párrafos.`;

  const user = `Cliente ideal del negocio: ${ctx.cliente_ideal ?? "no especificado"}.

Beneficios disponibles (elegí el de mayor impacto personal, máximo dos):
${beneficios.length > 0 ? beneficios.map((b) => `- ${b}`).join("\n") : "- (ninguno cargado: omití la sección de beneficios)"}

Pedido:
${resumenItems(quote, ctx.unidad)}

TOTAL: ${formatearARS(quote.total)}
Condiciones: ${ctx.condiciones ?? "Presupuesto sujeto a confirmación."}`;

  return { system, user };
}

/**
 * Texto por template determinístico: se usa si la API de Claude falla o
 * no hay API key. La cotización NUNCA se bloquea por la IA (CLAUDE.md §7).
 */
export function fallbackTexto(
  ctx: ContextoTexto,
  quote: QuoteCalculada
): string {
  const items = quote.items
    .map(
      (it) =>
        `• ${it.producto_nombre} — ${it.cantidad} ${ctx.unidad}: ${formatearARS(it.subtotal)}`
    )
    .join("\n");
  const beneficio = ctx.beneficios_generales[0];
  return [
    `Presupuesto de ${ctx.nombre_negocio}:`,
    "",
    items,
    "",
    `TOTAL: ${formatearARS(quote.total)}`,
    beneficio ? `\n${beneficio}.` : "",
    ctx.condiciones ? `\n${ctx.condiciones}` : "",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
