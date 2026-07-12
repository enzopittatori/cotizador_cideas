import { requireRole } from "@/lib/auth";
import { logout } from "../actions";

export default async function CotizarPage() {
  const membership = await requireRole(["superadmin", "admin", "vendedor"]);

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cotizar</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 underline">
            Cerrar sesión
          </button>
        </form>
      </div>
      <p className="mt-2 text-gray-600">
        Modo vendedor — rol: {membership.rol}. El motor de cotización se
        construye en Fase 1.
      </p>
    </main>
  );
}
