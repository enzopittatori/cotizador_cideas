import { describe, it, expect } from "vitest";
import { calculateItem, calculateQuote, CalculoError } from "./calculate";
import { TEMPLATES } from "./templates";
import type { ProductoEngine } from "./schema";

const revestimientos = TEMPLATES["revestimientos"]!;
const casas = TEMPLATES["casas-modulares"]!;

const simil: ProductoEngine = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Símil piedra gris",
  precio_base: 18900,
  unidad: "m²",
};
const ranurado: ProductoEngine = {
  id: "22222222-2222-4222-8222-222222222222",
  nombre: "Ranurado natural",
  precio_base: 14500,
  unidad: "m²",
};
const lineaCosta: ProductoEngine = {
  id: "33333333-3333-4333-8333-333333333333",
  nombre: "Línea Costa",
  precio_base: 385000,
  unidad: "m²",
};

describe("revestimientos", () => {
  it("calcula base sin extras (interior)", () => {
    const r = calculateItem(revestimientos, simil, {
      product_id: simil.id,
      cantidad: 24,
      inputs: { ubicacion: "interior" },
    });
    expect(r.subtotal).toBe(24 * 18900);
    expect(r.desglose).toHaveLength(1);
  });

  it("aplica multiplicador exterior 1.12", () => {
    const r = calculateItem(revestimientos, simil, {
      product_id: simil.id,
      cantidad: 10,
      inputs: { ubicacion: "exterior" },
    });
    expect(r.subtotal).toBe(Math.round(10 * 18900 * 1.12));
  });

  it("suma colocación por unidad", () => {
    const r = calculateItem(revestimientos, simil, {
      product_id: simil.id,
      cantidad: 24,
      inputs: { ubicacion: "interior", colocacion: true },
    });
    expect(r.subtotal).toBe(24 * 18900 + 24 * 7200);
    expect(r.desglose.map((d) => d.concepto)).toContain("Colocación");
  });

  it("exterior + colocación: multiplicador primero, por_unidad después (orden de reglas)", () => {
    const r = calculateItem(revestimientos, simil, {
      product_id: simil.id,
      cantidad: 10,
      inputs: { ubicacion: "exterior", colocacion: true },
    });
    expect(r.subtotal).toBe(Math.round(10 * 18900 * 1.12) + 10 * 7200);
  });

  it("rechaza inputs con campo requerido faltante", () => {
    expect(() =>
      calculateItem(revestimientos, simil, {
        product_id: simil.id,
        cantidad: 24,
        inputs: {},
      })
    ).toThrowError(CalculoError);
  });

  it("rechaza valores de select fuera de las opciones", () => {
    expect(() =>
      calculateItem(revestimientos, simil, {
        product_id: simil.id,
        cantidad: 24,
        inputs: { ubicacion: "marte" },
      })
    ).toThrowError(/ubicacion/);
  });

  it("rechaza campos desconocidos (strict)", () => {
    expect(() =>
      calculateItem(revestimientos, simil, {
        product_id: simil.id,
        cantidad: 24,
        inputs: { ubicacion: "interior", total: 1 },
      })
    ).toThrowError(CalculoError);
  });

  it("rechaza cantidad fuera de rango", () => {
    expect(() =>
      calculateItem(revestimientos, simil, {
        product_id: simil.id,
        cantidad: 0.5,
        inputs: { ubicacion: "interior" },
      })
    ).toThrowError(/rango/);
  });
});

describe("casas modulares", () => {
  it("terminación estándar sin extras = base", () => {
    const r = calculateItem(casas, lineaCosta, {
      product_id: lineaCosta.id,
      cantidad: 36,
      inputs: { terminacion: "estandar" },
    });
    expect(r.subtotal).toBe(36 * 385000);
  });

  it("premium multiplica 1.18 y kit eléctrico suma fijo", () => {
    const r = calculateItem(casas, lineaCosta, {
      product_id: lineaCosta.id,
      cantidad: 36,
      inputs: { terminacion: "premium", kit_electrico: true },
    });
    expect(r.subtotal).toBe(Math.round(36 * 385000 * 1.18) + 1850000);
  });

  it("respeta el mínimo de 18 m² de la plantilla", () => {
    expect(() =>
      calculateItem(casas, lineaCosta, {
        product_id: lineaCosta.id,
        cantidad: 12,
        inputs: { terminacion: "estandar" },
      })
    ).toThrowError(/rango/);
  });
});

describe("calculateQuote (multi-producto)", () => {
  it("suma subtotales de varios ítems", () => {
    const q = calculateQuote(
      revestimientos,
      [simil, ranurado],
      [
        {
          product_id: simil.id,
          cantidad: 24,
          inputs: { ubicacion: "interior" },
        },
        {
          product_id: ranurado.id,
          cantidad: 12,
          inputs: { ubicacion: "interior", colocacion: true },
        },
      ]
    );
    expect(q.items).toHaveLength(2);
    expect(q.total).toBe(24 * 18900 + (12 * 14500 + 12 * 7200));
  });

  it("rechaza product_id que no está en el catálogo del tenant", () => {
    expect(() =>
      calculateQuote(revestimientos, [simil], [
        {
          product_id: "99999999-9999-4999-8999-999999999999",
          cantidad: 1,
          inputs: { ubicacion: "interior" },
        },
      ])
    ).toThrowError(/inexistente/);
  });

  it("es determinístico: mismos inputs, mismo resultado", () => {
    const items = [
      {
        product_id: simil.id,
        cantidad: 33,
        inputs: { ubicacion: "exterior", colocacion: true },
      },
    ];
    const a = calculateQuote(revestimientos, [simil], items);
    const b = calculateQuote(revestimientos, [simil], items);
    expect(a).toEqual(b);
  });
});
