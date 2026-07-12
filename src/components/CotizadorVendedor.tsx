"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IndustryConfig } from "@/lib/engine/schema";
import { calculateQuote } from "@/lib/engine/calculate";
import type { ProductoPublico } from "@/lib/supabase/public-data";
import { FormularioItem, type ItemArmado } from "./FormularioItem";
import { HojaViva, type LineaHoja } from "./HojaViva";
import { crearQuoteVendedor } from "@/app/(app)/cotizar/actions";

// MODO VENDEDOR (plan §4.2): misma mecánica que el modo cliente pero
// dentro del panel; al generar, redirige al editor del texto.
export function CotizadorVendedor({
  negocio,
  colorPrimario,
  config,
  productos,
}: {
  negocio: string;
  colorPrimario?: string;
  config: IndustryConfig;
  productos: ProductoPublico[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ItemArmado[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculo = useMemo(() => {
    try {
      return calculateQuote(config, productos, items);
    } catch {
      return { items: [], total: 0 };
    }
  }, [config, productos, items]);

  const lineas: LineaHoja[] = calculo.items.map((it, i) => ({
    clave: `${it.product_id}-${i}`,
    titulo: it.producto_nombre,
    detalle: `${it.cantidad} ${config.campo_cantidad.unidad}${
      it.desglose.length > 1
        ? ` · ${it.desglose.slice(1).map((d) => d.concepto).join(" + ")}`
        : ""
    }`,
    importe: it.subtotal,
    onQuitar: () => setItems((prev) => prev.filter((_, j) => j !== i)),
  }));

  async function generar() {
    setEnviando(true);
    setError(null);
    const res = await crearQuoteVendedor(items);
    if (!res.ok) {
      setError(res.error);
      setEnviando(false);
      return;
    }
    router.push(`/cotizar/${res.data.quoteId}`);
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <FormularioItem
        config={config}
        productos={productos}
        onAgregar={(item) => setItems((prev) => [...prev, item])}
      />

      <div className="lg:sticky lg:top-6">
        <HojaViva
          negocio={negocio}
          colorPrimario={colorPrimario}
          lineas={lineas}
          total={calculo.total}
        >
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button
            type="button"
            disabled={items.length === 0 || enviando}
            onClick={generar}
            className="rounded-md px-5 py-3 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            style={{ background: "var(--plano)" }}
          >
            {enviando ? "Generando…" : "Generar presupuesto"}
          </button>
        </HojaViva>
      </div>
    </div>
  );
}
