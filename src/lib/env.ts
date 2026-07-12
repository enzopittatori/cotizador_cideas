import { z } from "zod";

// Las keys de Supabase son JWTs: siempre empiezan con "eyJ". Validarlo
// acá hace que el BUILD falle con un mensaje claro si un secret quedó
// mal cargado (ej. pegado como "SUPABASE_ANON_KEY=eyJ..." con el nombre
// adelante, o cortado) en vez de fallar en producción con un 401 mudo.
// El trim cubre espacios/saltos de línea arrastrados al copiar.
const supabaseJwt = (nombre: string) =>
  z
    .string()
    .trim()
    .regex(
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      `${nombre} no parece un JWT de Supabase: debe empezar con "eyJ" y tener 3 partes separadas por puntos. Revisá que hayas pegado SOLO el token, sin el nombre de la variable adelante.`
    );

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseJwt("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export { supabaseJwt };
