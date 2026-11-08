# Contexto del proyecto — OSSO · Craneo Studio

> Documento de trabajo: qué es el proyecto, cómo está hecho y qué se ha implementado hasta ahora.
> Última actualización: 2026-11-07.

## Qué es

**OSSO · Craneo Studio** es un visor 3D interactivo de un cráneo humano con herramientas de dibujo y observación, pensado como una "mesa de trabajo" para estudiantes de arte, anatomía u odontología.

- **Modelo:** 53 piezas seleccionables del cráneo (GLB "High quality skull" de **Mariano Coretti**, licencia [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)).
- **Textura de hueso:** "White Stucco" de [Poly Haven](https://polyhaven.com/) — **CC0**, procesada offline a `bone_diffuse_soft.jpg`.
- **Stack:** Three.js `^0.187.0` + Vite `^8.3.6`, JavaScript vanilla (sin framework), CSS a mano.
- **Repo:** https://github.com/itinajero90/craneo-estudio (privado) — rama de trabajo actual: **`Pruebas1`**.

## Cómo se ejecuta

```bash
npm install     # primera vez
npm run dev     # http://localhost:5173
npm run build   # build de producción en dist/
npm run preview # servir el build
```

## Estructura

```
index.html          entrada
src/main.js         toda la lógica (escena, luces, materiales, selección, export)
src/style.css       estilos
public/models/      GLB del cráneo + licencia
public/textures/    textura de hueso (CC0)
docs/               captura del README
archive-models/     modelos de referencia
README.md           público del repo (captura + para qué sirve + uso)
CONTEXTO-PROYECTO.md  este documento
```

Arquitectura de UI: layout de 3 columnas (`control-column` | `viewport-column` | `sketch-column`) + footer. El panel izquierdo tiene 3 secciones: **01 Modelo** (cámara, rotación, material, variante), **02 Iluminación** (fuentes, temperatura, ambiente) y **03 Estructuras** (lista de las 53 piezas).

## Lo que se ha hecho (historial)

### 1. Funcionalidad base (commit `49f5eaf`)
- Escena Three.js con el GLB orientado correctamente (+90° X corregido), presets de cámara (3/4, Frente, Perfil, Atrás, Arriba), sliders de rotación y distancia, reset.
- **53 piezas seleccionables** por clic (raycast) con resalte emissive `#9a482f`, fila marcada en la lista, toast de selección.
- Lista de piezas: mostrar/ocultar por clic (ocultar) y clic derecho (revelar), "Mostrar todas".
- **4 materiales** (hueso con textura CC0, metal, vidrio, madera) con caché por preset por malla. El bug de la textura que subía en negro a la GPU se resolvió cargando la imagen directa (sin CanvasTexture).
- **Luces:** hasta 5 fuentes (direccional/puntual/foco), arrastrables en el visor sobre un plano, marcadores, intensidad convertible al cambiar de tipo, sombras, luz ambiente tipo hemisférica.
- **Hoja de dibujo** (canvas 2D): trazo, grosor, colores, deshacer, limpiar, guardar PNG.
- **Export PNG con fondo transparente** (`toBlob` → object URL → anchor; `showSaveFilePicker` con `ArrayBuffer` + guard de `userActivation`, fallback a descarga). Alpha=0 verificado.

### 2. Preparación y publicación en GitHub (`49f5eaf` → `262a77b`)
- `.gitignore`, `README.md` completo con captura `docs/craneo-studio.png` y sección "Para qué sirve".
- Dependencias fijadas (`three ^0.187.0`, `vite ^8.3.6`); build OK (aviso de chunk >500 kB, es three.js).
- Repo publicado; se fusionó el `.gitattributes` que creó GitHub Desktop y se borró la carpeta fantasma `craneo-estudio/` anidada.

### 3. Fix: franja blanca bajo el footer (`9ddbca8`)
- **Causa raíz:** `input.shadow-toggle` (checkbox "Proyectar sombras") con `position: absolute` sin contenedor posicionado → se escapaba del scroll del panel y estiraba el documento 120 px más allá del footer.
- **Fix:** `.shadow-toggle { position: relative; }` + `inset: 0`. Verificado: `scrollHeight` == fondo del footer (0 px de sobra).

### 4. Color de la madera + temperatura de luz suave (`fb2408d`)
- **Color de la madera:** fila "Color de la madera" (visible solo con ese material) con selector de color que **multiplica** la textura de vetas. Persiste al cambiar de material; `Restaurar` lo vuelve a `#FFFFFF`.
- **Temperatura Kelvin revisada:** antes 2000 K daba `#FF890E` puro y pintaba el modelo entero de naranja. Ahora cada Kelvin se mezcla con blanco (**60 % color / 40 % blanco**): 2000 K → `#FFB86E`, 8000 K → `#EBF0FF`. El modelo se ve cálido/frío sin dejar de verse hueso.
- **Bug corregido de paso:** la mezcla se hacía en espacio *lineal* (`THREE.Color` convierte) y salía más saturada; ahora opera en sRGB y `nearestKelvin` compara contra los colores suavizados (slider, chips y selector de color siguen sincronizados).

### 5. Deselección por clic en vacío (`d147ac0`)
- `deselectBone()` apaga el resalte, limpia la fila y anula `state.selectedBone`.
- Clic en el vacío del visor → deselecciona, **solo si el puntero no se movió** (<6 px): arrastrar para orbitar no borra la selección accidentalmente. Clics en marcadores de luz/paneles/boceto no tocan la selección.

### 6. Variante "Sin mandíbula" (`d147ac0`)
- Chips **Completo / Sin mandíbula** en sección 01. Ocultan la **Mandíbula** + **dientes inferiores 3.x y 4.x** (notación FDI): 53 → **36 piezas**.
- Las 17 filas de la lista desaparecen en modo sin mandíbula; si la mandíbula estaba seleccionada se deselecciona sola; **"Mostrar todas" respeta la variante**.
- Contador **"N PIEZAS VISIBLES"** ahora dinámico (antes se quedaba en 53 aunque ocultaras piezas).

## Estado actual

| Campo | Valor |
|---|---|
| Rama activa | `Pruebas1` (sincronizada con `origin/Pruebas1`) |
| Último commit | `d147ac0` — deselección + variante sin mandíbula |
| Pendiente de commit | Nada — árbol limpio |
| Build | OK (`npm run build`) |
| Errores de consola | Ninguno en las verificaciones |

Historial de `Pruebas1`:
```
d147ac0 feat: deseleccionar al clicar fuera del modelo y variante sin mandibula
fb2408d feat: color configurable de la madera y temperatura de luz suave
9ddbca8 fix: franja blanca bajo el footer por input absolute sin contenedor
```
`main` está en `9ddbca8` (falta fusionar `Pruebas1` cuando se apruebe).

## Decisiones técnicas clave (no romper)

- **Export PNG:** `Blob` no funciona con `showSaveFilePicker` (0 bytes) → usar `ArrayBuffer`; el navegador controlado por el agente de desarrollo intercepta descargas, en Chrome/Edge propio funciona el diálogo normal.
- **Textura hueso:** nada de `CanvasTexture` en runtime (subía en negro a la GPU); cargar con `TextureLoader` directo.
- **Al cambiar el color de una luz NO re-renderizar el panel** (destruiría los inputs y cerraría el selector de color nativo) → `applyLightColor` actualiza en sitio.
- **Fondo del visor** se aplica a `scene.background` y niebla; el **PNG export siempre es transparente** (se oculta fondo, niebla, suelo, rejilla y marcadores durante el render).
- **Materiales con caché por preset por malla** (`userData.presetMaterials`) para que el resalte de selección funcione por pieza.
- Selección y variante actúan solo sobre el `canvas`; el boceto y los paneles no interfieren.

## Posibles pendientes / ideas

- Fusionar `Pruebas1` → `main` cuando se apruebe.
- Los presets de cámara no cambian de variante ni material (son independientes a propósito).
- El aviso de chunk >500 kB del build es three.js minificado; si importa, se puede code-split el módulo 3D con `import()` dinámico.
