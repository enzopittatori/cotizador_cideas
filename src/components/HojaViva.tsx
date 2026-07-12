"use client";

import { useEffect, useRef, useState } from "react";
import { formatearARS } from "@/lib/formato";

export interface LineaHoja {
  clave: string;
  titulo: string;
  detalle: string;
  importe: number;
  onQuitar?: () => void;
}

// La hoja de presupuesto viva (docs/diseno-ui.md §1 y §5): líneas en
// cascada, total con count-up en mono tabular y trazo de fosforito que
// se re-dibuja en cada cambio.
export function HojaViva({
  negocio,
  colorPrimario,
  lineas,
  total,
  nota,
  children,
}: {
  negocio: string;
  colorPrimario?: string;
  lineas: LineaHoja[];
  total: number;
  nota?: string;
  children?: React.ReactNode; // acciones (botones) debajo del total
}) {
  const [totalVisible, setTotalVisible] = useState(total);
  const [marcado, setMarcado] = useState(false);
  const anterior = useRef(total);
  const reducido = useRef(false);

  useEffect(() => {
    reducido.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    const desde = anterior.current;
    anterior.current = total;
    setMarcado(false);

    if (reducido.current || desde === total) {
      setTotalVisible(total);
      requestAnimationFrame(() => setMarcado(true));
      return;
    }

    const DUR = 320;
    let t0: number | null = null;
    let raf: number;
    const paso = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / DUR, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setTotalVisible(Math.round(desde + (total - desde) * eased));
      if (p < 1) raf = requestAnimationFrame(paso);
      else setMarcado(true);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <aside
      className="imprimible rounded-lg border border-linea bg-hoja p-6 shadow-hoja sm:p-8"
      aria-live="polite"
      style={
        colorPrimario
          ? ({ "--plano": colorPrimario } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-3 w-3 flex-shrink-0 rounded-[3px]"
            style={{ background: "var(--plano)" }}
          />
          <span className="text-[15px] font-bold tracking-tight">{negocio}</span>
        </div>
        <div className="text-right font-mono text-[11px] uppercase leading-relaxed tracking-wider text-grafito">
          Presupuesto
          <br />
          {new Date().toLocaleDateString("es-AR")}
        </div>
      </div>

      <div className="grid min-h-[96px]">
        {lineas.length === 0 && (
          <p className="self-center py-4 text-sm text-grafito">
            Agregá productos para armar tu presupuesto.
          </p>
        )}
        {lineas.map((l, i) => (
          <div
            key={l.clave}
            className="linea-entra grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-dashed border-linea py-3"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-sm font-semibold">{l.titulo}</span>
            <span className="row-span-2 self-center whitespace-nowrap font-mono text-sm font-medium tabular-nums">
              {formatearARS(l.importe)}
            </span>
            <span className="col-start-1 font-mono text-xs text-grafito">
              {l.detalle}
              {l.onQuitar && (
                <button
                  type="button"
                  onClick={l.onQuitar}
                  className="no-imprimir ml-3 text-xs text-grafito underline hover:text-tinta"
                >
                  quitar
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="regla-ticks my-5" role="presentation" />

      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-grafito">
          Total estimado
        </span>
        <span
          className={`total-fosforito font-mono text-2xl font-semibold tabular-nums sm:text-3xl ${marcado ? "marcado" : ""}`}
        >
          {formatearARS(totalVisible)}
        </span>
      </div>

      {nota && <p className="mb-5 text-xs text-grafito">{nota}</p>}
      {children && <div className="no-imprimir mt-5 grid gap-2.5">{children}</div>}
    </aside>
  );
}
