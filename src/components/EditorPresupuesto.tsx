"use client";

import { useState } from "react";
import {
  guardarTextoEditado,
  linkWhatsappCliente,
} from "@/app/(app)/cotizar/actions";
import { formatearARS } from "@/lib/formato";

export interface ItemResumen {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  subtotal: number;
}

// Hoja imprimible + editor del texto (plan §4.2). El componente es dueño
// del texto vivo: lo que se ve es lo que se imprime y lo que viaja por
// WhatsApp. La edición va a texto_editado; texto_generado nunca se pisa.
export function EditorPresupuesto({
  quoteId,
  fecha,
  items,
  total,
  textoInicial,
}: {
  quoteId: string;
  fecha: string;
  items: ItemResumen[];
  total: number;
  textoInicial: string;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [estado, setEstado] = useState<
    "idle" | "guardando" | "guardado" | "error"
  >("idle");
  const [telefono, setTelefono] = useState("");
  const [waError, setWaError] = useState<string | null>(null);

  async function guardar(): Promise<boolean> {
    setEstado("guardando");
    const res = await guardarTextoEditado(quoteId, texto);
    setEstado(res.ok ? "guardado" : "error");
    if (res.ok) setTimeout(() => setEstado("idle"), 2000);
    return res.ok;
  }

  async function imprimir() {
    await guardar();
    window.print();
  }

  async function abrirWhatsapp() {
    setWaError(null);
    if (!(await guardar())) {
      setWaError("No se pudo guardar el texto antes de enviar.");
      return;
    }
    const res = await linkWhatsappCliente(quoteId, telefono);
    if (!res.ok) {
      setWaError(res.error);
      return;
    }
    window.open(res.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-8">
      <section className="imprimible rounded-lg border border-linea bg-hoja p-6 shadow-hoja sm:p-8">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h1 className="text-lg font-bold tracking-tight">
            Presupuesto #{quoteId.slice(0, 8)}
          </h1>
          <span className="font-mono text-xs text-grafito">{fecha}</span>
        </div>

        <div className="grid">
          {items.map((it) => (
            <div
              key={it.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-dashed border-linea py-3"
            >
              <span className="text-sm font-semibold">{it.nombre}</span>
              <span className="row-span-2 self-center font-mono text-sm font-medium tabular-nums">
                {formatearARS(it.subtotal)}
              </span>
              <span className="font-mono text-xs text-grafito">
                {it.cantidad} {it.unidad}
              </span>
            </div>
          ))}
        </div>

        <div className="regla-ticks my-5" role="presentation" />
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-grafito">
            Total
          </span>
          <span className="total-fosforito marcado font-mono text-2xl font-semibold tabular-nums">
            {formatearARS(total)}
          </span>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed">
          {texto}
        </p>
      </section>

      <section className="no-imprimir grid gap-5">
        <div className="grid gap-1.5">
          <label htmlFor="texto" className="text-[13px] font-semibold">
            Texto del presupuesto
            <span className="ml-2 font-normal text-grafito">
              (editalo como quieras antes de entregarlo)
            </span>
          </label>
          <textarea
            id="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            maxLength={4000}
            className="w-full rounded-md border border-linea bg-white p-4 text-[15px] leading-relaxed"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={estado === "guardando"}
              className="rounded-md border border-linea px-4 py-2 text-sm font-semibold hover:border-grafito disabled:opacity-40"
            >
              {estado === "guardando" ? "Guardando…" : "Guardar texto"}
            </button>
            {estado === "guardado" && (
              <span className="text-sm text-grafito">Guardado.</span>
            )}
            {estado === "error" && (
              <span className="text-sm text-red-700">No se pudo guardar.</span>
            )}
          </div>
        </div>

        <div className="grid gap-2.5 rounded-md border border-linea bg-hoja p-4">
          <label htmlFor="tel-cliente" className="text-[13px] font-semibold">
            WhatsApp del cliente
            <span className="ml-2 font-normal text-grafito">
              (con código de país, ej. 54911…)
            </span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            <input
              id="tel-cliente"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-linea bg-white px-3 py-2.5 font-mono text-[15px]"
            />
            <button
              type="button"
              onClick={abrirWhatsapp}
              disabled={telefono.trim().length < 6}
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--plano)" }}
            >
              Enviar por WhatsApp
            </button>
            <button
              type="button"
              onClick={imprimir}
              className="rounded-md border border-linea px-5 py-2.5 text-sm font-semibold hover:border-grafito"
            >
              Imprimir
            </button>
          </div>
          {waError && <p className="text-sm text-red-700">{waError}</p>}
        </div>
      </section>
    </div>
  );
}
