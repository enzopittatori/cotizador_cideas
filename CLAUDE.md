# CLAUDE.md — Cotizador Multi-Industria (Cideas)

Este archivo define cómo se trabaja en este repositorio. Leelo completo antes de escribir código. Ante cualquier conflicto entre una instrucción puntual y este documento, preguntá antes de avanzar.

---

## 1. Qué es este proyecto

SaaS multi-tenant de cotizadores configurables. Un motor único de cotización sirve a múltiples industrias mediante configuraciones JSON (campos + reglas de precio + textos). Dos modos de uso sobre el mismo motor:

- **Modo cliente** (público, sin login): el cliente final se autocotiza y envía el resumen al vendedor por link `wa.me`.
- **Modo vendedor** (interno, con login): el vendedor cotiza rápido, edita el texto generado y entrega el presupuesto (PDF / impresión / WhatsApp).

El plan completo del producto está en `docs/plan-cotizador-multi-industria.md`. Este archivo define el CÓMO técnico.

---

## 2. Reglas de oro (no negociables)

1. **Disciplina de fases.** Se trabaja fase por fase (0 → 1 → 2 → 3). No se implementa nada de una fase futura sin pedido explícito. Cada fase cierra cuando su criterio de salida está validado por Carla en su servidor.
2. **Prefijo `cotizador_` en TODO lo que toque Supabase.** Tablas, vistas, funciones, triggers: `cotizador_*`. Bucket de Storage: `cotizador-assets`. La instancia de Supabase es compartida con otros proyectos; jamás crear objetos sin prefijo ni tocar objetos que no lo tengan.
3. **RLS siempre.** Ninguna tabla se crea sin sus políticas de Row Level Security en la misma migración. Aislamiento por `tenant_id` en todas las tablas de datos. Sin excepciones, ni "para probar".
4. **El precio se calcula SOLO server-side.** El cliente nunca envía totales ni subtotales; envía inputs, el server calcula y persiste. Cualquier cálculo en el frontend es solo visualización optimista y se revalida en el server.
5. **Nada de WhatsApp Business API.** WhatsApp funciona exclusivamente con links `wa.me/{numero}?text={mensaje}` generados server-side y URL-encoded. Decisión de producto firme.
6. **Secretos solo en el server.** `ANTHROPIC_API_KEY`, credenciales SMTP y `SUPABASE_SERVICE_ROLE_KEY` jamás llegan al bundle del cliente. Todo acceso privilegiado pasa por Route Handlers o Server Actions.
7. **La config de industria es un contrato versionado.** Los JSON de plantillas tienen `version` y se validan con Zod contra un schema único. Un cambio de estructura del schema exige migración de las configs existentes.
8. **No introducir dependencias nuevas sin justificarlo** en una línea en el PR/commit. Preferir lo que ya está en el stack.

---

## 3. Stack y entorno

- **Next.js 14+ (App Router) + TypeScript estricto + Tailwind CSS**
- **Supabase self-hosted** (Postgres + Auth + Storage + RLS) — instancia existente, compartida
- **Claude API** (`claude-sonnet-4-6`) para textos de presupuesto
- **Nodemailer + SMTP** para emails (n8n queda opcional para fases futuras, con flujo único multi-tenant)
- **Docker + Traefik + Portainer** para deploy en `cotizador.sentidocomun.click`
- **SheetJS (xlsx)** server-side para import de Excel
- **@react-pdf/renderer** para PDFs de presupuesto

URL base SIEMPRE desde `process.env.BASE_URL` (hoy `https://cotizador.sentidocomun.click`, migrable a futuro sin tocar código).

---

## 4. Estructura del repositorio

```
/
├── CLAUDE.md
├── docs/
│   └── plan-cotizador-multi-industria.md
├── supabase/
│   └── migrations/            # SQL numerado: 0001_init.sql, 0002_... (tablas + RLS juntas)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   └── [slug]/        # Cotizador público por tenant (modo cliente)
│   │   ├── (app)/             # Rutas autenticadas
│   │   │   ├── cotizar/       # Modo vendedor
│   │   │   ├── admin/         # Panel del negocio
│   │   │   └── super/         # Panel superadmin
│   │   ├── api/               # Route Handlers (cálculo, texto IA, import, pdf, wa-link)
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── engine/            # ★ Motor de cotización (puro, sin IO)
│   │   │   ├── schema.ts      # Zod schemas de config de industria
│   │   │   ├── calculate.ts   # Cálculo de precios (funciones puras, testeadas)
│   │   │   └── templates/     # JSON de plantillas de industria versionadas
│   │   ├── ai/                # Cliente Claude + prompts + caché de textos
│   │   ├── supabase/          # Clientes (browser/server/service) + helpers RLS
│   │   ├── whatsapp.ts        # Generación de links wa.me (encoding incluido)
│   │   ├── pdf/               # Generación de presupuestos PDF
│   │   └── email/             # Templates + envío SMTP
│   ├── components/            # UI compartida (theming por tenant vía CSS vars)
│   └── types/                 # Tipos compartidos (derivados de Zod donde aplique)
├── Dockerfile
├── docker-compose.yml         # Con labels de Traefik
└── .env.example               # SIEMPRE actualizado con cada variable nueva
```

**El directorio `src/lib/engine/` es el corazón del producto.** Debe ser: puro (sin llamadas a red ni DB), determinístico, tipado estricto y con tests. Todo lo demás (UI, API, DB) consume el engine, nunca al revés.

---

## 5. Convenciones de código

- TypeScript `strict: true`. Prohibido `any`; usar `unknown` + narrowing si hace falta.
- Validación de TODO input externo (forms, Excel, API) con Zod en el borde. Adentro del sistema circulan solo tipos ya validados.
- Server Components por defecto; `"use client"` solo donde hay interactividad real.
- Nombres: tablas y columnas en `snake_case` (español, como el modelo del plan); código en `camelCase`; componentes en `PascalCase`.
- Errores: nunca tragar excepciones. Los Route Handlers devuelven errores tipados `{ error: { code, message } }` con status HTTP correcto.
- Commits: convencionales (`feat:`, `fix:`, `chore:`, `docs:`) con scope cuando ayude (`feat(engine): ...`).
- Cada feature incluye su caso borde: import de Excel con filas inválidas, config JSON de versión vieja, tenant suspendido, producto sin imagen.

---

## 6. Base de datos

- Migraciones SQL numeradas en `supabase/migrations/`, idempotentes cuando sea posible. Nunca modificar una migración ya aplicada: se corrige con una migración nueva.
- Cada migración que crea una tabla incluye en el mismo archivo: la tabla, sus índices, `enable row level security` y sus políticas.
- Patrón de políticas RLS:
  - `superadmin`: acceso total (rol verificado vía `cotizador_memberships`).
  - `admin` / `vendedor`: solo filas de su `tenant_id`.
  - Acceso público (modo cliente): NO se hace con anon key contra las tablas; pasa por Route Handlers con service role que filtran por slug y exponen solo lo necesario (config publicada, productos activos).
- `cotizador_quotes.texto_generado` nunca se pisa: la edición del vendedor va a `texto_editado`.

---

## 7. Integración con Claude API

- Modelo: `claude-sonnet-4-6`. Llamadas SOLO desde el server.
- Antes de llamar: buscar en `cotizador_text_cache` por `hash_inputs` (hash estable de tenant_id + ítems + variables + versión del prompt). Hit = no se llama a la API.
- El prompt del texto de presupuesto sigue la estructura del plan (sección 4.4): qué pidió → 1-2 beneficios con impacto personal para el cliente ideal del tenant → para qué sirve, breve → precio y condiciones. Tono conversacional, sin clichés, el cliente como protagonista. Los beneficios y el cliente ideal salen de la config del tenant, no se inventan.
- Versionar los prompts (constante `PROMPT_VERSION` incluida en el hash de caché) para poder iterarlos sin servir textos viejos.
- Timeout y fallback: si la API falla, se entrega un texto por template determinístico (nunca se bloquea la cotización por la IA).

---

## 8. Deploy

- `Dockerfile` multi-stage (build → runner standalone de Next.js).
- `docker-compose.yml` con labels de Traefik para `cotizador.sentidocomun.click` (router HTTPS, certresolver existente). La red externa de Traefik se referencia, no se crea.
- Healthcheck en `/api/health`.
- Variables de entorno documentadas en `.env.example`; el deploy se gestiona desde Portainer.

---

## 9. Definition of Done (por fase)

Una fase está terminada cuando:
1. Su criterio de salida (definido en el plan) fue validado por Carla en su servidor, no solo en local.
2. Las migraciones corren limpias sobre una base con las fases anteriores aplicadas.
3. El engine tiene tests verdes (`calculate` cubierto para cada plantilla de industria activa).
4. `.env.example` y este CLAUDE.md reflejan cualquier cambio de configuración o convención.
5. No quedan `TODO` sin issue/registro asociado.

---

## 10. Cómo trabajar conmigo (Carla)

- Explicame las decisiones técnicas en lenguaje claro y breve; soy técnica a nivel usuario avanzado (manejo Docker, Portainer, n8n, Supabase) pero no programadora de oficio.
- Ante ambigüedad de producto: preguntá, no asumas.
- Preferí soluciones simples y operables por una persona antes que arquitecturas "perfectas".
- Todo lo que necesite que yo haga en mi servidor (crear bucket, correr migración, configurar DNS) pasámelo como checklist paso a paso.
