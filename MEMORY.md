# MEMORY.md — Estado del proyecto Cotizador Multi-Industria

> Este archivo se actualiza en cada sesión relevante para que cualquier chat nuevo sepa
> en qué punto está el proyecto sin tener que releer todo el historial. No reemplaza a
> `CLAUDE.md` (reglas fijas) ni a `plan-cotizador-multi-industria.md` (plan de producto):
> este archivo es el "dónde estamos ahora".

## Última actualización
2026-07-12 — **FASE 0 CERRADA Y VALIDADA EN PRODUCCIÓN.** Login real por HTTPS en
`cotizador.sentidocomun.click` funcionando: usuario superadmin entra y ve el panel
`/super`. Validado con Playwright contra producción. Próximo paso: Fase 1.

## Lección clave de deploy (leer antes de tocar env vars)
Las variables `NEXT_PUBLIC_*` quedan **horneadas en la imagen durante el build de
GitHub Actions** (desde los GitHub Secrets del repo, pasadas como build-args). Los
valores que se pongan en Portainer para esas variables **NO tienen ningún efecto** —
verificado empíricamente (se apuntó la URL a un listener local vía env y la app la
ignoró). Solo `SUPABASE_SERVICE_ROLE_KEY` y `BASE_URL` (sin prefijo NEXT_PUBLIC_) se
leen en runtime desde el env del stack.

**Bug que costó horas:** el secret de GitHub `NEXT_PUBLIC_SUPABASE_ANON_KEY` se había
cargado con el prefijo `SUPABASE_ANON_KEY=` pegado adelante del token (se copió la
línea completa del stack de supabase). Kong respondía `401 Invalid authentication
credentials` (ese mensaje es de Kong key-auth, NO de GoTrue — GoTrue con password mala
da `400 Invalid login credentials`). Diagnóstico definitivo: interceptor de fetch
(`NODE_OPTIONS=--require hook.js`) sobre la imagen real corriendo local mostró el
header `apikey` con el prefijo. Desde entonces `src/lib/env.ts` valida en build time
que las keys tengan formato JWT (`^eyJ` + 3 partes, con trim) — un secret mal pegado
ahora rompe el build con mensaje claro en vez de fallar mudo en producción.

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
**Fase 0 — CERRADA (2026-07-12).** Criterio de salida cumplido y verificado en el
servidor real: login por HTTPS → dashboard `/super` vacío → todo corriendo en la
infra de Carla/Enzo (Swarm + Traefik + Supabase self-hosted). Migraciones 0001..0009
aplicadas en el Supabase de producción; usuario `cideas.consulting@gmail.com` es
superadmin (única fila en `cotizador_memberships`).

**Siguiente: Fase 1** (aún NO arrancada — esperar pedido explícito): motor de
cotización (`calculate.ts` + tests), 2 plantillas de industria (revestimientos +
casas modulares), formulario dinámico, multi-producto, texto de presupuesto con
Claude API + caché, modo cliente público `[slug]`, modo vendedor, panel admin básico.

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

## Infraestructura real del servidor (compartida el 2026-07-12)
- **Docker Swarm + Portainer CE 2.33.3** en un VPS, todos los stacks "Type: Swarm".
  Stacks existentes: cazaofertas, chatwoot, crm-cideas, evolution, minio, n8n, pgvector,
  planovivo, portainer, postgres, supabase, traefik.
- **Supabase self-hosted (setup "OrionDesign/SetupOrion")** como stack Swarm:
  - URL pública (Kong via Traefik): `https://sssupabase.sentidocomun.click` — esto es
    `NEXT_PUBLIC_SUPABASE_URL`.
  - Studio protegido con basic auth de Kong (usuario `admin` + password en el env
    `DASHBOARD_PASSWORD` del servicio kong del stack supabase).
  - La anon key y la service key están en el propio stack (`SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_KEY` en los servicios studio/kong). NO están guardadas en este
    repo ni en este archivo a propósito — se copian de ahí cuando hagan falta.
  - El Postgres (`db`) NO está expuesto públicamente; solo vive en la red `VpsNet`.
    Por eso las migraciones se corren desde el SQL Editor de Supabase Studio, no con
    `psql` desde afuera.
  - GoTrue (auth): `GOTRUE_SITE_URL` apunta a `crm.sentidocomun.click` y la
    `GOTRUE_URI_ALLOW_LIST` solo lista URLs del CRM y de planovivo. Para el login por
    password de Fase 0 no bloquea nada, pero **cuando usemos flujos de email (reset de
    contraseña, invitaciones) habrá que agregar `https://cotizador.sentidocomun.click`
    a esa allow list** en el stack supabase.
  - JWT_EXP=31536000 (sesiones de 1 año). Storage usa MinIO S3
    (`ss3.sentidocomun.click`) como backend — relevante cuando creemos el bucket
    `cotizador-assets` en Fase 1+.
- El stack `crm-cideas` (referencia de patrón): imagen de GHCR, red `VpsNet`,
  certresolver `letsencryptresolver` — nuestro `docker-compose.yml` está calcado de ahí.

## Estado del deploy (todo hecho, referencia operativa)
- GitHub Secrets del repo: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  configurados y correctos (el build valida su formato desde el commit `71b1131`).
- Imagen `ghcr.io/enzopittatori/cotizador_cideas` es **pública** (decisión consciente:
  no contiene secretos, la anon key horneada es pública por diseño; la service key
  solo entra por env en runtime). Si algún día se vuelve privada, configurar registry
  auth en Portainer.
- Stack `cotizador` en Portainer: 4 env vars cargadas (las 2 NEXT_PUBLIC_ ahí son
  decorativas — ver "Lección clave" arriba — pero se dejan como documentación).
- DNS: registro A `cotizador.sentidocomun.click` → 38.242.221.63 (misma IP que crm).
- Flujo de deploy de cada cambio: push a `main` → GitHub Actions buildea y publica a
  GHCR (~2-3 min) → Portainer → Stacks → cotizador → Update the stack con
  "Re-pull image and redeploy" → ~30 seg.
- Pendientes de seguridad sugeridos a Enzo (no bloqueantes): rotar el PAT de GitHub
  compartido por chat, rotar la app password de Gmail del stack supabase, y agregar
  `https://cotizador.sentidocomun.click` a `GOTRUE_URI_ALLOW_LIST` cuando usemos
  flujos de email en fases futuras.

## Próximos pasos
- Arrancar Fase 1 cuando Carla/Enzo lo pidan: motor de cotización real
  (`calculate.ts` con tests), 2 plantillas de industria completas (revestimientos +
  casas modulares), integración con Claude API para el texto del presupuesto,
  multi-producto, modo cliente público funcional.
- Anotado para Fase 2 (pedido de Enzo del 2026-07-12): en el panel superadmin, la
  gestión de miembros debería mostrar nombre/email legibles (como la tabla
  `crm_profiles` de su CRM), no solo `user_id` — hoy crear un membership requiere SQL
  a mano.
- Pendiente menor: `npm audit` marca 2 vulnerabilidades moderadas de `postcss` (XSS en
  stringify), pero están en una copia de `postcss` empaquetada *dentro* de
  `node_modules/next` (herramienta interna de build de Next, no nuestro `postcss` de
  primer nivel que ya está en la versión segura). No hay acción nuestra posible sin
  downgradear Next; no es explotable en runtime de producción.
