import type {
  IndustryConfig,
  ItemInput,
  ProductoEngine,
  ReglaPrecio,
} from "./schema";
import { buildInputsSchema } from "./schema";

// ★ Corazón del producto: cálculo de precios puro y determinístico.
// Sin IO, sin fechas, sin aleatoriedad. Todo lo que necesita entra por
// parámetros; corre igual en server (autoritativo) y en cliente
// (visualización optimista).

export class CalculoError extends Error {
  constructor(
    public code:
      | "producto_desconocido"
      | "cantidad_invalida"
      | "inputs_invalidos",
    message: string
  ) {
    super(message);
    this.name = "CalculoError";
  }
}

export interface LineaDesglose {
  concepto: string;
  monto: number;
}

export interface ItemCalculado {
  product_id: string;
  producto_nombre: string;
  cantidad: number;
  inputs: Record<string, unknown>;
  desglose: LineaDesglose[];
  subtotal: number;
}

export interface QuoteCalculada {
  items: ItemCalculado[];
  total: number;
}

function reglaAplica(
  regla: ReglaPrecio,
  inputs: Record<string, unknown>
): boolean {
  if (regla.campo_id === undefined) return true;
  const valor = inputs[regla.campo_id];
  if (regla.cuando !== undefined) return valor === regla.cuando;
  return valor === true;
}

/** Redondeo a peso entero: los montos ARS del producto no usan centavos. */
function redondear(n: number): number {
  return Math.round(n);
}

export function calculateItem(
  config: IndustryConfig,
  producto: ProductoEngine,
  item: ItemInput
): ItemCalculado {
  const { min, max } = config.campo_cantidad;
  if (item.cantidad < min || (max !== undefined && item.cantidad > max)) {
    throw new CalculoError(
      "cantidad_invalida",
      `Cantidad fuera de rango (min ${min}${max !== undefined ? `, max ${max}` : ""}).`
    );
  }

  const parsed = buildInputsSchema(config).safeParse(item.inputs);
  if (!parsed.success) {
    throw new CalculoError(
      "inputs_invalidos",
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
    );
  }
  const inputs = parsed.data as Record<string, unknown>;

  const desglose: LineaDesglose[] = [];
  const base = redondear(producto.precio_base * item.cantidad);
  desglose.push({
    concepto: `${producto.nombre} — ${item.cantidad} ${config.campo_cantidad.unidad} × ${producto.precio_base}`,
    monto: base,
  });

  let subtotal = base;
  for (const regla of config.reglas_precio) {
    if (!reglaAplica(regla, inputs)) continue;
    switch (regla.tipo) {
      case "multiplicador": {
        const nuevo = redondear(subtotal * regla.valor);
        desglose.push({ concepto: regla.descripcion, monto: nuevo - subtotal });
        subtotal = nuevo;
        break;
      }
      case "monto_fijo": {
        const monto = redondear(regla.valor);
        desglose.push({ concepto: regla.descripcion, monto });
        subtotal += monto;
        break;
      }
      case "por_unidad": {
        const monto = redondear(regla.valor * item.cantidad);
        desglose.push({ concepto: regla.descripcion, monto });
        subtotal += monto;
        break;
      }
    }
  }

  return {
    product_id: item.product_id,
    producto_nombre: producto.nombre,
    cantidad: item.cantidad,
    inputs,
    desglose,
    subtotal,
  };
}

/**
 * Calcula una cotización completa multi-producto. `productos` es el
 * catálogo contra el que se resuelven los `product_id` (solo productos
 * activos del tenant; esa selección la hace el caller, no el engine).
 */
export function calculateQuote(
  config: IndustryConfig,
  productos: ProductoEngine[],
  items: ItemInput[]
): QuoteCalculada {
  const porId = new Map(productos.map((p) => [p.id, p]));
  const calculados = items.map((item) => {
    const producto = porId.get(item.product_id);
    if (!producto) {
      throw new CalculoError(
        "producto_desconocido",
        `Producto ${item.product_id} inexistente o inactivo.`
      );
    }
    return calculateItem(config, producto, item);
  });

  return {
    items: calculados,
    total: calculados.reduce((acc, it) => acc + it.subtotal, 0),
  };
}
