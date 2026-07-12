-- =============================================================
-- 0001_tenants_and_memberships.sql
-- cotizador_tenants, cotizador_memberships + funciones helper de RLS
-- =============================================================

create extension if not exists pgcrypto;

-- Función genérica para mantener updated_at, reusada por todas las
-- tablas cotizador_* que tienen esa columna.
create or replace function cotizador_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- cotizador_tenants
-- =========================================================
create table if not exists cotizador_tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  industria_base text,
  plan text not null default 'trial' check (plan in ('trial', 'basico', 'pro')),
  estado text not null default 'activo' check (estado in ('activo', 'suspendido')),
  whatsapp_vendedor text,
  cliente_ideal text,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cotizador_tenants_slug_idx on cotizador_tenants (slug);
create index if not exists cotizador_tenants_estado_idx on cotizador_tenants (estado);

alter table cotizador_tenants enable row level security;

create trigger cotizador_tenants_set_updated_at
  before update on cotizador_tenants
  for each row execute function cotizador_set_updated_at();

-- =========================================================
-- cotizador_memberships
-- =========================================================
create table if not exists cotizador_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references cotizador_tenants (id) on delete cascade,
  rol text not null check (rol in ('superadmin', 'admin', 'vendedor')),
  created_at timestamptz not null default now(),
  constraint cotizador_memberships_tenant_rol_check check (
    (rol = 'superadmin' and tenant_id is null) or
    (rol <> 'superadmin' and tenant_id is not null)
  ),
  constraint cotizador_memberships_user_tenant_rol_unique unique (user_id, tenant_id, rol)
);

create index if not exists cotizador_memberships_user_idx on cotizador_memberships (user_id);
create index if not exists cotizador_memberships_tenant_idx on cotizador_memberships (tenant_id);

alter table cotizador_memberships enable row level security;

-- =========================================================
-- Funciones helper de RLS (security definer: evitan la recursión
-- que se daría si una policy sobre cotizador_memberships tuviera que
-- volver a leer cotizador_memberships bajo RLS para resolverse).
-- =========================================================
create or replace function cotizador_is_superadmin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from cotizador_memberships m
    where m.user_id = uid and m.rol = 'superadmin'
  );
$$;

create or replace function cotizador_has_tenant_role(tid uuid, roles text[], uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    (tid is not null and exists (
      select 1 from cotizador_memberships m
      where m.user_id = uid and m.tenant_id = tid and m.rol = any(roles)
    ))
    or cotizador_is_superadmin(uid);
$$;

-- =========================================================
-- Políticas RLS — cotizador_tenants
-- =========================================================
create policy cotizador_tenants_select on cotizador_tenants
  for select
  using (
    cotizador_is_superadmin()
    or cotizador_has_tenant_role(id, array['admin', 'vendedor'])
  );

create policy cotizador_tenants_insert on cotizador_tenants
  for insert
  with check (cotizador_is_superadmin());

create policy cotizador_tenants_update on cotizador_tenants
  for update
  using (
    cotizador_is_superadmin()
    or cotizador_has_tenant_role(id, array['admin'])
  )
  with check (
    cotizador_is_superadmin()
    or cotizador_has_tenant_role(id, array['admin'])
  );

create policy cotizador_tenants_delete on cotizador_tenants
  for delete
  using (cotizador_is_superadmin());

-- =========================================================
-- Políticas RLS — cotizador_memberships
-- =========================================================
create policy cotizador_memberships_select on cotizador_memberships
  for select
  using (
    user_id = auth.uid()
    or cotizador_is_superadmin()
    or cotizador_has_tenant_role(tenant_id, array['admin'])
  );

-- Un admin puede sumar vendedores a su propio tenant; el superadmin
-- puede crear cualquier membership (incluida la de otros superadmins).
-- La creación del auth.users detrás de esto se hace aparte (Auth /
-- service role), esto solo gobierna la fila de cotizador_memberships.
create policy cotizador_memberships_insert on cotizador_memberships
  for insert
  with check (
    cotizador_is_superadmin()
    or (
      tenant_id is not null
      and rol = 'vendedor'
      and cotizador_has_tenant_role(tenant_id, array['admin'])
    )
  );

create policy cotizador_memberships_update on cotizador_memberships
  for update
  using (
    cotizador_is_superadmin()
    or (
      tenant_id is not null
      and rol = 'vendedor'
      and cotizador_has_tenant_role(tenant_id, array['admin'])
    )
  )
  with check (
    cotizador_is_superadmin()
    or (
      tenant_id is not null
      and rol = 'vendedor'
      and cotizador_has_tenant_role(tenant_id, array['admin'])
    )
  );

create policy cotizador_memberships_delete on cotizador_memberships
  for delete
  using (
    cotizador_is_superadmin()
    or (
      tenant_id is not null
      and rol = 'vendedor'
      and cotizador_has_tenant_role(tenant_id, array['admin'])
    )
  );
