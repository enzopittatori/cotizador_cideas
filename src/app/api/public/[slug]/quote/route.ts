import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote, CalculoError } from "@/lib/engine/calculate";
import { itemInputSchema } from "@/lib/engine/schema";
import { cargarDatosPublicos } from "@/lib/supabase/public-data";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generarTextoPresupuesto } from "@/lib/ai/generar-texto";
import { formatearARS, type ContextoTexto } from "@/lib/ai/prompt";
import { buildWaLink } from "@/lib/whatsapp";
import { claveDesdeRequest, rateLimitOk } from "@/lib/rate-limit";

const bodySchema = z.object({
  items: z.array(itemInputSchema).min(1).max(30),
  cliente: z
    .object({
      nombre: z.string().trim().min(1).max(120),
      telefono: z.string().trim().max(30).optional(),
    })
    .optional(),
});

// Crea la cotización del MODO CLIENTE: calcula server-side, persiste
// quote + items (+ lead si hay datos), genera el texto (caché → Claude →
// fallback) y arma el link wa.me hacia el vendedor del negocio.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!rateLimitOk(claveDesdeRequest(req, `quote:${slug}`), 12)) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Demasiadas cotizaciones, esperá un minuto." } },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "body_invalido", message: "Formato de pedido inválido." } },
      { status: 400 }
    );
  }

  const datos = await cargarDatosPublicos(slug);
  if (!datos) {
    return NextResponse.json(
      { error: { code: "no_encontrado", message: "Cotizador no disponible." } },
      { status: 404 }
    );
  }

  if (
    datos.config.opciones.captura_lead_antes_de_resultado &&
    !parsed.data.cliente?.nombre
  ) {
    return NextResponse.json(
      { error: { code: "lead_requerido", message: "Contanos tu nombre para ver el presupuesto." } },
      { status: 422 }
    );
  }

  let quote;
  try {
    quote = calculateQuote(datos.config, datos.productos, parsed.data.items);
  } catch (err) {
    if (err instanceof CalculoError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 422 }
      );
    }
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
  const { texto } = await generarTextoPresupuesto(datos.tenant.id, ctx, quote);

  const supabase = createSupabaseServiceClient();
  const { data: quoteRow, error: quoteErr } = await supabase
    .from("cotizador_quotes")
    .insert({
      tenant_id: datos.tenant.id,
      modo: "cliente",
      total: quote.total,
      texto_generado: texto,
      cliente_nombre: parsed.data.cliente?.nombre ?? null,
      cliente_telefono: parsed.data.cliente?.telefono ?? null,
    })
    .select("id")
    .single();

  if (quoteErr || !quoteRow) {
    console.error("[quote] error insertando quote:", quoteErr);
    return NextResponse.json(
      { error: { code: "persistencia", message: "No pudimos guardar la cotización. Probá de nuevo." } },
      { status: 500 }
    );
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
  if (itemsErr) console.error("[quote] error insertando items:", itemsErr);

  if (parsed.data.cliente?.nombre) {
    const { error: leadErr } = await supabase.from("cotizador_leads").insert({
      tenant_id: datos.tenant.id,
      quote_id: quoteRow.id,
      nombre: parsed.data.cliente.nombre,
      telefono: parsed.data.cliente.telefono ?? null,
      estado: "nuevo",
      canal: "whatsapp",
    });
    if (leadErr) console.error("[quote] error insertando lead:", leadErr);
  }

  // Resumen wa.me: ítems + total + nombre (plan §4.1). Lo manda el propio
  // cliente desde su WhatsApp al vendedor.
  const resumen = [
    `Hola${parsed.data.cliente?.nombre ? `, soy ${parsed.data.cliente.nombre}` : ""}! Me cotizé en ${datos.tenant.nombre}:`,
    ...quote.items.map(
      (it) =>
        `• ${it.producto_nombre} — ${it.cantidad} ${datos.config.campo_cantidad.unidad}: ${formatearARS(it.subtotal)}`
    ),
    `TOTAL: ${formatearARS(quote.total)}`,
    `(Presupuesto #${quoteRow.id.slice(0, 8)})`,
  ].join("\n");

  const waUrl = datos.tenant.whatsapp_vendedor
    ? buildWaLink(datos.tenant.whatsapp_vendedor, resumen)
    : null;

  return NextResponse.json({
    quote_id: quoteRow.id,
    total: quote.total,
    items: quote.items,
    texto,
    wa_url: waUrl,
  });
}
