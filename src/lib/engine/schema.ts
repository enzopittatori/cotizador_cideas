import { z } from "zod";

// Contrato versionado de la config de industria (cotizador_quoter_configs
// y cotizador_industry_templates.config). Un cambio de forma acá exige
// subir INDUSTRY_CONFIG_VERSION y migrar las configs existentes — nunca
// se cambia la forma "in place" (CLAUDE.md §2.7).
export const INDUSTRY_CONFIG_VERSION = 1;

export const CAMPO_TIPOS = ["numero", "texto", "select", "booleano"] as const;

const campoBaseSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "id de campo en snake_case"),
  etiqueta: z.string().min(1),
  requerido: z.boolean().default(false),
  unidad: z.string().optional(),
});

const campoNumeroSchema = campoBaseSchema.extend({
  tipo: z.literal("numero"),
  min: z.number().optional(),
  max: z.number().optional(),
});

const campoTextoSchema = campoBaseSchema.extend({
  tipo: z.literal("texto"),
});

const campoSelectSchema = campoBaseSchema.extend({
  tipo: z.literal("select"),
  opciones: z
    .array(z.object({ valor: z.string().min(1), etiqueta: z.string().min(1) }))
    .min(1),
});

const campoBooleanoSchema = campoBaseSchema.extend({
  tipo: z.literal("booleano"),
  // Texto corto con el costo del extra, para mostrar al lado del checkbox
  // (ej. "+ $7.200 / m²"). Solo presentación; el precio vive en la regla.
  nota_precio: z.string().optional(),
});

export const campoSchema = z.discriminatedUnion("tipo", [
  campoNumeroSchema,
  campoTextoSchema,
  campoSelectSchema,
  campoBooleanoSchema,
]);

// El campo cantidad es especial: es el número que multiplica el precio
// base del producto (m², metros lineales, paneles...). Toda config tiene
// exactamente uno.
export const campoCantidadSchema = z.object({
  etiqueta: z.string().min(1),
  unidad: z.string().min(1),
  min: z.number().positive().default(1),
  max: z.number().positive().optional(),
});

// Reglas de precio, evaluadas en orden sobre cada ítem:
// - multiplicador: multiplica el subtotal acumulado por `valor`.
// - monto_fijo:    suma `valor` una sola vez.
// - por_unidad:    suma `valor` × cantidad.
// Condición de aplicación:
// - sin campo_id            → aplica siempre.
// - campo_id booleano       → aplica si el input es true (no usa `cuando`).
// - campo_id select + cuando → aplica si el input coincide con `cuando`.
export const reglaPrecioSchema = z
  .object({
    id: z.string().min(1),
    descripcion: z.string().min(1),
    tipo: z.enum(["multiplicador", "monto_fijo", "por_unidad"]),
    campo_id: z.string().optional(),
    cuando: z.string().optional(),
    valor: z.number().finite(),
  })
  .refine((r) => !(r.cuando !== undefined && r.campo_id === undefined), {
    message: "`cuando` requiere `campo_id`",
  });

export const textosConfigSchema = z.object({
  cliente_ideal: z.string().optional(),
  beneficios_generales: z.array(z.string()).default([]),
  condiciones: z.string().optional(),
});

export const opcionesConfigSchema = z.object({
  mostrar_precio: z.enum(["exacto", "rango", "oculto"]).default("exacto"),
  captura_lead_antes_de_resultado: z.boolean().default(false),
});

export const industryConfigSchema = z
  .object({
    version: z.literal(INDUSTRY_CONFIG_VERSION),
    campo_cantidad: campoCantidadSchema,
    campos: z.array(campoSchema).default([]),
    reglas_precio: z.array(reglaPrecioSchema).default([]),
    textos: textosConfigSchema.default({ beneficios_generales: [] }),
    opciones: opcionesConfigSchema.default({
      mostrar_precio: "exacto",
      captura_lead_antes_de_resultado: false,
    }),
  })
  .superRefine((config, ctx) => {
    const ids = new Set(config.campos.map((c) => c.id));
    if (ids.size !== config.campos.length) {
      ctx.addIssue({ code: "custom", message: "ids de campos duplicados" });
    }
    for (const regla of config.reglas_precio) {
      if (regla.campo_id !== undefined && !ids.has(regla.campo_id)) {
        ctx.addIssue({
          code: "custom",
          message: `regla ${regla.id}: campo_id "${regla.campo_id}" no existe en campos`,
        });
      }
    }
  });

export type IndustryConfig = z.infer<typeof industryConfigSchema>;
export type Campo = z.infer<typeof campoSchema>;
export type ReglaPrecio = z.infer<typeof reglaPrecioSchema>;

// Producto tal como lo consume el engine (subset de cotizador_products;
// el engine es puro y no conoce la DB).
export const productoEngineSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  precio_base: z.number().nonnegative(),
  unidad: z.string().nullable().optional(),
});
export type ProductoEngine = z.infer<typeof productoEngineSchema>;

/**
 * Construye el schema Zod de los inputs de UN ítem a partir de la config:
 * valida en el borde (API) que lo que manda el cliente tenga la forma
 * exacta que la config declara. Los campos no requeridos pueden faltar.
 */
export function buildInputsSchema(config: IndustryConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const campo of config.campos) {
    let s: z.ZodTypeAny;
    switch (campo.tipo) {
      case "numero": {
        let n = z.number().finite();
        if (campo.min !== undefined) n = n.min(campo.min);
        if (campo.max !== undefined) n = n.max(campo.max);
        s = n;
        break;
      }
      case "texto":
        s = z.string().max(500);
        break;
      case "select":
        s = z.enum(
          campo.opciones.map((o) => o.valor) as [string, ...string[]]
        );
        break;
      case "booleano":
        s = z.boolean();
        break;
    }
    shape[campo.id] = campo.requerido ? s : s.optional();
  }
  return z.object(shape).strict();
}

export const itemInputSchema = z.object({
  product_id: z.string().uuid(),
  cantidad: z.number().positive().finite(),
  inputs: z.record(z.string(), z.unknown()).default({}),
});
export type ItemInput = z.infer<typeof itemInputSchema>;
