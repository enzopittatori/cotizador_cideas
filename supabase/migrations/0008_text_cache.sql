-- =============================================================
-- 0008_text_cache.sql
-- Caché de textos de Claude: misma combinación de inputs = mismo
-- texto, para no repagar la API. Se lee/escribe únicamente desde
-- el server con service role (el hash de inputs incluye tenant_id
-- + ítems + variables + PROMPT_VERSION, ver CLAUDE.md §7).
-- =============================================================

create table if not exists cotizador_text_cache (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cotizador_tenants (id) on delete cascade,
  hash_inputs text not null,
  texto text not null,
  model text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists cotizador_text_cache_tenant_hash_idx
  on cotizador_text_cache (tenant_id, hash_inputs);

alter table cotizador_text_cache enable row level security;

-- Sin policies de admin/vendedor a propósito: esta tabla la toca
-- solo el service role (bypassa RLS) desde el Route Handler de
-- generación de texto. El superadmin puede inspeccionarla para debug.
create policy cotizador_text_cache_superadmin_select on cotizador_text_cache
  for select
  using (cotizador_is_superadmin());
