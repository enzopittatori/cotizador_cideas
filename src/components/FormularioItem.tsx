"use client";

import { useMemo, useState } from "react";
import type { IndustryConfig } from "@/lib/engine/schema";
import type { ProductoPublico } from "@/lib/supabase/public-data";
import { formatearARS } from "@/lib/formato";

export interface ItemArmado {
  product_id: string;
  cantidad: number;
  inputs: Record<string, unknown>;
}

function inputsIniciales(config: IndustryConfig): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const campo of config.campos) {
    if (campo.tipo === "select") base[campo.id] = campo.opciones[0]!.valor;
    if (campo.tipo === "booleano") base[campo.id] = false;
  }
  return base;
}

// Formulario dinámico de UN ítem, generado desde la config del tenant:
// fichas de producto + cantidad + campos declarados. "Agregar al
// presupuesto" implementa el multi-producto del plan §4.1.
export function FormularioItem({
  config,
  productos,
  onAgregar,
}: {
  config: IndustryConfig;
  productos: ProductoPublico[];
  onAgregar: (item: ItemArmado) => void;
}) {
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState<number>(config.campo_cantidad.min);
  const [inputs, setInputs] = useState<Record<string, unknown>>(() =>
    inputsIniciales(config)
  );

  const producto = useMemo(
    () => productos.find((p) => p.id === productoId),
    [productos, productoId]
  );

  if (productos.length === 0) {
    return (
      <p className="rounded-md border border-linea bg-hoja p-5 text-sm text-grafito">
        Este negocio todavía no cargó productos. Volvé a intentar más tarde.
      </p>
    );
  }

  const setInput = (id: string, valor: unknown) =>
    setInputs((prev) => ({ ...prev, [id]: valor }));

  return (
    <div className="grid gap-6">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-grafito">
          Elegí el producto
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {productos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProductoId(p.id)}
              className={`rounded-md border p-4 text-left transition-transform hover:-translate-y-0.5 ${
                p.id === productoId
                  ? "border-tinta bg-hoja"
                  : "border-linea bg-transparent"
              }`}
            >
              <span className="block text-[15px] font-bold tracking-tight">
                {p.nombre}
              </span>
              <span className="mt-0.5 block font-mono text-xs text-grafito">
                {formatearARS(p.precio_base)} / {p.unidad ?? config.campo_cantidad.unidad}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-md border border-linea bg-hoja p-5">
        <div className="grid gap-1.5">
          <label htmlFor="cantidad" className="text-[13px] font-semibold">
            {config.campo_cantidad.etiqueta} ({config.campo_cantidad.unidad})
          </label>
          <input
            id="cantidad"
            type="number"
            min={config.campo_cantidad.min}
            max={config.campo_cantidad.max}
            value={Number.isFinite(cantidad) ? cantidad : ""}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-full rounded-md border border-linea bg-white px-3 py-2.5 font-mono text-[15px] tabular-nums"
          />
        </div>

        {config.campos.map((campo) => {
          if (campo.tipo === "select") {
            return (
              <div key={campo.id} className="grid gap-1.5">
                <label htmlFor={campo.id} className="text-[13px] font-semibold">
                  {campo.etiqueta}
                </label>
                <select
                  id={campo.id}
                  value={String(inputs[campo.id] ?? "")}
                  onChange={(e) => setInput(campo.id, e.target.value)}
                  className="w-full rounded-md border border-linea bg-white px-3 py-2.5 text-[15px]"
                >
                  {campo.opciones.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (campo.tipo === "booleano") {
            return (
              <div key={campo.id} className="flex items-center gap-2.5">
                <input
                  id={campo.id}
                  type="checkbox"
                  checked={inputs[campo.id] === true}
                  onChange={(e) => setInput(campo.id, e.target.checked)}
                  className="h-[18px] w-[18px]"
                  style={{ accentColor: "var(--plano)" }}
                />
                <label htmlFor={campo.id} className="text-sm font-medium">
                  {campo.etiqueta}
                </label>
                {campo.nota_precio && (
                  <span className="ml-auto font-mono text-xs text-grafito">
                    {campo.nota_precio}
                  </span>
                )}
              </div>
            );
          }
          if (campo.tipo === "numero") {
            return (
              <div key={campo.id} className="grid gap-1.5">
                <label htmlFor={campo.id} className="text-[13px] font-semibold">
                  {campo.etiqueta}
                  {campo.unidad ? ` (${campo.unidad})` : ""}
                </label>
                <input
                  id={campo.id}
                  type="number"
                  min={campo.min}
                  max={campo.max}
                  value={
                    typeof inputs[campo.id] === "number"
                      ? (inputs[campo.id] as number)
                      : ""
                  }
                  onChange={(e) =>
                    setInput(
                      campo.id,
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-md border border-linea bg-white px-3 py-2.5 font-mono text-[15px] tabular-nums"
                />
              </div>
            );
          }
          return (
            <div key={campo.id} className="grid gap-1.5">
              <label htmlFor={campo.id} className="text-[13px] font-semibold">
                {campo.etiqueta}
              </label>
              <input
                id={campo.id}
                type="text"
                maxLength={500}
                value={typeof inputs[campo.id] === "string" ? (inputs[campo.id] as string) : ""}
                onChange={(e) =>
                  setInput(campo.id, e.target.value === "" ? undefined : e.target.value)
                }
                className="w-full rounded-md border border-linea bg-white px-3 py-2.5 text-[15px]"
              />
            </div>
          );
        })}

        <button
          type="button"
          disabled={!producto || !Number.isFinite(cantidad)}
          onClick={() => {
            if (!producto) return;
            onAgregar({ product_id: producto.id, cantidad, inputs });
          }}
          className="rounded-md bg-tinta px-5 py-3 text-[15px] font-semibold text-papel transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          Agregar al presupuesto
        </button>
      </div>
    </div>
  );
}
