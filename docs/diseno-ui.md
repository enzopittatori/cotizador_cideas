# Directrices de diseño UI — Cotizador Multi-Industria

Versión 1 — 2026-07-12. Este documento es el contrato de diseño de la Fase 1 en
adelante. Cualquier pantalla nueva se diseña con estos tokens y reglas; si algo
no encaja, se discute acá antes de inventar por fuera.

---

## 1. Concepto: "la hoja de presupuesto viva"

Todos los rubros del producto (maderera, piletas, revestimientos, steel frame,
pintura…) comparten un objeto del mundo real: **el presupuesto en papel** — la
hoja que el vendedor llena a mano delante del cliente y donde resalta el total
con fosforito. La interfaz ES esa hoja, digitalizada:

- El formulario (inputs del cliente) a la izquierda; a la derecha una **hoja de
  presupuesto que se escribe sola** línea por línea a medida que se eligen
  opciones. En mobile, la hoja se colapsa en una barra inferior con el total,
  expandible.
- El **total se resalta con un trazo de resaltador amarillo** que se dibuja
  (animado) cada vez que el número cambia. Es LA firma visual del producto:
  el gesto real de un vendedor marcando el número que importa.
- Los divisores y medidores de progreso usan **marcas de regla** (ticks de
  cinta métrica, 1px, discretos). Estructura = información: se usan solo donde
  hay medición o secuencia real, no como decoración.

## 2. Paleta (tokens)

| Token | Hex | Uso |
|---|---|---|
| `--papel` | `#F7F6F2` | Fondo general (papel frío, NO crema cálido) |
| `--tinta` | `#10222E` | Texto principal (azul-prusia casi negro, nunca #000) |
| `--plano` | `#17527B` | Acento estructural: links, focus, labels activos, rules. **Es la variable que pisa cada tenant** (`--color-primary`) |
| `--fosforito` | `#FFE45C` | SOLO el resaltado del total y highlights de énfasis. Siempre translúcido (`multiply` / alpha ~0.55), nunca fondo de botón |
| `--grafito` | `#5D6B72` | Texto secundario, captions, unidades |
| `--linea` | `#D8DCD4` | Hairlines, bordes de la hoja, ticks de regla |

Reglas de color:
- El **fosforito se gasta en UN solo lugar por pantalla** (el total). Si todo
  resalta, nada resalta.
- Los botones primarios son `--tinta` (o `--plano` del tenant), texto papel.
  Nunca amarillos, nunca gradientes.
- Theming por tenant: solo se sustituye `--plano` (+ logo). Papel, tinta,
  fosforito y grafito son constantes del producto — así cualquier marca de
  tenant se ve bien encima.

## 3. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Archivo** (ExtraBold, y Expanded para títulos cortos) | Títulos, nombres de rubro. Tracking apretado (-0.02em). Fundidora argentina (Omnibus-Type) — decisión con historia: producto argentino, tipografía argentina |
| Cuerpo/UI | **Archivo** (400 / 500) | Todo el texto de interfaz. Una sola familia con contraste de peso/ancho = disciplina + bundle chico |
| Datos | **Spline Sans Mono** (500), `font-variant-numeric: tabular-nums` | TODOS los números del producto: precios, m², cantidades, subtotales. Los números son el producto; visten distinto |

En Next.js se cargan con `next/font` (self-hosted automático, sin FOUT).
Prohibido: Inter, serifas de moda para display, más de 2 familias + la mono.

## 4. Layout

- Grilla de 12 columnas, contenido alineado a la izquierda. **Nada de heros
  centrados** con número grande + label chico.
- Cotizador (ambos modos): dos columnas en desktop — formulario 7 cols, hoja
  de presupuesto sticky 5 cols. Mobile-first real: la hoja pasa a bottom-sheet
  con total visible siempre (la mayoría del tráfico viene de Instagram/WhatsApp).
- Aire generoso: mínimo 96px entre secciones en landing/demo; la hoja de
  presupuesto usa padding de hoja real (32/40px) con borde `--linea` y una
  sombra apenas perceptible (`0 1px 2px rgba(16,34,46,.06)`), jamás sombras
  dramáticas.
- Bordes: radios chicos y consistentes (6px inputs/cards, 8px hoja). Nada de
  esquinas ultra redondeadas ni mezcla de radios.

## 5. Selector de industria con preview vivo

El patrón que pidió Enzo — "que se muestren ejemplos mientras se elige":

- Rail horizontal (o grilla en mobile) de **fichas de rubro**: nombre en
  Archivo + sus variables reales en caption mono (`m² · color · colocación`).
- Al seleccionar/hover una ficha, la hoja de presupuesto de al lado **se
  reescribe** con un ejemplo real de ese rubro: las líneas viejas salen
  (fade + 8px up), las nuevas entran en cascada (stagger 40ms), el total hace
  count-up en mono tabular y el fosforito se re-dibuja.
- El preview NO es una captura: es el mismo componente de hoja que usa el
  producto real, con datos de ejemplo. Se construye una vez, sirve para la
  demo pública, el onboarding y la venta.

## 6. Motion

Pocas animaciones, orquestadas, con propósito:

| Momento | Animación | Spec |
|---|---|---|
| Cambio de industria / ítem agregado | Líneas: salida fade+8px up, entrada stagger 40ms | 240ms, `cubic-bezier(0.2, 0, 0, 1)` |
| Total cambia | Count-up tabular + trazo fosforito se dibuja (scaleX 0→1, origen izquierdo) | 320ms ease-out |
| Hover cards/fichas | Lift 2px + rule superior `--plano` se desliza | 160ms |
| Carga de página | Una sola secuencia: título → fichas → hoja (nunca elementos flotando sueltos) | total < 900ms |

- `prefers-reduced-motion: reduce` → sin count-up, swaps instantáneos,
  highlight aparece sin animación. Obligatorio en cada animación nueva.
- Prohibido: parallax, blobs flotantes, partículas, animación infinita ambiental.

## 7. Voz y copy

- Voseo argentino, directo, sin clichés de marketing: "Elegí tu rubro",
  "Cotizá en 2 minutos", "Total estimado", "Enviar por WhatsApp".
- La frase madre del producto (del plan §1.1) puede usarse en la demo/venta:
  **"Pasá de «te lo mando mañana» a «te lo doy ahora»."**
- Los botones dicen exactamente lo que hacen: "Agregar al presupuesto",
  "Descargar PDF", "Enviar por WhatsApp" — y el nombre se mantiene igual en
  todo el flujo.
- Errores: qué pasó + cómo seguir, sin disculpas ni vaguedad. Estados vacíos:
  una invitación a actuar.

## 8. Accesibilidad y piso de calidad (no negociable)

- Focus visible siempre (outline 2px `--plano`, offset 2px).
- Contraste AA mínimo (tinta sobre papel = 13.4:1 ✓; grafito sobre papel para
  texto secundario = 4.6:1 ✓; verificar cualquier color de tenant sobre papel).
- Targets táctiles ≥ 44px en el cotizador público (mobile-first).
- Responsive hasta 360px de ancho sin scroll horizontal.

## 9. Qué NO hacer (anti-slop)

- Nada de: gradientes violeta, fondos crema + serifa + terracota, dark-mode
  con verde ácido, Inter, heros centrados, 3 feature-cards con iconitos,
  esquinas redondeadas uniformes gigantes, sombras difusas enormes.
- Si una pantalla nueva se parece a "cualquier SaaS", está mal: tiene que
  parecerse a **una hoja de presupuesto bien hecha**.
