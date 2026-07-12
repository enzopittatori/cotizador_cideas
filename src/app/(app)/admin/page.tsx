import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { cargarDatosTenant } from "@/lib/supabase/tenant-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearARS } from "@/lib/formato";
import { logout } from "../actions";
import {
  actualizarPrecio,
  alternarProducto,
  crearProducto,
  guardarNegocio,
} from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-linea bg-white px-3 py-2.5 text-[15px]";
const labelCls = "text-[13px] font-semibold";

export default async function AdminPage() {
  const membership = await requireRole(["superadmin", "admin"]);

  if (!membership.tenantId) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold">Panel del negocio</h1>
        <p className="mt-2 text-grafito">
          Tu usuario no tiene un negocio asignado. La gestión de negocios llega
          con el panel superadmin (Fase 2).
        </p>
      </main>
    );
  }

  const datos = await cargarDatosTenant(membership.tenantId);
  if (!datos) return null;

  const supabase = await createSupabaseServerClient();
  const { data: todosLosProductos } = await supabase
    .from("cotizador_products")
    .select("id, nombre, categoria, precio_base, unidad, beneficios, activo")
    .eq("tenant_id", membership.tenantId)
    .order("activo", { ascending: false })
    .order("nombre");

  const color = datos.tenant.branding.color_primario;

  return (
    <div
      className="min-h-screen"
      style={color ? ({ "--plano": color } as React.CSSProperties) : undefined}
    >
      <header className="border-b border-linea">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-6 py-5">
          <div className="flex items-baseline gap-3">
            <span className="text-[17px] font-extrabold tracking-tight">
              {datos.tenant.nombre}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-grafito">
              Panel del negocio
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/cotizar" className="text-grafito underline hover:text-tinta">
              Modo vendedor
            </Link>
            <a
              href={`/${datos.tenant.slug}`}
              target="_blank"
              className="text-grafito underline hover:text-tinta"
            >
              Ver cotizador público ↗
            </a>
            <form action={logout}>
              <button type="submit" className="text-grafito underline hover:text-tinta">
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-12 px-6 py-10">
        {!datos.configPublicada && (
          <p className="rounded-md border border-linea bg-hoja px-4 py-3 text-sm text-grafito">
            El cotizador público todavía no está publicado. Cuando la
            configuración esté lista se publica desde acá (la edición completa
            de campos y reglas llega en Fase 2; hoy se carga con el seed).
          </p>
        )}

        <section>
          <h2 className="mb-5 font-mono text-xs uppercase tracking-widest text-grafito">
            Datos del negocio
          </h2>
          <form
            action={guardarNegocio}
            className="grid max-w-xl gap-4 rounded-md border border-linea bg-hoja p-5"
          >
            <div className="grid gap-1.5">
              <label htmlFor="cliente_ideal" className={labelCls}>
                Cliente ideal
                <span className="ml-2 font-normal text-grafito">
                  (quién compra, qué le preocupa — alimenta los textos de la IA)
                </span>
              </label>
              <textarea
                id="cliente_ideal"
                name="cliente_ideal"
                rows={3}
                maxLength={1000}
                defaultValue={datos.tenant.cliente_ideal ?? ""}
                className={inputCls}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="whatsapp_vendedor" className={labelCls}>
                WhatsApp del vendedor
                <span className="ml-2 font-normal text-grafito">
                  (con código de país, ej. 54911…)
                </span>
              </label>
              <input
                id="whatsapp_vendedor"
                name="whatsapp_vendedor"
                type="tel"
                maxLength={30}
                defaultValue={datos.tenant.whatsapp_vendedor ?? ""}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="color_primario" className={labelCls}>
                Color del negocio
              </label>
              <input
                id="color_primario"
                name="color_primario"
                type="color"
                defaultValue={color ?? "#17527b"}
                className="h-11 w-24 cursor-pointer rounded-md border border-linea bg-white p-1"
              />
            </div>
            <button
              type="submit"
              className="justify-self-start rounded-md bg-tinta px-5 py-2.5 text-sm font-semibold text-papel"
            >
              Guardar cambios
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-5 font-mono text-xs uppercase tracking-widest text-grafito">
            Productos
          </h2>

          <div className="mb-6 overflow-x-auto rounded-md border border-linea bg-hoja">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linea text-left font-mono text-[11px] uppercase tracking-wider text-grafito">
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 font-medium">Precio base</th>
                  <th className="px-4 py-2.5 font-medium">Unidad</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {(todosLosProductos ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-grafito">
                      Sin productos todavía. Cargá el primero abajo.
                    </td>
                  </tr>
                )}
                {(todosLosProductos ?? []).map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-dashed border-linea last:border-0 ${!p.activo ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-semibold">{p.nombre}</td>
                    <td className="px-4 py-2.5">
                      <form action={actualizarPrecio} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          name="precio_base"
                          type="number"
                          step="1"
                          min="0"
                          defaultValue={Number(p.precio_base)}
                          className="w-28 rounded border border-linea bg-white px-2 py-1 font-mono text-sm tabular-nums"
                          aria-label={`Precio de ${p.nombre}`}
                        />
                        <button
                          type="submit"
                          className="text-xs text-grafito underline hover:text-tinta"
                        >
                          actualizar
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.unidad ?? "—"}</td>
                    <td className="px-4 py-2.5">{p.activo ? "activo" : "inactivo"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={alternarProducto}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="activo" value={String(!p.activo)} />
                        <button
                          type="submit"
                          className="text-xs text-grafito underline hover:text-tinta"
                        >
                          {p.activo ? "desactivar" : "activar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="rounded-md border border-linea bg-hoja p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              Agregar producto
            </summary>
            <form action={crearProducto} className="mt-4 grid max-w-xl gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="nombre" className={labelCls}>Nombre</label>
                <input id="nombre" name="nombre" required maxLength={200} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="precio_base" className={labelCls}>Precio base</label>
                  <input
                    id="precio_base"
                    name="precio_base"
                    type="number"
                    min="0"
                    step="1"
                    required
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="unidad" className={labelCls}>Unidad</label>
                  <input
                    id="unidad"
                    name="unidad"
                    placeholder="m², m.l., u."
                    maxLength={20}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="categoria" className={labelCls}>
                  Categoría <span className="font-normal text-grafito">(opcional)</span>
                </label>
                <input id="categoria" name="categoria" maxLength={100} className={inputCls} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="beneficio_1" className={labelCls}>
                  Beneficio 1
                  <span className="ml-2 font-normal text-grafito">
                    (impacto personal para tu cliente ideal)
                  </span>
                </label>
                <input id="beneficio_1" name="beneficio_1" maxLength={300} className={inputCls} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="beneficio_2" className={labelCls}>
                  Beneficio 2 <span className="font-normal text-grafito">(opcional)</span>
                </label>
                <input id="beneficio_2" name="beneficio_2" maxLength={300} className={inputCls} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="imagen_url" className={labelCls}>
                  URL de imagen <span className="font-normal text-grafito">(opcional; subida directa llega en Fase 2)</span>
                </label>
                <input id="imagen_url" name="imagen_url" type="url" maxLength={500} className={inputCls} />
              </div>
              <button
                type="submit"
                className="justify-self-start rounded-md bg-tinta px-5 py-2.5 text-sm font-semibold text-papel"
              >
                Agregar producto
              </button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-grafito">
            Vista previa
          </h2>
          <p className="text-sm text-grafito">
            Cotizador público:{" "}
            <a
              href={`/${datos.tenant.slug}`}
              target="_blank"
              className="font-mono underline hover:text-tinta"
            >
              /{datos.tenant.slug}
            </a>{" "}
            · Productos activos: {datos.productos.length} · Ejemplo de precio:{" "}
            {datos.productos[0]
              ? `${datos.productos[0].nombre} ${formatearARS(datos.productos[0].precio_base)}`
              : "—"}
          </p>
        </section>
      </main>
    </div>
  );
}
