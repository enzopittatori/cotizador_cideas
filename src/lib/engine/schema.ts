import { z } from "zod";

// Contrato versionado de la config de industria (cotizador_quoter_configs
// y cotizador_industry_templates.config). Un cambio de forma acá exige
// subir INDUSTRY_CONFIG_VERSION y migrar las configs existentes — nunca
// se cambia la forma "in place" (CLAUDE.md §2.7).
export const INDUSTRY_CONFIG_VERSION = 1;

export const CAMPO_TIPOS = ["numero", "texto", "select", "booleano"] as const;

const campoBaseSchema = z.object({
  id: z.string().min(1),
  etiqueta: z.string().min(1),
  requerido: z.boolean().default(true),
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
});

export const campoSchema = z.discriminatedUnion("tipo", [
  campoNumeroSchema,
  campoTextoSchema,
  campoSelectSchema,
  campoBooleanoSchema,
]);

// La semántica de evaluación (cómo `campo_id` + `valor` producen un
// precio) es responsabilidad de src/lib/engine/calculate.ts, que se
// construye en Fase 1. Acá solo se fija y valida la forma del dato.
export const reglaPrecioSchema = z.object({
  id: z.string().min(1),
  descripcion: z.string().optional(),
  tipo: z.enum(["multiplicador", "monto_fijo", "por_unidad"]),
  campo_id: z.string().optional(),
  valor: z.number(),
});

export const textosConfigSchema = z.object({
  cliente_ideal: z.string().optional(),
  beneficios_generales: z.array(z.string()).default([]),
});

export const opcionesConfigSchema = z.object({
  mostrar_precio: z.enum(["exacto", "rango", "oculto"]).default("exacto"),
  captura_lead_antes_de_resultado: z.boolean().default(false),
});

export const industryConfigSchema = z.object({
  version: z.literal(INDUSTRY_CONFIG_VERSION),
  campos: z.array(campoSchema).min(1),
  reglas_precio: z.array(reglaPrecioSchema).default([]),
  textos: textosConfigSchema.default({ beneficios_generales: [] }),
  opciones: opcionesConfigSchema.default({
    mostrar_precio: "exacto",
    captura_lead_antes_de_resultado: false,
  }),
});

export type IndustryConfig = z.infer<typeof industryConfigSchema>;
export type Campo = z.infer<typeof campoSchema>;
export type ReglaPrecio = z.infer<typeof reglaPrecioSchema>;
