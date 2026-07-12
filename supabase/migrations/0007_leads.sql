-- =============================================================
-- 0007_leads.sql
-- Nace con columna `estado` tipo kanban: es la base del mini CRM
-- de Fase 3, pero acá solo se crea la tabla (sin UI todavía).
-- =============================================================

create table if not exists cotizador_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cotizador_tenants (id) on delete cascade,
  quote_id uuid references cotizador_quotes (id) on delete set null,
  nombre text,
  telefono text,
  email text,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'negociando', 'ganado', 'perdido')),
  notas text,
  canal text check (canal in ('whatsapp', 'pdf', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cotizador_leads_tenant_idx on cotizador_leads (tenant_id);
create index if not exists cotizador_leads_tenant_estado_idx on cotizador_leads (tenant_id, estado);

alter table cotizador_leads enable row level security;

create trigger cotizador_leads_set_updated_at
  before update on cotizador_leads
  for each row execute function cotizador_set_updated_at();

create policy cotizador_leads_select on cotizador_leads
  for select
  using (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_leads_insert on cotizador_leads
  for insert
  with check (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_leads_update on cotizador_leads
  for update
  using (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']))
  with check (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_leads_delete on cotizador_leads
  for delete
  using (cotizador_has_tenant_role(tenant_id, array['admin']));
