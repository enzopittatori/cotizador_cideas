import { requireRole } from "@/lib/auth";
import { logout } from "../actions";

export default async function AdminPage() {
  const membership = await requireRole(["superadmin", "admin"]);

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Panel del negocio</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 underline">
            Cerrar sesión
          </button>
        </form>
      </div>
      <p className="mt-2 text-gray-600">
        Rol: {membership.rol}. Configuración de cotizador, productos y
        onboarding se construyen en Fase 1/2.
      </p>
    </main>
  );
}
