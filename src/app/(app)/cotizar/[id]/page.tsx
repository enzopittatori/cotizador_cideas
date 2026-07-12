import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EditorPresupuesto,
  type ItemResumen,
} from "@/components/EditorPresupuesto";
import { formatearARS } from "@/lib/formato";

export const dynamic = "force-dynamic";

// Detalle de una cotización del modo vendedor: hoja imprimible + editor
// del texto + salida por WhatsApp. RLS garantiza que solo se ven quotes
// del propio tenant.
export default async function QuoteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["superadmin", "admin", "vendedor"]);
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase
    .from("cotizador_quotes")
    .select("id, total, texto_generado, texto_editado, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!quote) notFound();

  const { data: items } = await supabase
    .from("cotizador_quote_items")
    .select("id, cantidad, subtotal, product_id")
    .eq("quote_id", quote.id);

  const productIds = (items ?? [])
    .map((i) => i.product_id)
    .filter((x): x is string => x !== null);
  const { data: productos } = productIds.length
    ? await supabase
        .from("cotizador_products")
        .select("id, nombre, unidad")
        .in("id", productIds)
    : { data: [] as { id: string; nombre: string; unidad: string | null }[] };

  const porId = new Map((productos ?? []).map((p) => [p.id, p]));
  const itemsResumen: ItemResumen[] = (items ?? []).map((it) => {
    const p = it.product_id ? porId.get(it.product_id) : undefined;
    return {
      id: it.id,
      nombre: p?.nombre ?? "Producto eliminado",
      cantidad: Number(it.cantidad),
      unidad: p?.unidad ?? "u.",
      subtotal: Number(it.subtotal),
    };
  });

  const texto =
    quote.texto_editado ??
    quote.texto_generado ??
    `Presupuesto: ${formatearARS(Number(quote.total))}`;

  return (
    <div className="min-h-screen">
      <header className="no-imprimir border-b border-linea">
        <div className="mx-auto flex max-w-4xl items-baseline justify-between gap-4 px-6 py-5">
          <Link
            href="/cotizar"
            className="text-sm text-grafito underline hover:text-tinta"
          >
            ← Volver a cotizar
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-widest text-grafito">
            Presupuesto #{quote.id.slice(0, 8)}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <EditorPresupuesto
          quoteId={quote.id}
          fecha={new Date(quote.created_at).toLocaleDateString("es-AR")}
          items={itemsResumen}
          total={Number(quote.total)}
          textoInicial={texto}
        />
      </main>
    </div>
  );
}
