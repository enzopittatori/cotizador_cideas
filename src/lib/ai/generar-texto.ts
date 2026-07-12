import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { QuoteCalculada } from "@/lib/engine/calculate";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  AI_MODEL,
  PROMPT_VERSION,
  buildPrompt,
  fallbackTexto,
  type ContextoTexto,
} from "./prompt";

const TIMEOUT_MS = 12_000;

const anthropicResponseSchema = z.object({
  content: z
    .array(z.object({ type: z.string(), text: z.string().optional() }))
    .min(1),
});

/**
 * Hash estable de inputs para cotizador_text_cache: tenant + ítems
 * normalizados + contexto editorial + versión de prompt + modelo.
 * Misma combinación = mismo texto, sin repagar la API.
 */
export function hashInputs(
  tenantId: string,
  ctx: ContextoTexto,
  quote: QuoteCalculada
): string {
  const carga = JSON.stringify({
    v: PROMPT_VERSION,
    model: AI_MODEL,
    tenant: tenantId,
    cliente_ideal: ctx.cliente_ideal,
    beneficios: ctx.beneficios_generales,
    beneficios_prod: ctx.beneficios_productos,
    condiciones: ctx.condiciones,
    items: quote.items.map((it) => ({
      p: it.producto_nombre,
      c: it.cantidad,
      i: it.inputs,
      s: it.subtotal,
    })),
    total: quote.total,
  });
  return createHash("sha256").update(carga).digest("hex");
}

async function llamarClaude(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = anthropicResponseSchema.parse(await res.json());
  const texto = data.content.find((c) => c.type === "text")?.text?.trim();
  if (!texto) throw new Error("Respuesta de Anthropic sin texto");
  return texto;
}

/**
 * Devuelve el texto del presupuesto: caché → Claude → fallback template.
 * Nunca lanza: la cotización no se bloquea por la IA.
 */
export async function generarTextoPresupuesto(
  tenantId: string,
  ctx: ContextoTexto,
  quote: QuoteCalculada
): Promise<{ texto: string; origen: "cache" | "claude" | "fallback" }> {
  const hash = hashInputs(tenantId, ctx, quote);
  const supabase = createSupabaseServiceClient();

  try {
    const { data: cacheHit } = await supabase
      .from("cotizador_text_cache")
      .select("texto")
      .eq("tenant_id", tenantId)
      .eq("hash_inputs", hash)
      .maybeSingle();
    if (cacheHit?.texto) return { texto: cacheHit.texto, origen: "cache" };
  } catch {
    // caché caído no bloquea: seguimos a la API
  }

  try {
    const { system, user } = buildPrompt(ctx, quote);
    const texto = await llamarClaude(system, user);

    // upsert al caché; si falla, el texto igual se entrega
    try {
      await supabase.from("cotizador_text_cache").upsert(
        { tenant_id: tenantId, hash_inputs: hash, texto, model: AI_MODEL },
        { onConflict: "tenant_id,hash_inputs" }
      );
    } catch {
      /* no bloquea */
    }

    return { texto, origen: "claude" };
  } catch (err) {
    console.error("[ai] fallo generación, uso fallback:", err);
    return { texto: fallbackTexto(ctx, quote), origen: "fallback" };
  }
}
