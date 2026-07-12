import { industryConfigSchema, type IndustryConfig } from "@/lib/engine/schema";

// La DB guarda campo_cantidad dentro de opciones (jsonb) para no tocar el
// DDL de la migración 0003; el schema del engine lo modela top-level.
// Este módulo hace el mapeo fila ↔ config en un solo lugar.

export interface ConfigColumns {
  version: number;
  campos: unknown;
  reglas_precio: unknown;
  textos: unknown;
  opciones: unknown;
}

export function rowToConfig(row: ConfigColumns): IndustryConfig | null {
  const opciones =
    row.opciones && typeof row.opciones === "object"
      ? (row.opciones as Record<string, unknown>)
      : {};
  const { campo_cantidad, ...restoOpciones } = opciones;

  const parsed = industryConfigSchema.safeParse({
    version: row.version,
    campo_cantidad,
    campos: row.campos,
    reglas_precio: row.reglas_precio,
    textos: row.textos,
    opciones: restoOpciones,
  });
  return parsed.success ? parsed.data : null;
}

export function configToColumns(config: IndustryConfig): ConfigColumns {
  return {
    version: config.version,
    campos: config.campos,
    reglas_precio: config.reglas_precio,
    textos: config.textos,
    opciones: { ...config.opciones, campo_cantidad: config.campo_cantidad },
  };
}
