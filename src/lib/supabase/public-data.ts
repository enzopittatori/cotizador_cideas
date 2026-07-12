import "server-only";
import type { IndustryConfig } from "@/lib/engine/schema";
import { rowToConfig } from "./config-map";
import { createSupabaseServiceClient } from "./service";

// Acceso público (modo cliente): SIEMPRE por acá, con service role y
// filtrado por slug — nunca anon key contra las tablas (CLAUDE.md §6).
// Solo expone lo necesario: tenant activo, config publicada, productos
// activos.

export interface TenantPublico {
  id: string;
  nombre: string;
  slug: string;
  whatsapp_vendedor: string | null;
  cliente_ideal: string | null;
  branding: { color_primario?: string; logo_url?: string };
}

export interface ProductoPublico {
  id: string;
  nombre: string;
  categoria: string | null;
  precio_base: number;
  unidad: string | null;
  beneficios: string[];
  imagen_url: string | null;
}

export interface DatosPublicos {
  tenant: TenantPublico;
  config: IndustryConfig;
  productos: ProductoPublico[];
}

function parseBranding(raw: unknown): TenantPublico["branding"] {
  if (raw && typeof raw === "object") {
    const b = raw as Record<string, unknown>;
    return {
      color_primario:
        typeof b.color_primario === "string" ? b.color_primario : undefined,
      logo_url: typeof b.logo_url === "string" ? b.logo_url : undefined,
    };
  }
  return {};
}

function parseBeneficios(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string").slice(0, 2)
    : [];
}

/**
 * Carga todo lo que el cotizador público necesita para un slug.
 * Devuelve null si el tenant no existe, está suspendido o su config
 * no está publicada — el caller decide el 404.
 */
export async function cargarDatosPublicos(
  slug: string
): Promise<DatosPublicos | null> {
  const supabase = createSupabaseServiceClient();

  const { data: tenant } = await supabase
    .from("cotizador_tenants")
    .select("id, nombre, slug, estado, whatsapp_vendedor, cliente_ideal, branding")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant || tenant.estado !== "activo") return null;

  const { data: configRow } = await supabase
    .from("cotizador_quoter_configs")
    .select("version, campos, reglas_precio, textos, opciones, publicado")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!configRow || !configRow.publicado) return null;

  const config = rowToConfig(configRow);
  if (!config) {
    // Config de versión vieja o corrupta: el cotizador no se sirve roto.
    console.error(`[public-data] config inválida para tenant ${tenant.slug}`);
    return null;
  }

  const { data: productos } = await supabase
    .from("cotizador_products")
    .select("id, nombre, categoria, precio_base, unidad, beneficios, imagen_url")
    .eq("tenant_id", tenant.id)
    .eq("activo", true)
    .order("nombre");

  return {
    tenant: {
      id: tenant.id,
      nombre: tenant.nombre,
      slug: tenant.slug,
      whatsapp_vendedor: tenant.whatsapp_vendedor,
      cliente_ideal: tenant.cliente_ideal,
      branding: parseBranding(tenant.branding),
    },
    config,
    productos: (productos ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio_base: Number(p.precio_base),
      unidad: p.unidad,
      beneficios: parseBeneficios(p.beneficios),
      imagen_url: p.imagen_url,
    })),
  };
}

