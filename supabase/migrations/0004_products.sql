-- =============================================================
-- 0004_products.sql
-- =============================================================

create table if not exists cotizador_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cotizador_tenants (id) on delete cascade,
  nombre text not null,
  categoria text,
  atributos jsonb not null default '{}'::jsonb,
  precio_base numeric(12, 2) not null default 0,
  unidad text,
  beneficios jsonb not null default '[]'::jsonb,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cotizador_products_tenant_idx on cotizador_products (tenant_id);
create index if not exists cotizador_products_tenant_activo_idx on cotizador_products (tenant_id, activo);

alter table cotizador_products enable row level security;

create trigger cotizador_products_set_updated_at
  before update on cotizador_products
  for each row execute function cotizador_set_updated_at();

-- El modo cliente (público) lee productos activos vía Route Handler
-- con service role; no hay policy de lectura pública acá.
create policy cotizador_products_select on cotizador_products
  for select
  using (cotizador_has_tenant_role(tenant_id, array['admin', 'vendedor']));

create policy cotizador_products_insert on cotizador_products
  for insert
  with check (cotizador_has_tenant_role(tenant_id, array['admin']));

create policy cotizador_products_update on cotizador_products
  for update
  using (cotizador_has_tenant_role(tenant_id, array['admin']))
  with check (cotizador_has_tenant_role(tenant_id, array['admin']));

create policy cotizador_products_delete on cotizador_products
  for delete
  using (cotizador_has_tenant_role(tenant_id, array['admin']));
