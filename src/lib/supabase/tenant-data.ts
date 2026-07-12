import "server-only";
import type { IndustryConfig } from "@/lib/engine/schema";
import type { ProductoPublico } from "./public-data";
import { rowToConfig } from "./config-map";
import { createSupabaseServerClient } from "./server";

// Datos del tenant del usuario logueado (modo vendedor / admin): SIEMPRE
// con el cliente de sesión → RLS garantiza el aislamiento por tenant.

export interface DatosTenant {
  tenant: {
    id: string;
    nombre: string;
    slug: string;
    whatsapp_vendedor: string | null;
    cliente_ideal: string | null;
    branding: { color_primario?: string; logo_url?: string };
  };
  config: IndustryConfig | null;
  configPublicada: boolean;
  productos: ProductoPublico[];
}

export async function cargarDatosTenant(
  tenantId: string
): Promise<DatosTenant | null> {
  const supabase = await createSupabaseServerClient();

  const { data: tenant } = await supabase
    .from("cotizador_tenants")
    .select("id, nombre, slug, whatsapp_vendedor, cliente_ideal, branding")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return null;

  const { data: configRow } = await supabase
    .from("cotizador_quoter_configs")
    .select("version, campos, reglas_precio, textos, opciones, publicado")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: productos } = await supabase
    .from("cotizador_products")
    .select("id, nombre, categoria, precio_base, unidad, beneficios, imagen_url")
    .eq("tenant_id", tenantId)
    .eq("activo", true)
    .order("nombre");

  const branding =
    tenant.branding && typeof tenant.branding === "object"
      ? (tenant.branding as Record<string, unknown>)
      : {};

  return {
    tenant: {
      id: tenant.id,
      nombre: tenant.nombre,
      slug: tenant.slug,
      whatsapp_vendedor: tenant.whatsapp_vendedor,
      cliente_ideal: tenant.cliente_ideal,
      branding: {
        color_primario:
          typeof branding.color_primario === "string"
            ? branding.color_primario
            : undefined,
        logo_url:
          typeof branding.logo_url === "string" ? branding.logo_url : undefined,
      },
    },
    config: configRow ? rowToConfig(configRow) : null,
    configPublicada: configRow?.publicado ?? false,
    productos: (productos ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio_base: Number(p.precio_base),
      unidad: p.unidad,
      beneficios: Array.isArray(p.beneficios)
        ? p.beneficios.filter((x): x is string => typeof x === "string")
        : [],
      imagen_url: p.imagen_url,
    })),
  };
}
