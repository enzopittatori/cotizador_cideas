import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

const PROTECTED_PREFIXES = ["/cotizar", "/admin", "/super"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() (no getSession()) valida el JWT contra Supabase Auth en
  // vez de confiar ciegamente en la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") {
    // La resolución de a qué dashboard corresponde (rol) la hace "/".
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Excluye estáticos y TODA /api: las rutas públicas hacen su propio
  // control (rate limit + service role) y ninguna API usa redirect de
  // sesión — el gate por rol de las páginas vive en requireRole().
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
