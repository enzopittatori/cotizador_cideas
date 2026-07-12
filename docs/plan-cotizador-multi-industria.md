# COTIZADOR MULTI-INDUSTRIA — PLAN DE PROYECTO
### Documento de arranque para Claude Code · Cideas · v1.1

> **Cambios v1.1:** doble modo de uso (vendedor / cliente), tablas con prefijo `cotizador_`, URL de producción definida, WhatsApp solo por links wa.me (sin Business API), presupuestos multi-producto, textos con beneficios orientados al cliente ideal, n8n opcional con flujo único multi-tenant, mini CRM confirmado en Fase 3.

---

## 1. CONCEPTO

Plataforma SaaS multi-tenant de cotizadores configurables. Un solo motor de cotización que sirve a múltiples industrias mediante configuraciones (campos, reglas de precio, textos, imágenes). Cada negocio (tenant) tiene su propio cotizador con su marca, sus productos, sus precios y su vendedor conectado por WhatsApp.

### 1.1 Los DOS modos de uso (núcleo del producto)

**MODO VENDEDOR (interno, con login)**
El vendedor, desde el local o su oficina, cotiza rapidísimo frente al cliente o por teléfono. Flujo: entra logueado → carga las variables → obtiene precio + texto de presupuesto al instante → **puede editar el texto** → lo imprime, lo descarga en PDF o se lo manda al cliente por WhatsApp. Acá el valor es velocidad: pasar de "te lo mando mañana" a "te lo doy ahora".

**MODO CLIENTE (público, sin login)**
El cliente final se autocotiza online desde el link del negocio. Flujo: completa el formulario → ve el resultado (precio + texto + imagen) → botón de WhatsApp que abre `wa.me/{numero_vendedor}?text={resumen}` con el resumen del presupuesto pre-cargado → el cliente lo envía y el vendedor recibe un **lead ya calificado**. Acá el valor es generación de leads.

Ambos modos usan el mismo motor y la misma config. Lo único que cambia es quién está del otro lado y qué permisos tiene.

**Decisión firme:** WhatsApp funciona SOLO con links `wa.me`. No se usa WhatsApp Business API en ninguna fase. Es gratis, no requiere aprobación de Meta, y el mensaje lo envía el propio cliente desde su WhatsApp (mejor entregabilidad y cero riesgo de bloqueo).

---

## 2. INDUSTRIAS OBJETIVO

Criterio: trabajos donde el precio se arma con pocas variables medibles (m², cantidad, material, calidad) y donde hoy el presupuesto se hace a mano.

**Construcción y materiales**
1. Casas / construcción en seco / steel frame (m², ambientes, terminación)
2. Casas modulares / prefabricadas (modelo, m², equipamiento)
3. Revestimientos (material, color, m², interior/exterior)
4. Maderera (tipo de madera, escuadría, metros lineales/m³, cepillado)
5. Pinturería / trabajos de pintura (m², tipo de pintura, manos, altura)
6. Chapa y zinguería (tipo de chapa, calibre, m², pendiente, accesorios)
7. Aberturas (material, medidas, vidrio, cantidad)
8. Pisos (material, m², colocación, zócalos)
9. Durlock / yesería (m², tipo de placa, aislación)
10. Techistas / membranas (m², tipo de membrana, estado previo)

**Exterior y hogar**
11. Piletas (tipo, medidas, revestimiento, climatización)
12. Cercos / alambrados / rejas (metros lineales, altura, material)
13. Portones y automatización (tipo, medidas, motor)
14. Pérgolas / decks / quinchos (m², material, techado)
15. Riego automático / paisajismo (m², zonas, tipo de césped)
16. Energía solar (consumo mensual, tipo de instalación, superficie de techo)
17. Aires acondicionados / climatización (m² a climatizar, frigorías, cantidad)

**Servicios e industria liviana**
18. Mudanzas / fletes (ambientes, distancia, piso/ascensor, embalaje)
19. Limpieza profesional (m², frecuencia, tipo de limpieza)
20. Vidriería (tipo de vidrio, medidas, templado/laminado)
21. Herrería (tipo de trabajo, metros, material, terminación)
22. Tapicería (tipo de mueble, tela, cantidad)
23. Gráfica / cartelería / ploteo (medidas, material, instalación)
24. Marmolería / mesadas (material, metros lineales, bacha, terminación)
25. Toldos y cerramientos (medidas, tipo de lona/vidrio, motorización)

**Regla para la demo:** las primeras 5-6 industrias se lanzan como demos públicas navegables (sin login) para mostrar a prospectos. El resto se agrega como configs a medida que aparecen clientes.

---

## 3. USUARIOS Y ROLES

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Superadmin** | Carla / Cideas | Crear/suspender tenants, ver métricas globales, gestionar catálogo de industrias (plantillas), impersonar cuentas para soporte, gestionar planes |
| **Admin del negocio** | Dueño del negocio cliente | Configurar su cotizador (campos, precios, textos, logo, colores), cargar productos (manual o Excel), subir imágenes, definir cliente ideal y beneficios, configurar WhatsApp del vendedor, ver estadísticas |
| **Vendedor** | Empleado del negocio | Usar el MODO VENDEDOR: cotizar rápido, editar el texto del presupuesto, imprimir/PDF/enviar por WhatsApp. En Fase 3: gestionar sus leads en el mini CRM |
| **Visitante / cliente final** | El que se cotiza | Usa el cotizador público sin login, arma su presupuesto (uno o varios productos), lo envía por WhatsApp al vendedor o lo descarga |

El cliente final NO necesita login. El login es solo para el negocio (admin/vendedor) y el superadmin.

---

## 4. FUNCIONALIDADES POR MÓDULO

### 4.1 Cotizador público — MODO CLIENTE
- URL por tenant: `cotizador.sentidocomun.click/{negocio}` (dominio actual de producción; migrable a futuro sin romper nada si los links se generan desde una variable de entorno `BASE_URL`)
- Formulario dinámico generado desde la config del tenant
- **Presupuesto multi-producto ("Agregar al presupuesto"):** el cliente puede cotizar un producto, agregarlo, y seguir cotizando otros. El presupuesto final consolida todos los ítems con subtotales y total general. Ejemplo maderera: 20 tirantes + 15 tablas + 4 vigas en un solo presupuesto
- Cálculo en vivo del precio (configurable por negocio: precio exacto / rango / ocultar precio y solo enviar consulta)
- Resultado: texto de presupuesto natural (ver 4.4) + imagen del producto
- **Botón WhatsApp:** genera `wa.me/{numero}?text={resumen}` con resumen del presupuesto (ítems, cantidades, total, nombre del interesado). El link se abre en el WhatsApp del cliente con el mensaje listo para enviar
- Descarga del presupuesto en PDF con logo y datos del negocio
- Captura opcional de nombre/teléfono antes de mostrar el resultado (configurable: palanca de generación de leads)
- Mobile-first: la mayoría llega desde Instagram/WhatsApp

### 4.2 Cotizador interno — MODO VENDEDOR
- Misma interfaz de cotización pero dentro del panel, optimizada para velocidad: atajos, últimos productos usados, duplicar presupuesto anterior
- Multi-producto igual que el modo cliente
- **Edición del texto generado:** el texto de Claude aparece en un editor simple; el vendedor ajusta lo que quiera antes de entregar
- Salidas: imprimir / PDF con marca / enviar por WhatsApp al número del cliente (`wa.me/{numero_cliente}?text={presupuesto}`)
- Cada cotización queda guardada con fecha, vendedor y modo (para estadísticas y para el mini CRM de Fase 3)

### 4.3 Panel del negocio (admin)
- **Onboarding guiado la primera vez que entra:**
  1. Bienvenida + explicación corta de los dos modos
  2. Elegir industria base (precarga plantilla con campos y fórmula típica)
  3. Cargar datos: manual o **importar Excel** (plantilla .xlsx descargable con columnas: producto, variante, precio, unidad, beneficios, imagen)
  4. Definir el cliente ideal y los beneficios clave (ver 4.4)
  5. Subir logo y elegir color
  6. Cargar el número de WhatsApp del vendedor
  7. Vista previa de ambos modos → publicar
- Editor de configuración: campos, precios, modificadores, textos
- Gestor de productos con imágenes (Supabase Storage)
- Import Excel con preview y validación fila por fila antes de confirmar
- Estadísticas: cotizaciones por modo (vendedor vs cliente), leads enviados por WhatsApp, productos más cotizados, ticket promedio

### 4.4 Generación de texto con Claude — presupuestos que venden
El texto NO es solo una lista de características y un precio. La estructura es:

1. **Qué pidió** — resumen claro de los ítems y variables elegidas
2. **Beneficio principal (1, máximo 2)** — hablando desde el impacto personal para el cliente ideal de ese negocio, no desde el producto. No "membrana de 4mm con aluminio" sino "te olvidás de las goteras y las manchas de humedad por los próximos 10 años"
3. **Para qué sirve / qué incluye** — breve, en lenguaje simple
4. **Precio y condiciones**

Para que Claude escriba así, cada tenant configura en su onboarding:
- **Cliente ideal** (campo de texto: quién compra, qué le preocupa, qué valora)
- **Beneficios por producto o categoría** (1-2 por ítem, cargables también desde el Excel)

Regla editorial: pocos beneficios, los de mayor probabilidad de impacto personal. Sin clichés de marketing, tono conversacional, el cliente como protagonista. En modo vendedor el texto es siempre editable antes de entregar.

Caché obligatorio: misma combinación de inputs = mismo texto (tabla `cotizador_text_cache`), para no pagar API por cotizaciones idénticas.

### 4.5 Panel superadmin
- CRUD de tenants (alta, baja, suspensión, plan)
- Catálogo de plantillas de industria (templates JSON versionados)
- Métricas globales: tenants activos, cotizaciones/día por modo, industrias más usadas
- Impersonación ("ver como este negocio") para soporte
- Logs de errores de importación y de llamadas a la API

### 4.6 Emails y automatización — n8n es OPCIONAL
**Respuesta a la duda: NO se necesita un flujo por cliente.** Dos opciones, en orden de preferencia:

- **Opción A (MVP, recomendada): sin n8n.** Los emails salen directo desde la app (Nodemailer + SMTP propio, o un servicio tipo Resend). El template es uno solo, parametrizado: logo, nombre y textos del tenant se leen de la base según el `tenant_id`. Cero flujos que mantener.
- **Opción B (si después querés automatizaciones más ricas): UN solo flujo n8n multi-tenant.** La app dispara un webhook con `{tenant_id, quote_id, evento}`; el flujo consulta Supabase, arma el email/notificación con los datos de ese tenant y lo envía. Un flujo genérico sirve para todos los clientes, para siempre. Solo se agregan flujos nuevos si aparece una automatización distinta (ej. "recordatorio a los 3 días"), y también serían multi-tenant.

Conclusión: n8n no bloquea nada del MVP. Se suma cuando aporte, con un flujo único.

---

## 5. ARQUITECTURA TÉCNICA

### Stack (sobre infraestructura existente)

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | **Next.js 14+ (App Router)** | Una sola app: cotizador público + modo vendedor + panel admin + superadmin. SSR para carga rápida de los cotizadores públicos |
| Estilos | Tailwind CSS | Theming por tenant vía CSS variables (color primario, logo) |
| Backend / DB | **Supabase self-hosted** (existente) | Postgres + Auth + Storage + Row Level Security |
| Auth | Supabase Auth | Email+password para admin/vendedor. Roles vía `cotizador_memberships` |
| Storage | Supabase Storage | Bucket propio `cotizador-assets` (imágenes de productos, logos, PDFs) |
| Emails | Nodemailer + SMTP (o Resend) | Directo desde la app. n8n opcional después (flujo único multi-tenant) |
| IA | Claude API (claude-sonnet-4-6) | Textos de presupuesto con caché en DB. API key solo server-side |
| PDF | @react-pdf/renderer o Puppeteer server-side | Presupuesto descargable/imprimible con marca del tenant |
| Deploy | **Docker + Traefik + Portainer** (existentes) | Contenedor Next.js con labels de Traefik para `cotizador.sentidocomun.click` con SSL automático |
| Import Excel | SheetJS (xlsx) en el server | Parseo + validación + preview antes de commit |

### Convención de nombres en Supabase (IMPORTANTE)
La instancia de Supabase es compartida con otros proyectos. **Todas las tablas de este proyecto llevan el prefijo `cotizador_`** para identificarlas de un vistazo y evitar colisiones. Mismo criterio para el bucket de Storage (`cotizador-assets`) y para cualquier función o vista (`cotizador_*`).

### Multi-tenancy
Una sola base, un solo esquema, `tenant_id` en cada tabla + Row Level Security. RLS garantiza que un negocio jamás vea datos de otro, incluso ante un bug del frontend. El modo cliente (público) accede solo por endpoints server-side que filtran por el slug del tenant; nunca se expone la anon key con acceso de lectura amplia.

### Modelo de datos (núcleo)

```
cotizador_tenants            → id, nombre, slug, industria_base, plan, estado,
                               whatsapp_vendedor, cliente_ideal (text), branding (jsonb)
cotizador_memberships        → user_id, tenant_id, rol (superadmin | admin | vendedor)
cotizador_industry_templates → id, nombre, config (jsonb), version   [catálogo global]
cotizador_quoter_configs     → tenant_id, campos (jsonb), reglas_precio (jsonb),
                               textos (jsonb), opciones (jsonb)
cotizador_products           → tenant_id, nombre, categoria, atributos (jsonb),
                               precio_base, unidad, beneficios (jsonb: 1-2 por producto),
                               imagen_url, activo
cotizador_quotes             → tenant_id, modo (vendedor | cliente), vendedor_id (nullable),
                               total, texto_generado, texto_editado (nullable),
                               cliente_nombre, cliente_telefono, created_at
cotizador_quote_items        → quote_id, product_id, inputs (jsonb), cantidad, subtotal
cotizador_leads              → tenant_id, quote_id, nombre, telefono, email,
                               estado (nuevo | contactado | negociando | ganado | perdido),
                               notas, canal (whatsapp | pdf | web)
cotizador_text_cache         → tenant_id, hash_inputs, texto, model, created_at
cotizador_import_logs        → tenant_id, archivo, filas_ok, filas_error, detalle (jsonb)
```

Notas:
- `cotizador_quotes` + `cotizador_quote_items` implementan el multi-producto: una cotización, N ítems.
- `texto_generado` guarda lo que devolvió Claude; `texto_editado` guarda la versión del vendedor si la modificó. Nunca se pisa el original (sirve para aprender qué editan los vendedores y mejorar los prompts).
- `cotizador_leads.estado` ya deja lista la estructura para el mini CRM de Fase 3 (columnas kanban = estados).

### Seguridad mínima obligatoria
- RLS activado en TODAS las tablas `cotizador_*`
- Rate limiting en el endpoint público de cotización (evitar que la competencia scrapee precios)
- El precio SIEMPRE se calcula server-side; el cliente nunca envía un total
- Sanitización de los Excel subidos
- API keys (Claude, SMTP) solo en variables de entorno del server

---

## 6. FASES DE DESARROLLO

### FASE 0 — Fundaciones (1-2 semanas)
**Objetivo: esqueleto funcionando en tu servidor.**
- Repo + Next.js + conexión a Supabase self-hosted
- Esquema `cotizador_*` completo + RLS + seeds
- Auth funcionando (login admin/vendedor, superadmin para vos)
- Deploy en Docker detrás de Traefik en `cotizador.sentidocomun.click`
- **Criterio de salida:** entrás con tu usuario por HTTPS, ves un dashboard vacío, todo corre en tu infra.

### FASE 1 — MVP de un solo tenant (2-3 semanas)
**Objetivo: UN negocio real cotizando de punta a punta, en los dos modos.**
- Motor de cotización: config JSON → formulario dinámico → cálculo server-side → resultado
- Multi-producto ("Agregar al presupuesto") con subtotales y total
- 2 plantillas de industria completas (sugerido: revestimientos + casas modulares)
- Texto de presupuesto vía Claude API con estructura de beneficios (4.4) y caché
- MODO CLIENTE: página pública + botón WhatsApp `wa.me` con resumen
- MODO VENDEDOR: cotización rápida + edición del texto + PDF/imprimir
- Panel admin básico: precios, productos con imagen y beneficios, cliente ideal, vista previa
- **Criterio de salida:** un cliente real (ej. DROP arq. modular como piloto) cotiza con sus precios reales; su vendedor lo usa en el día a día y le llegan leads por WhatsApp.

### FASE 2 — Multi-tenant + onboarding (3-4 semanas)
**Objetivo: alta de clientes sin tocar código.**
- Panel superadmin: crear tenant, asignar plantilla, suspender
- Onboarding guiado de 7 pasos (4.3)
- Import Excel con plantilla, preview y validación
- Captura de leads configurable (formulario pre-resultado)
- Estadísticas por tenant y por modo
- PDF con marca
- Emails transaccionales directos desde la app (Opción A)
- 5-6 demos públicas por industria para usar en ventas
- **Criterio de salida:** podés dar de alta un cliente nuevo en menos de 1 hora sin escribir código.

### FASE 3 — Producto y escala (continuo)
- **Mini CRM de leads:** tablero kanban con columnas por estado (nuevo → contactado → negociando → ganado/perdido), notas por lead, asignación a vendedor. La estructura de datos ya existe desde Fase 0 (`cotizador_leads.estado`), acá solo se construye la interfaz. Es totalmente viable dentro de este proyecto: no es un CRM completo, es un tablero de seguimiento de los leads que genera el propio cotizador
- Automatizaciones opcionales vía n8n con flujo único multi-tenant (Opción B): notificación al vendedor por email al entrar un lead, recordatorio de seguimiento
- Subdominios propios por tenant / dominio del cliente (la base ya queda preparada usando `BASE_URL` configurable)
- Planes y facturación (MercadoPago o Stripe)
- Asistente IA para el admin ("redactá los beneficios de este producto pensando en tu cliente ideal")
- Imágenes generativas del resultado (render del producto configurado)
- Widget embebible `<script>` para incrustar el cotizador en la web del cliente
- Analytics avanzado: embudos, abandono del formulario, A/B de textos

### Qué NO hacer en el MVP
- No WhatsApp Business API (decisión firme: nunca, salvo que cambie el contexto)
- No facturación automática (se cobra manual al principio)
- No app mobile nativa (la web mobile-first cubre todo)
- No imágenes generativas por IA (fotos de producto subidas alcanzan)
- No multi-idioma
- No mini CRM todavía (Fase 3, pero la tabla de leads ya nace con el campo `estado`)

---

## 7. MÉTRICAS DE ÉXITO

**Modo cliente:** % de visitantes que completan una cotización (objetivo >40%), % de cotizaciones que terminan en click de WhatsApp (objetivo >25%).
**Modo vendedor:** cotizaciones por vendedor por semana, tiempo promedio de armado de un presupuesto (objetivo: <2 minutos).
**Operación:** tiempo de alta de un tenant nuevo (<1 hora).
**Negocio Cideas:** tenants activos pagando, churn mensual, ingreso recurrente. El cotizador se vende con la misma metodología de captación → filtrado → cierre que ya ofrecés.

---

## 8. INSTRUCCIONES PARA CLAUDE CODE (primer prompt sugerido)

> Vamos a construir la Fase 0 de este proyecto (adjunto el plan completo y el CLAUDE.md). Stack: Next.js 14 App Router + Tailwind + Supabase self-hosted (credenciales por .env). Empezá por: (1) estructura del repo según el CLAUDE.md, (2) migraciones SQL con todas las tablas `cotizador_*` del punto 5 incluyendo políticas RLS, (3) auth con Supabase y protección de rutas por rol, (4) Dockerfile + docker-compose con labels de Traefik para cotizador.sentidocomun.click. No avances a la Fase 1 hasta que valide que la Fase 0 corre en mi servidor.

Trabajá fase por fase, validando cada criterio de salida antes de avanzar. Mantené la config de industrias como JSON versionado desde el día uno: es el activo central del producto.

---

*Documento vivo — actualizar al cierre de cada fase con lo aprendido.*
