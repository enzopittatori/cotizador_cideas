import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentMembership } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold">Cuenta sin acceso asignado</h1>
          <p className="mt-2 text-gray-600">
            Tu usuario existe pero todavía no tiene un rol asignado en
            Cotizador Multi-Industria. Pedile al superadmin que te sume.
          </p>
        </div>
      </main>
    );
  }

  if (membership.rol === "superadmin") {
    redirect("/super");
  }
  if (membership.rol === "admin") {
    redirect("/admin");
  }
  redirect("/cotizar");
}
