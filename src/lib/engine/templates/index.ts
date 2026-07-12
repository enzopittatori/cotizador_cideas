import { industryConfigSchema, type IndustryConfig } from "../schema";
import revestimientosJson from "./revestimientos.json";
import casasModularesJson from "./casas-modulares.json";

// Catálogo de plantillas empaquetadas con el código. Se validan al cargar:
// si una plantilla no cumple el schema, el server no arranca (mejor que
// servir configs rotas).
function parse(nombre: string, raw: unknown): IndustryConfig {
  const r = industryConfigSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `Plantilla "${nombre}" inválida: ${r.error.issues.map((i) => i.message).join("; ")}`
    );
  }
  return r.data;
}

export const TEMPLATES: Record<string, IndustryConfig> = {
  revestimientos: parse("revestimientos", revestimientosJson),
  "casas-modulares": parse("casas-modulares", casasModularesJson),
};
