import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { cargarDatosTenant } from "@/lib/supabase/tenant-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CotizadorVendedor } from "@/components/CotizadorVendedor";
import { formatearARS } from "@/lib/formato";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function CotizarPage() {
  const membership = await requireRole(["superadmin", "admin", "vendedor"]);

  if (!membership.tenantId) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold">Cotizar</h1>
        <p className="mt-2 text-grafito">
          Tu usuario no tiene un negocio asignado. El superadmin gestiona los
          negocios desde su panel (Fase 2).
        </p>
      </main>
    );
  }

  const datos = await cargarDatosTenant(membership.tenantId);
  if (!datos?.config) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold">Cotizar</h1>
        <p className="mt-2 text-grafito">
          El negocio todavía no tiene configuración de cotizador. Pedile al
          admin que la cargue desde el panel.
        </p>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: recientes } = await supabase
    .from("cotizador_quotes")
    .select("id, total, modo, cliente_nombre, created_at")
    .eq("tenant_id", membership.tenantId)
    .order("created_at", { ascending: false })
    .limit(8);

  const color = datos.tenant.branding.color_primario;

  return (
    <div
      className="min-h-screen"
      style={color ? ({ "--plano": color } as React.CSSProperties) : undefined}
    >
      <header className="border-b border-linea">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-6 py-5">
          <div className="flex items-baseline gap-3">
            <span className="text-[17px] font-extrabold tracking-tight">
              {datos.tenant.nombre}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-grafito">
              Modo vendedor
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {["superadmin", "admin"].includes(membership.rol) && (
              <Link href="/admin" className="text-grafito underline hover:text-tinta">
                Panel admin
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className="text-grafito underline hover:text-tinta">
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <CotizadorVendedor
          negocio={datos.tenant.nombre}
          colorPrimario={color}
          config={datos.config}
          productos={datos.productos}
        />

        {recientes && recientes.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-grafito">
              Últimas cotizaciones
            </h2>
            <div className="overflow-x-auto rounded-md border border-linea bg-hoja">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-linea text-left font-mono text-[11px] uppercase tracking-wider text-grafito">
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Modo</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((q) => (
                    <tr key={q.id} className="border-b border-dashed border-linea last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums">
                        {new Date(q.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-2.5">{q.modo}</td>
                      <td className="px-4 py-2.5">{q.cliente_nombre ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {formatearARS(Number(q.total))}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/cotizar/${q.id}`}
                          className="text-grafito underline hover:text-tinta"
                        >
                          abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
