import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicEnv, supabaseJwt } from "@/lib/env";
import type { Database } from "@/types/database";

const serviceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: supabaseJwt("SUPABASE_SERVICE_ROLE_KEY"),
});

/**
 * Cliente Supabase con service role: bypassa RLS por completo.
 * Solo se usa desde Route Handlers / Server Actions para accesos que
 * necesitan filtrar manualmente (ej. cotizador público por slug).
 * El import "server-only" hace fallar el build si esto se importa
 * desde código de cliente.
 */
export function createSupabaseServiceClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serviceEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
