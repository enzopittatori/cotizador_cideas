-- =============================================================
-- 0003_quoter_configs.sql
-- Config activa de cotizador por tenant (campos, reglas de precio,
-- textos, opciones) — también versionada.
-- =============================================================

create table if not exists cotizador_quoter_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cotizador_tenants (id) on delete cascade,
  version integer not null default 1,
  campos jsonb not null default '[]'::jsonb,
  reglas_precio jsonb not null default '[]'::jsonb,
  textos jsonb not null default '{}'::jsonb,
  opciones jsonb not null default '{}'::jsonb,
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cotizador_quoter_configs_tenant_idx on cotizador_quoter_configs (tenant_id);

alter table cotizador_quoter_configs enable row level security;

create trigger cotizador_quoter_configs_set_updated_at
  before update on cotizador_quoter_configs
  for each row execute function cotizador_set_updated_at();

-- El modo cliente (público) lee esta tabla vía Route Handler con
-- service role, nunca con la anon key: por eso no hay policy pública.
create policy cotizador_quoter_configs_select on cotizador_quoter_configs
  for select
  using (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_quoter_configs_insert on cotizador_quoter_configs
  for insert
  with check (cotizador_has_tenant_role(tenant_id, array['admin']));

create policy cotizador_quoter_configs_update on cotizador_quoter_configs
  for update
  using (cotizador_has_tenant_role(tenant_id, array['admin']))
  with check (cotizador_has_tenant_role(tenant_id, array['admin']));

create policy cotizador_quoter_configs_delete on cotizador_quoter_configs
  for delete
  using (cotizador_has_tenant_role(tenant_id, array['admin']));
