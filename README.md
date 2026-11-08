# OSSO · Craneo Studio

Visor 3D interactivo de un craneo humano con herramientas de dibujo y observacion.
Construido con **Three.js + Vite** (sin framework). Se puede usar **en el navegador** o instalar como **app de escritorio en Windows** (`.exe` de ~15 MB).

![Captura de la aplicacion: visor 3D del craneo con panel de modelo, iluminacion y hoja de dibujo](docs/craneo-studio.png)

## Para que sirve

Herramienta de **estudio anatomico y dibujo** (estilo mesa de trabajo):

- **Centro — visor 3D:** gira el craneo con el raton, encuadra con presets de camara y selecciona cualquiera de sus 53 piezas.
- **Panel izquierdo — forma y luz:** rota el modelo, cambia el material (hueso, metal, vidrio, madera), añade fuentes de luz arrastrables y ajusta su **temperatura en Kelvin** (cálido 2000 K → frio 10000 K) y color de fondo del visor.
- **Panel derecho — tu boceto:** una hoja de dibujo para esquiar el craneo como referencia de observacion (trazo, grosor, deshacer, limpiar).
- **Exportar:** el boton *PNG* guarda la pose actual con **fondo transparente** para usarla en tus diseños.

Ideal para estudiantes de arte, anatomia o odontologia que quieren un modelo de referencia girable con iluminacion controlable.

## Opciones de uso

### Opción A — Web (navegador)

Requisitos: **Node.js 18+** (recomendado 20+) y npm.

```bash
npm install     # instalar dependencias (solo la primera vez)
npm run dev     # desarrollo -> http://localhost:5173
npm run build   # generar build de produccion en dist/
npm run preview # servir el build en local
```

Para publicar en un hosting: sube la carpeta `dist/` (ya usa rutas relativas, sirve en cualquier subcarpeta).

### Opción B — App de escritorio (.exe) para Windows

**Requisitos para usarla:** Windows 10/11 x64. **No se necesita instalar nada mas** (usa el WebView2 que Windows ya trae).

**Pasos para instalar:**

1. Consigue el instalador `craneo-studio_x.x.x_x64-setup.exe` (de la carpeta `bundle/nsis/` de un build, o de una Release de GitHub).
2. Ejecútalo y sigue el asistente (en espanol) hasta **Instalar**.
3. Abre la app desde el acceso directo **OSSO · Craneo Studio** del escritorio o del menú inicio.

- Se instala en `%LOCALAPPDATA%\craneo-studio` (sin pedir permisos de administrador).
- **Para desinstalar:** Ajustes → Aplicaciones → *craneo-studio* → Desinstalar, o ejecuta `uninstall.exe` en esa carpeta.

**Actualizaciones:** al abrir la app, si hay una versión más nueva aparece un aviso abajo a la derecha con la versión nueva. Pulsa **Actualizar** → se descarga con porcentaje de progreso → se instala sola → la app se reinicia con la versión nueva.

**Compilar tu propio `.exe`** (opcional, para desarrollar):

Requisitos: Node 18+, [Rust (rustup)](https://rustup.rs/) y *Visual Studio Build Tools 2022* con el workload **C++ build tools**.

```bash
npm install
npm run tauri build
# -> src-tauri/target/release/bundle/nsis/craneo-studio_x.x.x_x64-setup.exe  (instalador)
# -> src-tauri/target/release/app.exe                                       (portatil)
```

## Funciones

- **53 piezas seleccionables** del craneo (modelo anatomico de Mariano Coretti), con variante **sin mandíbula** (36 piezas)
- **4 materiales**: hueso (textura CC0), metal, vidrio y madera (con selector de color)
- **Iluminacion** con fuentes arrastrables y **temperatura de color en Kelvin** (2000-10000 K, presets 3000-8000 K)
- **Color de fondo** configurable con presets y selector personalizado
- **Perfiles de pose**: guarda y restaura luces, material, fondo, cámara y rotación con un nombre (persisten en el navegador/app)
- **Exportar PNG con fondo transparente** (boton *PNG*, elige carpeta o se guarda en Descargas)
- Presets de camara (3/4, Frente, Perfil, Atrás, Arriba), sliders de rotacion y reset
- Hoja de dibujo (boceto) con deshacer/limpiar

## Estructura

```
index.html          entrada
src/main.js         toda la logica de la app (escena, luces, materiales, export, perfiles)
src/style.css       estilos
src-tauri/          app de escritorio (Tauri 2): config, iconos, código Rust
public/models/      GLB del craneo + licencia
public/textures/    textura de hueso (Poly Haven, CC0)
DESIGN.md           identidad visual: paleta de colores y tipografias
Logo.png            logo de la app (origen de los iconos)
archive-models/     modelos de referencia
```

## Licencias y creditos

- **Modelo 3D**: "High quality skull" de **Mariano Coretti** — [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Atribucion requerida: *Created by Mariano Coretti.*
- **Textura de hueso**: "White Stucco" de [Poly Haven](https://polyhaven.com/) — **CC0** (libre de derechos).
- Interfaz y codigo: independientes del modelo anatomico.
