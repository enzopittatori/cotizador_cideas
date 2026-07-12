-- =============================================================
-- 0005_quotes.sql
-- Cabecera de cotización (multi-producto: los ítems van en
-- cotizador_quote_items, migración 0006).
-- =============================================================

create table if not exists cotizador_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cotizador_tenants (id) on delete cascade,
  modo text not null check (modo in ('vendedor', 'cliente')),
  vendedor_id uuid references auth.users (id) on delete set null,
  total numeric(12, 2) not null default 0,
  texto_generado text,
  texto_editado text,
  cliente_nombre text,
  cliente_telefono text,
  created_at timestamptz not null default now()
);

create index if not exists cotizador_quotes_tenant_idx on cotizador_quotes (tenant_id);
create index if not exists cotizador_quotes_tenant_created_idx on cotizador_quotes (tenant_id, created_at desc);
create index if not exists cotizador_quotes_vendedor_idx on cotizador_quotes (vendedor_id);

alter table cotizador_quotes enable row level security;

-- Las cotizaciones en modo cliente (público, sin login) se insertan
-- desde un Route Handler con service role, no vía RLS con anon key.
create policy cotizador_quotes_select on cotizador_quotes
  for select
  using (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_quotes_insert on cotizador_quotes
  for insert
  with check (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_quotes_update on cotizador_quotes
  for update
  using (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']))
  with check (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_quotes_delete on cotizador_quotes
  for delete
  using (cotizador_has_tenant_role(tenant_id, array['admin']));
