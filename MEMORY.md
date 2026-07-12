# MEMORY.md — Estado del proyecto Cotizador Multi-Industria

> Este archivo se actualiza en cada sesión relevante para que cualquier chat nuevo sepa
> en qué punto está el proyecto sin tener que releer todo el historial. No reemplaza a
> `CLAUDE.md` (reglas fijas) ni a `plan-cotizador-multi-industria.md` (plan de producto):
> este archivo es el "dónde estamos ahora".

## Última actualización
2026-07-12 — Enzo (asistente) instaló tooling de desarrollo para el proyecto.

## Fase actual
**Fase 0 — arranque.** Todavía no hay código de la app (`src/`, `supabase/migrations/` no
existen aún). Solo están en el repo:
- `CLAUDE.md` — reglas de trabajo del proyecto (leer siempre antes de tocar código).
- `plan-cotizador-multi-industria.md` — plan de producto completo (nota: `CLAUDE.md` lo
  referencia como `docs/plan-cotizador-multi-industria.md`, pero hoy vive en la raíz del
  repo — revisar si hay que moverlo a `docs/` cuando se arme la estructura real).

No se ha inicializado como repositorio git todavía.

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

## Próximos pasos sugeridos
- Confirmar con Carla si arrancamos Fase 0 (scaffolding Next.js + Supabase + estructura
  de carpetas de `CLAUDE.md`) o si hay algo previo pendiente.
- Si se arranca código, decidir si se inicializa git ahora o más adelante.
- Revisar la discrepancia de ubicación de `plan-cotizador-multi-industria.md` (raíz vs
  `docs/`) antes de que el plan quede desincronizado con las referencias de `CLAUDE.md`.
