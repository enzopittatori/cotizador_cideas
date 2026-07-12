import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CotizadorRol } from "@/types/database";

export type Membership = {
  rol: CotizadorRol;
  tenantId: string | null;
};

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Devuelve el membership del usuario logueado. Si tiene varias filas
 * (ej. superadmin + alguna asignación de tenant), prioriza superadmin.
 */
export async function getCurrentMembership(): Promise<Membership | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("cotizador_memberships")
    .select("rol, tenant_id")
    .eq("user_id", user.id);

  if (!data || data.length === 0) return null;

  const superadmin = data.find((m) => m.rol === "superadmin");
  const membership = superadmin ?? data[0];

  if (!membership) return null;

  return { rol: membership.rol, tenantId: membership.tenant_id };
}

/**
 * Para usar al tope de una página server-side: redirige a "/" (que
 * resuelve el dashboard correcto o muestra el aviso de sin-acceso) si
 * el usuario no está logueado o no tiene ninguno de los roles pedidos.
 */
export async function requireRole(
  allowed: CotizadorRol[]
): Promise<Membership> {
  const membership = await getCurrentMembership();

  if (!membership || !allowed.includes(membership.rol)) {
    redirect("/");
  }

  return membership;
}
