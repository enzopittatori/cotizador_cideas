-- =============================================================
-- 0006_quote_items.sql
-- Ítems de una cotización (implementa el "Agregar al presupuesto"
-- multi-producto). El acceso se resuelve vía el tenant_id de la
-- cotización padre, porque esta tabla no tiene tenant_id propio.
-- =============================================================

create table if not exists cotizador_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references cotizador_quotes (id) on delete cascade,
  product_id uuid references cotizador_products (id) on delete set null,
  inputs jsonb not null default '{}'::jsonb,
  cantidad numeric(12, 2) not null default 1,
  subtotal numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cotizador_quote_items_quote_idx on cotizador_quote_items (quote_id);
create index if not exists cotizador_quote_items_product_idx on cotizador_quote_items (product_id);

alter table cotizador_quote_items enable row level security;

create policy cotizador_quote_items_select on cotizador_quote_items
  for select
  using (
    exists (
      select 1 from cotizador_quotes q
      where q.id = quote_id
        and cotizador_has_tenant_role(q.tenant_id, array['admin', 'vendedor'])
    )
  );

create policy cotizador_quote_items_insert on cotizador_quote_items
  for insert
  with check (
    exists (
      select 1 from cotizador_quotes q
      where q.id = quote_id
        and cotizador_has_tenant_role(q.tenant_id, array['admin', 'vendedor'])
    )
  );

create policy cotizador_quote_items_update on cotizador_quote_items
  for update
  using (
    exists (
      select 1 from cotizador_quotes q
      where q.id = quote_id
        and cotizador_has_tenant_role(q.tenant_id, array['admin', 'vendedor'])
    )
  )
  with check (
    exists (
      select 1 from cotizador_quotes q
      where q.id = quote_id
        and cotizador_has_tenant_role(q.tenant_id, array['admin', 'vendedor'])
    )
  );

create policy cotizador_quote_items_delete on cotizador_quote_items
  for delete
  using (
    exists (
      select 1 from cotizador_quotes q
      where q.id = quote_id
        and cotizador_has_tenant_role(q.tenant_id, array['admin'])
    )
  );
