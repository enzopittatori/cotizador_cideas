# MEMORY.md — Estado del proyecto Cotizador Multi-Industria

> Este archivo se actualiza en cada sesión relevante para que cualquier chat nuevo sepa
> en qué punto está el proyecto sin tener que releer todo el historial. No reemplaza a
> `CLAUDE.md` (reglas fijas) ni a `plan-cotizador-multi-industria.md` (plan de producto):
> este archivo es el "dónde estamos ahora".

## Última actualización
2026-07-12 — Fase 0 construida (código completo) y pendiente de validación de Carla en su servidor.

## Control de versiones
- Repo remoto: https://github.com/enzopittatori/cotizador_cideas (branch `main`).
- Git local inicializado el 2026-07-12; primer commit con CLAUDE.md, plan de producto,
  `.mcp.json`, `.gitignore` y este `MEMORY.md`.
- `.gitignore` excluye `.env`, `.env.*` (permite `.env.example`), `node_modules/`,
  `.next/`, `graphify-out/` y artefactos de build/editor. **Regla dura: `.env` nunca se
  sube a GitHub** — verificar `git status` antes de cualquier commit que toque variables
  de entorno o credenciales.
- El Personal Access Token de GitHub usado para el push inicial NO quedó guardado en
  `.git/config` (se pasó solo en la URL de ese push puntual). Para próximos pushes desde
  esta máquina, configurar autenticación persistente (credential manager de Windows, SSH
  key, o `gh auth login`) en vez de reutilizar el token en texto plano.

## Fase actual
**Fase 0 — construida en código, PENDIENTE de validación de Carla en su servidor.**
No se marca como cerrada hasta que ella confirme que corre por HTTPS en
`cotizador.sentidocomun.click` (criterio de salida del plan, sección 6). Ver el
checklist paso a paso que le pasé en el chat del 2026-07-12 para ese último tramo
(migraciones + variables de entorno + deploy).

Qué existe hoy:
- `docs/plan-cotizador-multi-industria.md` — ya movido a `docs/` (coincide con lo que
  referencia `CLAUDE.md`, se resolvió la discrepancia que había antes).
- Next.js 16.2.10 + React 18.3.1 + TypeScript 5.9 + Tailwind 3.4 + App Router, en
  `src/app/` con la estructura exacta de `CLAUDE.md` §4: route groups `(public)/[slug]`
  (vacío a propósito, es Fase 1), `(app)/{login,cotizar,admin,super}`, `api/health`.
  Nota de versión: `CLAUDE.md` pide "Next.js 14+"; se usó la última estable (16.x) en
  vez de fijar 14 exacto, porque "+" ya lo permite y no tiene sentido arrancar un
  proyecto nuevo dos majors atrás. Next 16 renombró `middleware.ts` → `src/proxy.ts`
  (mismo propósito, función `proxy()` en vez de `middleware()`) — si en algún momento
  se busca doc de "middleware" y no aparece nada nuevo, es por este rename.
- `supabase/migrations/0001..0009` — las 10 tablas `cotizador_*` de `CLAUDE.md` §5,
  cada una con su RLS. Patrón: dos funciones `security definer`
  (`cotizador_is_superadmin`, `cotizador_has_tenant_role`) evitan la recursión de RLS
  sobre la propia tabla `cotizador_memberships`. `cotizador_text_cache` y las tablas de
  catálogo/configs NO tienen policy de lectura pública a propósito — el modo cliente
  (sin login) accede siempre vía Route Handler con service role, nunca con la anon key
  directo a la tabla (regla de oro #4 y arquitectura del plan §5).
- `supabase/seed/promote_superadmin.sql` — NO es una migración numerada. Es el paso
  manual de una sola vez para promover al primer usuario (Carla) a superadmin, después
  de que ella lo cree a mano en Supabase Studio. Está en el checklist.
- Auth: login por email/password (Server Action en `src/app/(app)/login/actions.ts`),
  `src/proxy.ts` protege `/cotizar`, `/admin`, `/super` (redirige a `/login` si no hay
  sesión), `/` resuelve a qué dashboard mandar según el rol (`src/lib/auth.ts` →
  `getCurrentMembership` / `requireRole`). Los tres dashboards son intencionalmente
  esqueletos vacíos con botón de logout — el criterio de salida de Fase 0 es "ves un
  dashboard vacío", no funcionalidad real.
- `src/lib/supabase/{server,browser,service}.ts` — tres clientes separados. `service.ts`
  importa `server-only` para que el build falle si algo del cliente intenta importarlo
  (hace cumplir la regla de oro #6 a nivel de compilación, no solo de disciplina).
- `src/lib/engine/schema.ts` — contrato Zod versionado (`INDUSTRY_CONFIG_VERSION = 1`)
  de la config de industria (campos/reglas_precio/textos/opciones). A propósito NO
  incluye `calculate.ts` todavía: la semántica de evaluación de `reglas_precio` es
  "Motor de cotización" y esa es tarea explícita de Fase 1, no de Fase 0.
- **Deploy: Docker Swarm vía Portainer, no `docker compose up` simple.** Carla compartió
  el stack real de su otro proyecto (`crm-cideas`) y el server corre Swarm (todos los
  stacks en su Portainer son "Type: Swarm"). Esto cambió el diseño del deploy:
  - `docker-compose.yml` reescrito al patrón real: red externa `VpsNet` (no
    `traefik-public`), certresolver `letsencryptresolver` (no `letsencrypt`), bloque
    `deploy:` con `mode: replicated`, `placement.constraints: node.role == manager`,
    labels de Traefik con `.service=cotizador` explícito y `passHostHeader=true` —
    calcado del stack `crm` que ya funciona en su Portainer.
  - Swarm **no soporta `build:`** en un stack file. Por eso la imagen se compila aparte
    y se publica en GHCR (`ghcr.io/enzopittatori/cotizador_cideas`), igual que `crm`
    (`ghcr.io/enzopittatori/crm-cideas`). El workflow
    `.github/workflows/docker-publish.yml` compila y pushea a GHCR automáticamente en
    cada push a `main` — Carla no necesita compilar nada a mano en el servidor.
  - Swarm tampoco soporta `env_file:` en el stack file. Las 4 variables
    (`BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`) están como `${VAR}` en `environment:`, y Portainer las
    sustituye desde el panel "Environment variables" al crear/editar el stack.
  - Detalle importante de Next.js: `NEXT_PUBLIC_SUPABASE_URL` y
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` quedan "horneadas" en el bundle del cliente durante
    el `next build`, así que además de estar en el `environment:` del stack (para el
    proceso Node en runtime) tienen que existir como **build args** en el momento de
    compilar la imagen. Por eso el workflow de GitHub Actions las pasa como
    `build-args` leyendo `secrets.NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` del repo
    (no son secretas en el sentido estricto — la anon key está pensada para ser
    pública — pero usar Secrets de GitHub es la forma más simple de pasarlas sin que
    queden hardcodeadas en el workflow).
- Validado: `npm run typecheck` limpio, `npm run build` limpio, smoke test en navegador
  (Playwright MCP) contra `npm run dev`, y build + run real de la imagen Docker
  (`docker build` + `docker run` local, `/api/health` respondió `{"status":"ok"}` desde
  dentro del contenedor). Todo esto contra un Supabase **dummy** — falta la validación
  real contra el Supabase self-hosted de Carla y contra Traefik en su servidor.

## Herramientas instaladas (2026-07-12)
- **Playwright MCP** (`@playwright/mcp`) — registrado en `.mcp.json` del proyecto
  (`npx @playwright/mcp@latest`). Para automatizar/testear la UI en navegador una vez
  que exista frontend.
- **Context7 MCP** — registrado en `.mcp.json` (`https://mcp.context7.com/mcp`), modo
  HTTP sin API key. Funciona en tier gratuito con rate limit bajo; si hace falta más
  cuota, sacar API key en context7.com/dashboard y pasarla como header
  `CONTEXT7_API_KEY`.
- **frontend-design plugin** (anthropics/claude-code) — ya estaba instalado y habilitado
  globalmente (`~/.claude/settings.json` → `enabledPlugins`). No requirió acción.
- **Graphify** (Graphify-Labs/graphify) — instalado como herramienta global vía
  `uv tool install graphifyy`. Da los comandos `graphify` y `graphify-mcp`. Se registró
  el skill (`graphify install`) para poder invocarlo con `/graphify .` desde el asistente.
  Primer mapa generado en `graphify-out/` (modo `--code-only`, sin LLM key, porque el
  repo todavía no tiene código real que analizar). Cuando haya más código y se quiera
  también extracción semántica de docs, correr `graphify .` con alguna de
  `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` / etc. seteada, o pasar `--backend`.

## Reglas de oro a no olvidar (resumen de CLAUDE.md)
- Todo objeto de Supabase con prefijo `cotizador_`; bucket `cotizador-assets`.
- RLS obligatorio en cada migración que crea tabla.
- Precio se calcula SOLO server-side.
- WhatsApp solo con links `wa.me`, nunca Business API.
- Secretos (Anthropic, SMTP, service role) nunca al bundle del cliente.
- Config de industria versionada y validada con Zod.
- Disciplina de fases: no adelantar trabajo de fases futuras sin pedido explícito.

## Próximos pasos
- **Pendiente de Carla:** decirme la URL de conexión (y de ser posible las keys) de su
  Supabase self-hosted — tiene un stack `supabase` corriendo en el mismo Portainer, hay
  que ver cómo lo expone (subdominio propio vía Traefik, o red interna de Swarm). Sin
  este dato no puede completar el `.env`/las env vars del stack.
- Carla corre el checklist de validación en su servidor (migraciones, secrets de GitHub,
  variables de entorno del stack en Portainer, `promote_superadmin.sql`) y confirma que
  carga por HTTPS.
- Recién ahí se cierra Fase 0 y arranca Fase 1: motor de cotización real
  (`calculate.ts`), 2 plantillas de industria completas (revestimientos + casas
  modulares), integración con Claude API para el texto del presupuesto, multi-producto,
  modo cliente público funcional.
- Pendiente menor: `npm audit` marca 2 vulnerabilidades moderadas de `postcss` (XSS en
  stringify), pero están en una copia de `postcss` empaquetada *dentro* de
  `node_modules/next` (herramienta interna de build de Next, no nuestro `postcss` de
  primer nivel que ya está en la versión segura). No hay acción nuestra posible sin
  downgradear Next; no es explotable en runtime de producción.
