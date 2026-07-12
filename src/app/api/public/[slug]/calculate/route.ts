import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote, CalculoError } from "@/lib/engine/calculate";
import { itemInputSchema } from "@/lib/engine/schema";
import { cargarDatosPublicos } from "@/lib/supabase/public-data";
import { claveDesdeRequest, rateLimitOk } from "@/lib/rate-limit";

const bodySchema = z.object({
  items: z.array(itemInputSchema).min(1).max(30),
});

// Cálculo server-side autoritativo para el modo cliente. El front puede
// mostrar números optimistas con el mismo engine, pero lo que se persiste
// y se comunica sale SIEMPRE de acá.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!rateLimitOk(claveDesdeRequest(req, `calc:${slug}`), 60)) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Demasiadas consultas, esperá un minuto." } },
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

  try {
    const quote = calculateQuote(datos.config, datos.productos, parsed.data.items);
    return NextResponse.json({ total: quote.total, items: quote.items });
  } catch (err) {
    if (err instanceof CalculoError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 422 }
      );
    }
    throw err;
  }
}
