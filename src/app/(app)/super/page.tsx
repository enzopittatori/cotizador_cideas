import { requireRole } from "@/lib/auth";
import { logout } from "../actions";

export default async function SuperPage() {
  await requireRole(["superadmin"]);

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Panel superadmin</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 underline">
            Cerrar sesión
          </button>
        </form>
      </div>
      <p className="mt-2 text-gray-600">
        CRUD de tenants, catálogo de industrias y métricas globales se
        construyen en Fase 2.
      </p>
    </main>
  );
}
