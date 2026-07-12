-- =============================================================
-- promote_superadmin.sql — NO es una migración numerada.
--
-- Corré esto UNA VEZ, a mano, en el SQL Editor de Supabase Studio,
-- después de crear tu primer usuario (Carla) en Authentication →
-- Users → Add user. Reemplazá el email antes de ejecutar.
-- =============================================================

insert into cotizador_memberships (user_id, tenant_id, rol)
select id, null, 'superadmin'
from auth.users
where email = 'REEMPLAZAR@EJEMPLO.COM'
on conflict (user_id, tenant_id, rol) do nothing;
