"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateQuote, CalculoError } from "@/lib/engine/calculate";
import { itemInputSchema } from "@/lib/engine/schema";
import { generarTextoPresupuesto } from "@/lib/ai/generar-texto";
import { formatearARS, type ContextoTexto } from "@/lib/ai/prompt";
import { getCurrentMembership } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cargarDatosTenant } from "@/lib/supabase/tenant-data";
import { buildWaLink } from "@/lib/whatsapp";

const itemsSchema = z.array(itemInputSchema).min(1).max(30);

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function tenantDelUsuario() {
  const membership = await getCurrentMembership();
  if (!membership || !membership.tenantId) return null;
  if (!["admin", "vendedor", "superadmin"].includes(membership.rol)) return null;
  return membership.tenantId;
}

/** Crea una cotización en MODO VENDEDOR y devuelve su id. */
export async function crearQuoteVendedor(
  itemsRaw: unknown
): Promise<Resultado<{ quoteId: string }>> {
  const tenantId = await tenantDelUsuario();
  if (!tenantId) return { ok: false, error: "Tu usuario no tiene un negocio asignado." };

  const parsed = itemsSchema.safeParse(itemsRaw);
  if (!parsed.success) return { ok: false, error: "Ítems inválidos." };

  const datos = await cargarDatosTenant(tenantId);
  if (!datos?.config) {
    return { ok: false, error: "El negocio no tiene configuración de cotizador." };
  }

  let quote;
  try {
    quote = calculateQuote(datos.config, datos.productos, parsed.data);
  } catch (err) {
    if (err instanceof CalculoError) return { ok: false, error: err.message };
    throw err;
  }

  const ctx: ContextoTexto = {
    nombre_negocio: datos.tenant.nombre,
    cliente_ideal: datos.tenant.cliente_ideal,
    beneficios_generales: datos.config.textos.beneficios_generales,
    beneficios_productos: Object.fromEntries(
      datos.productos.map((p) => [p.nombre, p.beneficios])
    ),
    condiciones: datos.config.textos.condiciones ?? null,
    unidad: datos.config.campo_cantidad.unidad,
  };
  const { texto } = await generarTextoPresupuesto(tenantId, ctx, quote);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: quoteRow, error } = await supabase
    .from("cotizador_quotes")
    .insert({
      tenant_id: tenantId,
      modo: "vendedor",
      vendedor_id: user?.id ?? null,
      total: quote.total,
      texto_generado: texto,
    })
    .select("id")
    .single();

  if (error || !quoteRow) {
    console.error("[cotizar] error insertando quote:", error);
    return { ok: false, error: "No se pudo guardar la cotización." };
  }

  const { error: itemsErr } = await supabase.from("cotizador_quote_items").insert(
    quote.items.map((it) => ({
      quote_id: quoteRow.id,
      product_id: it.product_id,
      inputs: it.inputs,
      cantidad: it.cantidad,
      subtotal: it.subtotal,
    }))
  );
  if (itemsErr) console.error("[cotizar] error insertando items:", itemsErr);

  return { ok: true, data: { quoteId: quoteRow.id } };
}

const guardarTextoSchema = z.object({
  quoteId: z.string().uuid(),
  texto: z.string().trim().min(1).max(4000),
});

/**
 * Guarda la edición del vendedor en texto_editado. texto_generado NUNCA
 * se pisa (CLAUDE.md §6): sirve para aprender qué editan los vendedores.
 */
export async function guardarTextoEditado(
  quoteId: string,
  texto: string
): Promise<Resultado<null>> {
  const parsed = guardarTextoSchema.safeParse({ quoteId, texto });
  if (!parsed.success) return { ok: false, error: "Texto inválido." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cotizador_quotes")
    .update({ texto_editado: parsed.data.texto })
    .eq("id", parsed.data.quoteId);

  if (error) {
    console.error("[cotizar] error guardando texto:", error);
    return { ok: false, error: "No se pudo guardar el texto." };
  }
  return { ok: true, data: null };
}

const telefonoSchema = z.string().trim().min(6).max(30);

/**
 * Link wa.me hacia el WhatsApp del cliente con el texto actual del
 * presupuesto (editado si existe). Generado server-side (CLAUDE.md §2.5).
 */
export async function linkWhatsappCliente(
  quoteId: string,
  telefono: string
): Promise<Resultado<{ url: string }>> {
  const tel = telefonoSchema.safeParse(telefono);
  if (!tel.success) return { ok: false, error: "Teléfono inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase
    .from("cotizador_quotes")
    .select("texto_generado, texto_editado, total")
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote) return { ok: false, error: "Cotización no encontrada." };

  const texto =
    quote.texto_editado ??
    quote.texto_generado ??
    `Presupuesto: ${formatearARS(Number(quote.total))}`;

  const url = buildWaLink(tel.data, texto);
  if (!url) return { ok: false, error: "El teléfono no parece válido (incluí el código de país)." };

  return { ok: true, data: { url } };
}

/** Form action del botón "Nueva cotización" en la página de detalle. */
export async function volverACotizar() {
  redirect("/cotizar");
}
