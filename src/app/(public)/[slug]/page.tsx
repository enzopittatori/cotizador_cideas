import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cargarDatosPublicos } from "@/lib/supabase/public-data";
import { CotizadorCliente } from "@/components/CotizadorCliente";

// Cotizador público por tenant (MODO CLIENTE). El acceso a datos pasa por
// service role filtrado por slug — la anon key no toca las tablas.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const datos = await cargarDatosPublicos(slug);
  return {
    title: datos
      ? `Cotizá en ${datos.tenant.nombre}`
      : "Cotizador no disponible",
  };
}

export default async function CotizadorPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const datos = await cargarDatosPublicos(slug);
  if (!datos) notFound();

  const color = datos.tenant.branding.color_primario;

  return (
    <div
      className="min-h-screen"
      style={color ? ({ "--plano": color } as React.CSSProperties) : undefined}
    >
      <header className="border-b border-linea">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-[3px]"
              style={{ background: "var(--plano)" }}
            />
            <span className="text-[17px] font-extrabold tracking-tight">
              {datos.tenant.nombre}
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-grafito">
            Cotizador online
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight [font-stretch:115%] sm:text-4xl">
            Armá tu presupuesto ahora.
          </h1>
          <p className="mt-3 text-[17px] text-grafito">
            Elegí lo que necesitás, mirá el precio al instante y envialo por
            WhatsApp. Sin esperas ni llamados.
          </p>
        </div>

        <CotizadorCliente
          slug={slug}
          negocio={datos.tenant.nombre}
          colorPrimario={color}
          config={datos.config}
          productos={datos.productos}
        />
      </main>

      <footer className="border-t border-linea">
        <div className="mx-auto max-w-6xl px-6 py-6 font-mono text-[11.5px] text-grafito">
          Cotizador por Cideas
        </div>
      </footer>
    </div>
  );
}
