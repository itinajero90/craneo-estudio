# DESIGN.md — Identidad visual de OSSO · Craneo Studio

> Fuente única de verdad (SSOT) del estilo de la app. Todo cambio estético se refleja aquí primero.
> Los valores salen directamente de `src/style.css` (variables `:root`).

---

## 1. Tipografías

Importadas desde Google Fonts en `src/style.css` línea 1:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
```

| Rol | Variable | Familia | Pesos | Uso |
|-----|----------|---------|-------|-----|
| **Display / títulos** | `--display` | **Manrope** | 400–800 | Título de marca (`.brand-name`: 700, 13 px, tracking .12em), logo circular `.brand-mark` (700, 17 px) |
| **Interfaz general** | `--sans` | **DM Sans** | 400–700 | Cuerpo, botones, labels de rangos, tarjetas de luz |
| **Técnico / mono** | `--mono` | **DM Mono** | 400, 500 | Datos, valores, secciones, notas, coordenadas, footers — el estilo "estudio técnico" |

**Regla de uso:**
- Cifras, valores, coordenadas, índices de sección (`01`, `02`…) y textos de pie → **DM Mono**.
- Etiquetas y texto corrido → **DM Sans**.
- Solo títulos de marca y acentos de display → **Manrope**.

Fallbacks: `--mono: 'DM Mono', 'Courier New', monospace` · `--sans/--display: ..., Arial, sans-serif`.

---

## 2. Paleta de color

### 2.1 Variables oficiales (`:root`)

| Token | Valor | Rol |
|-------|-------|-----|
| `--ink` | `#202321` | Texto principal (tinta) |
| `--muted` | `#858780` | Texto secundario / deshabilitado |
| `--paper` | `#f3f0e9` | Papel de fondo claro |
| `--line` | `#dcd9d1` | Líneas y bordes generales |
| `--accent` | `#ca6548` | **Acento terracota principal** (acciones) |
| `--dark` | `#151718` | Fondo oscuro |
| `--mono` / `--sans` / `--display` | ver §1 | Familias tipográficas |

### 2.2 Escala funcional (valores usados en componentes)

**Estructura clara (panel izquierdo y paneles):**

| Uso | Valor |
|-----|-------|
| Fondo de panel lateral | `#eeebe4` |
| Fondo de tarjeta / fila (`light-card`, `profile-row`) | `#e8e5dd` / `#f4f1ea` |
| Fondo de input y select | `#f0ede6` |
| Bordes de controles (chips, botones, inputs) | `#d5d2ca`, `#d3d0c8` |
| Hover de fila/chip | `#e4dfd6`, `#e5e1d9` |
| Texto oscuro de control | `#252a27`, `#454741` |
| Texto tenue | `#949187`, `#a09d94` |

**Terracota (acentos y acciones):**

| Uso | Valor |
|-----|-------|
| Acento principal `--accent` | `#ca6548` |
| Botón de acento (topbar) | `#d47a5d` |
| Links "add/text-button" | `#bd654b` → hover `#733b2e` |
| Índice de sección | `#bd674d` |
| Slider thumb / checkbox activa | `#c96d50` / `#c86c50` |
| Símbolos de hueso, toggles | `#bd725a`, `#c46c4f` |

**Barras oscuras (topbar y footer):**

| Uso | Valor |
|-----|-------|
| Fondo | `#141718` |
| Borde | `#303333` |
| Texto claro | `#e9e7e1` |
| Texto atenuado | `#858983`, `#afb1ab` |
| Marca / dot vivo | `#e7a087`, `#d77c5d` (con glow `#d77c5d66`) |
| Link del footer | `#c87b5d` → hover `#e4a18a` |

**Visor 3D (viewport):**

| Uso | Valor |
|-----|-------|
| Fondo por defecto | `#d7d2c8` |
| Toolbar | `#dcd8d0` (borde `#c8c3ba`) |
| Footer del visor | texto `#929087` sobre `#d7d2c8` |

**Semántica de estado:**
- Selección activa (chip/preset): fondo `#e5e1d9` + borde `#85867e` + texto `#252a27`.
- Peligro/eliminar (hover ✕): `#af5f46` sobre `#efe6dd`.
- Herramientas del boceto (Lápiz/Borrador): reposo `#f0ede6`, activa con el mismo estado de selección. Acción no disponible: `#b9b6ad`.

---

## 3. Formas y bordes

- **Radio:** 2 px en controles (chips, inputs, botones); 3 px en botón de acento; 50 % solo en marca circular y thumbs de slider.
- **Borde:** 1 px sólido, tono `#d5d2ca`/`#d3d0c8`; controles oscuros usan `#85867e`.
- **Separadores:** punteados `1px dashed #ddd8ce` entre filas de ajustes.

## 4. Espaciado y layout

- Topbar: 58 px · Toolbar visor: 43 px · Footer visor: 28 px · Footer app: 33 px.
- Panel lateral: padding `26px 21px 18px`, scroll propio, scrollbar fino (`#c5c1b8`).
- Grid de app: 3 columnas en topbar/footer (`1fr 1fr 1fr`).
- Mínimo de ventana: 900×600 (app Tauri), por defecto 1280×800.

## 5. Escala tipográfica (tamaños reales)

| Nivel | Tamaño | Familia |
|-------|--------|---------|
| Marca | 13 px / 700 / tracking .12em | Manrope |
| Etiquetas de sección | 9–10 px / tracking .09–.15em | DM Mono |
| Valores y datos | 8–9 px | DM Mono |
| Texto de control | 9–11 px | DM Sans / DM Mono |
| Notas al pie del panel | 8 px | DM Mono |
| Footer app / visor | 7 px / tracking .09–.1em | DM Mono |

> El estilo es deliberadamente **micro-typography**: tamaños pequeños, mono, tracking amplio — estética de software técnico de estudio.

## 6. Motion

- Transiciones cortas de color/fondo en hover (≤ 150 ms), sin animaciones elaboradas.
- Respetar `prefers-reduced-motion` al añadir nuevas.

## 7. Reglas para cambios futuros

1. **Usar variables `:root`** antes de hardcodear un color nuevo; si el tono se repite 3 veces, promoverlo a token.
2. Mantener la dualidad: **papel claro + acento terracota + barras casi negras**.
3. Cualquier texto numérico/técnico va en **DM Mono**; nada de otras familias.
4. Actualizar este archivo en el mismo commit que cambie el estilo (R5 del cerebro).

---

*DESIGN.md v1.0 — extraído de `src/style.css` (2026-11-06)*
