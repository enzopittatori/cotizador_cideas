"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMembership } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Server actions del panel admin (plan §4.3, alcance Fase 1): datos del
// negocio + CRUD de productos. Todo via cliente de sesión → RLS.

async function tenantAdmin(): Promise<string | null> {
  const m = await getCurrentMembership();
  if (!m || !m.tenantId) return null;
  if (!["admin", "superadmin"].includes(m.rol)) return null;
  return m.tenantId;
}

const negocioSchema = z.object({
  cliente_ideal: z.string().trim().max(1000).optional(),
  whatsapp_vendedor: z.string().trim().max(30).optional(),
  color_primario: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "color hex inválido")
    .optional(),
});

export async function guardarNegocio(formData: FormData) {
  const tenantId = await tenantAdmin();
  if (!tenantId) return;

  const parsed = negocioSchema.safeParse({
    cliente_ideal: formData.get("cliente_ideal") ?? undefined,
    whatsapp_vendedor: formData.get("whatsapp_vendedor") ?? undefined,
    color_primario: formData.get("color_primario") ?? undefined,
  });
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();

  const { data: tenant } = await supabase
    .from("cotizador_tenants")
    .select("branding")
    .eq("id", tenantId)
    .maybeSingle();
  const branding =
    tenant?.branding && typeof tenant.branding === "object"
      ? (tenant.branding as Record<string, unknown>)
      : {};

  await supabase
    .from("cotizador_tenants")
    .update({
      cliente_ideal: parsed.data.cliente_ideal || null,
      whatsapp_vendedor: parsed.data.whatsapp_vendedor || null,
      branding: parsed.data.color_primario
        ? { ...branding, color_primario: parsed.data.color_primario }
        : branding,
    })
    .eq("id", tenantId);

  revalidatePath("/admin");
}

const productoSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  categoria: z.string().trim().max(100).optional(),
  precio_base: z.coerce.number().nonnegative().finite(),
  unidad: z.string().trim().max(20).optional(),
  beneficio_1: z.string().trim().max(300).optional(),
  beneficio_2: z.string().trim().max(300).optional(),
  imagen_url: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export async function crearProducto(formData: FormData) {
  const tenantId = await tenantAdmin();
  if (!tenantId) return;

  const parsed = productoSchema.safeParse({
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria") || undefined,
    precio_base: formData.get("precio_base"),
    unidad: formData.get("unidad") || undefined,
    beneficio_1: formData.get("beneficio_1") || undefined,
    beneficio_2: formData.get("beneficio_2") || undefined,
    imagen_url: formData.get("imagen_url") || undefined,
  });
  if (!parsed.success) return;

  const beneficios = [parsed.data.beneficio_1, parsed.data.beneficio_2].filter(
    (b): b is string => Boolean(b)
  );

  const supabase = await createSupabaseServerClient();
  await supabase.from("cotizador_products").insert({
    tenant_id: tenantId,
    nombre: parsed.data.nombre,
    categoria: parsed.data.categoria ?? null,
    precio_base: parsed.data.precio_base,
    unidad: parsed.data.unidad ?? null,
    beneficios,
    imagen_url: parsed.data.imagen_url || null,
  });

  revalidatePath("/admin");
}

const idSchema = z.string().uuid();

export async function alternarProducto(formData: FormData) {
  const tenantId = await tenantAdmin();
  if (!tenantId) return;

  const id = idSchema.safeParse(formData.get("id"));
  const activo = formData.get("activo") === "true";
  if (!id.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("cotizador_products")
    .update({ activo })
    .eq("id", id.data)
    .eq("tenant_id", tenantId);

  revalidatePath("/admin");
}

const precioSchema = z.object({
  id: z.string().uuid(),
  precio_base: z.coerce.number().nonnegative().finite(),
});

export async function actualizarPrecio(formData: FormData) {
  const tenantId = await tenantAdmin();
  if (!tenantId) return;

  const parsed = precioSchema.safeParse({
    id: formData.get("id"),
    precio_base: formData.get("precio_base"),
  });
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("cotizador_products")
    .update({ precio_base: parsed.data.precio_base })
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId);

  revalidatePath("/admin");
}
