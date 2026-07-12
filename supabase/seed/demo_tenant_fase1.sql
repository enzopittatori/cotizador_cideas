-- =============================================================
-- demo_tenant_fase1.sql — NO es una migración numerada.
--
-- Crea (idempotente) el tenant "demo" con la config de revestimientos
-- publicada y 3 productos, para validar la Fase 1 de punta a punta.
-- También registra las 2 plantillas de industria en el catálogo global.
--
-- Correr UNA VEZ en el SQL Editor de Supabase Studio, después de las
-- migraciones 0001..0009. Ajustá el número de WhatsApp antes de correr
-- si querés probar el envío real.
-- =============================================================

-- Tenant demo
insert into cotizador_tenants (nombre, slug, industria_base, whatsapp_vendedor, cliente_ideal, branding)
values (
  'Revestí Sur (demo)',
  'demo',
  'revestimientos',
  '5491100000000',
  'Dueños de casa que quieren renovar un ambiente sin obra pesada; valoran que quede bien terminado y que no se llene todo de polvo.',
  '{"color_primario": "#17527B"}'::jsonb
)
on conflict (slug) do nothing;

-- Config de cotizador (revestimientos v1), publicada.
-- campo_cantidad viaja dentro de opciones (ver src/lib/supabase/config-map.ts).
insert into cotizador_quoter_configs (tenant_id, version, campos, reglas_precio, textos, opciones, publicado)
select
  t.id,
  1,
  '[
    {"id": "ubicacion", "tipo": "select", "etiqueta": "Ubicación", "requerido": true,
     "opciones": [
       {"valor": "interior", "etiqueta": "Interior"},
       {"valor": "exterior", "etiqueta": "Exterior"}
     ]},
    {"id": "colocacion", "tipo": "booleano", "etiqueta": "Colocación incluida",
     "requerido": false, "nota_precio": "instalación por nuestro equipo"}
  ]'::jsonb,
  '[
    {"id": "recargo_exterior", "descripcion": "Tratamiento para exterior",
     "tipo": "multiplicador", "campo_id": "ubicacion", "cuando": "exterior", "valor": 1.12},
    {"id": "colocacion_m2", "descripcion": "Colocación",
     "tipo": "por_unidad", "campo_id": "colocacion", "valor": 7200}
  ]'::jsonb,
  '{
    "cliente_ideal": "Dueños de casa que quieren renovar un ambiente sin obra pesada.",
    "beneficios_generales": [
      "Transformás el ambiente en un día, sin escombros ni obra húmeda",
      "El material llega listo para colocar, con guía de instalación"
    ],
    "condiciones": "Precios con IVA incluido. Presupuesto válido por 7 días. Colocación sujeta a visita técnica."
  }'::jsonb,
  '{
    "mostrar_precio": "exacto",
    "captura_lead_antes_de_resultado": true,
    "campo_cantidad": {"etiqueta": "Superficie a cubrir", "unidad": "m²", "min": 1, "max": 10000}
  }'::jsonb,
  true
from cotizador_tenants t
where t.slug = 'demo'
  and not exists (
    select 1 from cotizador_quoter_configs c where c.tenant_id = t.id
  );

-- Productos demo
insert into cotizador_products (tenant_id, nombre, categoria, precio_base, unidad, beneficios)
select t.id, p.nombre, 'revestimientos', p.precio, 'm²', p.beneficios
from cotizador_tenants t,
  (values
    ('Símil piedra gris', 18900::numeric,
     '["Le da al frente ese acabado de piedra que se nota apenas llegás"]'::jsonb),
    ('Ranurado natural', 14500::numeric,
     '["Un living más cálido sin tocar un ladrillo"]'::jsonb),
    ('Tarugado premium', 21400::numeric,
     '["La pared que todos preguntan quién te la hizo"]'::jsonb)
  ) as p(nombre, precio, beneficios)
where t.slug = 'demo'
  and not exists (
    select 1 from cotizador_products x
    where x.tenant_id = t.id and x.nombre = p.nombre
  );

-- Catálogo global de plantillas (para Fase 2; el JSON canónico vive en
-- src/lib/engine/templates/ y se copia acá para tenerlo consultable).
insert into cotizador_industry_templates (nombre, slug, version, config)
values
  ('Revestimientos', 'revestimientos', 1, '{"nota": "config canónica en src/lib/engine/templates/revestimientos.json"}'::jsonb),
  ('Casas modulares', 'casas-modulares', 1, '{"nota": "config canónica en src/lib/engine/templates/casas-modulares.json"}'::jsonb)
on conflict (slug) do nothing;

-- Verificación rápida
select 'tenant' objeto, count(*)::text detalle from cotizador_tenants where slug = 'demo'
union all
select 'config publicada', count(*)::text from cotizador_quoter_configs c
  join cotizador_tenants t on t.id = c.tenant_id where t.slug = 'demo' and c.publicado
union all
select 'productos', count(*)::text from cotizador_products p
  join cotizador_tenants t on t.id = p.tenant_id where t.slug = 'demo';
