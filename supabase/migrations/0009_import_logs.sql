-- =============================================================
-- 0009_import_logs.sql
-- =============================================================

create table if not exists cotizador_import_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cotizador_tenants (id) on delete cascade,
  archivo text not null,
  filas_ok integer not null default 0,
  filas_error integer not null default 0,
  detalle jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cotizador_import_logs_tenant_idx on cotizador_import_logs (tenant_id);

alter table cotizador_import_logs enable row level security;

create policy cotizador_import_logs_select on cotizador_import_logs
  for select
  using (cotizador_has_tenant_role(tenant_id, array['admin']));

create policy cotizador_import_logs_insert on cotizador_import_logs
  for insert
  with check (cotizador_has_tenant_role(tenant_id, array['admin']));
