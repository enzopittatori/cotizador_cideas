-- =============================================================
-- 0002_industry_templates.sql
-- Catálogo global de plantillas de industria (config JSON versionada)
-- =============================================================

create table if not exists cotizador_industry_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  config jsonb not null,
  version integer not null default 1,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cotizador_industry_templates_slug_idx on cotizador_industry_templates (slug);

alter table cotizador_industry_templates enable row level security;

create trigger cotizador_industry_templates_set_updated_at
  before update on cotizador_industry_templates
  for each row execute function cotizador_set_updated_at();

-- Catálogo global de solo lectura para cualquier usuario autenticado
-- del sistema (lo necesita un admin al elegir industria base en el
-- onboarding); solo el superadmin lo escribe.
create policy cotizador_industry_templates_select on cotizador_industry_templates
  for select
  using (auth.uid() is not null);

create policy cotizador_industry_templates_insert on cotizador_industry_templates
  for insert
  with check (cotizador_is_superadmin());

create policy cotizador_industry_templates_update on cotizador_industry_templates
  for update
  using (cotizador_is_superadmin())
  with check (cotizador_is_superadmin());

create policy cotizador_industry_templates_delete on cotizador_industry_templates
  for delete
  using (cotizador_is_superadmin());
