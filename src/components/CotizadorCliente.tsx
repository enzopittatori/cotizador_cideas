"use client";

import { useMemo, useState } from "react";
import type { IndustryConfig } from "@/lib/engine/schema";
import { calculateQuote } from "@/lib/engine/calculate";
import type { ProductoPublico } from "@/lib/supabase/public-data";
import { FormularioItem, type ItemArmado } from "./FormularioItem";
import { HojaViva, type LineaHoja } from "./HojaViva";
import { formatearARS } from "@/lib/formato";

interface ResultadoQuote {
  quote_id: string;
  total: number;
  texto: string;
  wa_url: string | null;
}

// MODO CLIENTE (plan §4.1): el cliente arma su presupuesto multi-producto,
// ve números optimistas calculados con el MISMO engine puro en el browser,
// y al enviar el server recalcula (autoritativo), persiste y devuelve
// texto + link wa.me.
export function CotizadorCliente({
  slug,
  negocio,
  colorPrimario,
  config,
  productos,
}: {
  slug: string;
  negocio: string;
  colorPrimario?: string;
  config: IndustryConfig;
  productos: ProductoPublico[];
}) {
  const [items, setItems] = useState<ItemArmado[]>([]);
  const [pidiendoLead, setPidiendoLead] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoQuote | null>(null);

  // Visualización optimista con el engine puro; el server revalida al enviar.
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

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${slug}/quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          cliente: nombre.trim()
            ? { nombre: nombre.trim(), telefono: telefono.trim() || undefined }
            : undefined,
        }),
      });
      const data = (await res.json()) as
        | ResultadoQuote
        | { error: { code: string; message: string } };
      if (!res.ok || "error" in data) {
        setError(
          "error" in data ? data.error.message : "No pudimos generar el presupuesto."
        );
        return;
      }
      setResultado(data);
    } catch {
      setError("Problema de conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function onQuererPresupuesto() {
    if (config.opciones.captura_lead_antes_de_resultado && !nombre.trim()) {
      setPidiendoLead(true);
      return;
    }
    void enviar();
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-linea bg-hoja p-6 shadow-hoja sm:p-8">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-grafito">
            Tu presupuesto en {negocio}
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {resultado.texto}
          </p>
          <div className="regla-ticks my-5" role="presentation" />
          <div className="mb-6 flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-grafito">
              Total estimado
            </span>
            <span className="total-fosforito marcado font-mono text-2xl font-semibold tabular-nums">
              {formatearARS(resultado.total)}
            </span>
          </div>
          <div className="grid gap-2.5">
            {resultado.wa_url && (
              <a
                href={resultado.wa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-5 py-3 text-center text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--plano)" }}
              >
                Enviar por WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setResultado(null);
                setItems([]);
                setPidiendoLead(false);
              }}
              className="rounded-md border border-linea px-5 py-3 text-[15px] font-semibold hover:border-grafito"
            >
              Cotizar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
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
          nota={
            config.opciones.mostrar_precio === "exacto"
              ? "Precio estimado, sujeto a confirmación del negocio."
              : undefined
          }
        >
          {pidiendoLead && (
            <div className="grid gap-2.5 rounded-md border border-linea p-4">
              <label htmlFor="lead-nombre" className="text-[13px] font-semibold">
                Tu nombre para ver el presupuesto
              </label>
              <input
                id="lead-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="rounded-md border border-linea bg-white px-3 py-2.5 text-[15px]"
              />
              <label htmlFor="lead-tel" className="text-[13px] font-semibold">
                Teléfono <span className="font-normal text-grafito">(opcional)</span>
              </label>
              <input
                id="lead-tel"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="rounded-md border border-linea bg-white px-3 py-2.5 font-mono text-[15px]"
              />
            </div>
          )}

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="button"
            disabled={items.length === 0 || enviando || (pidiendoLead && !nombre.trim())}
            onClick={onQuererPresupuesto}
            className="rounded-md px-5 py-3 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            style={{ background: "var(--plano)" }}
          >
            {enviando
              ? "Generando presupuesto…"
              : pidiendoLead
                ? "Ver mi presupuesto"
                : "Obtener presupuesto"}
          </button>
        </HojaViva>
      </div>
    </div>
  );
}
