import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const root = $('#root');

const translations = {
  Cornetto_inf: 'Cornete nasal inferior',
  Etmoide: 'Etmoides',
  Frontale: 'Frontal',
  Lacrimale: 'Lagrimal',
  Mandibola: 'Mandíbula',
  Mascella: 'Maxilar',
  Nasale: 'Nasal',
  Occipitale: 'Occipital',
  Palatino: 'Palatino',
  Parietale: 'Parietal',
  Sfenoide: 'Esfenoides',
  Temporale: 'Temporal',
  Vomere: 'Vómer',
  Zigomatico: 'Cigomático',
};
const skullPattern = /^(?:\d\.[1-8]|Cornetto_inf|Etmoide|Frontale|Lacrimale|Mandibola|Mascella|Nasale|Occipitale|Palatino|Parietale|Sfenoide|Temporale|Vomere|Zigomatico)(?:_(?:DX|SX))?$/i;
const state = {
  lights: [
    { id: 'key', name: 'Luz principal', type: 'directional', color: '#ffd7a1', intensity: 2.25, x: -2.5, y: 3.1, z: -3.4, enabled: true, shadow: true },
    { id: 'fill', name: 'Luz de relleno', type: 'point', color: '#b5d8ff', intensity: 26, x: 2.8, y: 0.6, z: -1.4, enabled: true, shadow: false },
  ],
  selectedLight: 'key',
  selectedBone: null,
  modelMeshes: [],
  modelRoot: null,
  camera: null,
  controls: null,
  renderer: null,
  scene: null,
  helpers: new Map(),
  envIntensity: 0.62,
  woodTint: '#ffffff',
  jawVariant: 'full',
};

root.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="OSSO, inicio">
      <span class="brand-mark" aria-hidden="true">O</span>
      <span class="brand-name">OSSO<span> / ESTUDIO</span></span>
    </a>
    <div class="topbar-center"><span class="live-dot"></span> ESTUDIO DE CRÁNEO <span class="topbar-slash">/</span> MODELO 3D</div>
    <div class="topbar-actions">
      <a class="quiet-button download-app" id="download-app" href="./craneo-studio-setup.exe" download hidden>Descargar app ⬇</a>
      <button class="quiet-button" id="reset-all" title="Restaurar el espacio">Restaurar</button>
      <button class="accent-button" id="save-sketch">Guardar dibujo <span aria-hidden="true">↗</span></button>
    </div>
  </header>
  <main class="workspace">
    <aside class="control-column">
      <section class="intro-card">
        <div class="eyebrow">MESA DE ESTUDIO <span>01 / 03</span></div>
        <h1>Forma.<br><em>Volumen.</em><br>Luz.</h1>
        <p>Rota el modelo, construye una iluminación y úsala como referencia para dibujar.</p>
      </section>

      <section class="panel model-panel">
        <div class="panel-heading"><div><span class="section-index">01</span><h2>Modelo</h2></div><button class="icon-button" id="reset-model" title="Reiniciar modelo">↺</button></div>
        <div class="preset-row" aria-label="Vistas del modelo">
          <button class="preset active" data-view="threequarter">3/4</button><button class="preset" data-view="front">Frente</button><button class="preset" data-view="side">Perfil</button><button class="preset" data-view="back">Atrás</button><button class="preset" data-view="top">Arriba</button>
        </div>
        <div class="range-group"><label for="rot-x">Rotación X <output id="rot-x-value">0°</output></label><input id="rot-x" data-rotation="x" type="range" min="-180" max="180" value="0" /></div>
        <div class="range-group"><label for="rot-y">Rotación Y <output id="rot-y-value">0°</output></label><input id="rot-y" data-rotation="y" type="range" min="-180" max="180" value="0" /></div>
        <div class="range-group"><label for="rot-z">Rotación Z <output id="rot-z-value">0°</output></label><input id="rot-z" data-rotation="z" type="range" min="-180" max="180" value="0" /></div>
        <div class="range-group compact"><label for="zoom">Distancia de cámara <output id="zoom-value">100%</output></label><input id="zoom" type="range" min="45" max="165" value="100" /></div>
        <div class="range-group material-group"><label>Material del modelo <output id="material-value">Hueso</output></label>
          <div class="material-options" role="group" aria-label="Material del modelo">
            <button class="material-chip active" data-material="bone" title="Material original del cráneo">Hueso</button>
            <button class="material-chip" data-material="metal" title="Acero pulido">Metal</button>
            <button class="material-chip" data-material="glass" title="Vidrio esmerilado">Vidrio</button>
            <button class="material-chip" data-material="wood" title="Madera tallada">Madera</button>
          </div>
          <div class="wood-color-row" id="wood-color-row" hidden>
            <label for="wood-color">Color de la madera</label>
            <div class="light-color-picker"><input id="wood-color" type="color" value="#ffffff" /><span id="wood-color-hex">#FFFFFF</span></div>
          </div>
        </div>
        <div class="range-group variant-group"><label>Modelo anatómico <output id="jaw-value">Completo</output></label>
          <div class="material-options" role="group" aria-label="Variante del modelo">
            <button class="variant-chip active" data-jaw="full" title="Cráneo completo: con mandíbula y dientes inferiores">Completo</button>
            <button class="variant-chip" data-jaw="no-jaw" title="Cráneo sin mandíbula ni dientes inferiores">Sin mandíbula</button>
          </div>
        </div>
      </section>

      <section class="panel lighting-panel">
        <div class="panel-heading"><div><span class="section-index">02</span><h2>Iluminación</h2></div><button class="add-button" id="add-light" title="Añadir fuente de luz">+ Añadir</button></div>
        <div class="light-list" id="light-list"></div>
        <div class="selected-light" id="selected-light"></div>
        <div class="range-group ambient"><label for="ambient">Luz ambiente <output id="ambient-value">62%</output></label><input id="ambient" type="range" min="0" max="120" value="62" /></div>
        <p class="panel-note">Las fuentes se proyectan sobre el modelo. Activa sombras en la luz que quieras usar como principal.</p>
      </section>

      <section class="panel bones-panel">
        <div class="panel-heading"><div><span class="section-index">03</span><h2>Estructuras</h2></div><button class="text-button" id="show-all-bones">Mostrar todas</button></div>
        <div class="bone-list" id="bone-list"><div class="load-state">Cargando anatomía…</div></div>
      </section>
      <section class="panel profiles-panel">
        <div class="panel-heading"><div><span class="section-index">04</span><h2>Perfiles</h2></div><button class="add-button" id="save-profile" title="Guardar la configuración actual">+ Guardar</button></div>
        <div class="light-config-row profile-name-row">
          <label for="profile-name">Nombre de la pose</label>
          <input class="profile-input" id="profile-name" type="text" maxlength="28" placeholder="Pose 1" />
        </div>
        <div class="profile-list" id="profile-list"></div>
        <p class="panel-note profiles-note">Guarda luces, material, fondo y cámara para volver a esa pose cuando quieras.</p>
      </section>
    <div class="sidebar-credit">MODELO ABIERTO · CC BY 3.0</div>
    </aside>

    <section class="viewport-column">
      <div class="viewport-toolbar">
        <div class="viewport-label"><span class="status-pip" id="model-status"></span><span id="model-label">Cargando modelo…</span><span class="view-coord">Y ↑ &nbsp;·&nbsp; −Z FRENTE</span></div>
        <div class="view-tools"><button class="view-tool" id="toggle-lights" aria-pressed="true"><span>◉</span> Fuentes</button><button class="view-tool" id="toggle-grid" aria-pressed="true"><span>▦</span> Guía</button><div class="bg-tool"><button class="view-tool" id="bg-toggle" aria-expanded="false" title="Color de fondo del visor"><span>◑</span> Fondo</button><div class="bg-popover" id="bg-popover" hidden><span class="bg-title">COLOR DE FONDO</span><div class="bg-swatches"><button class="bg-swatch active" data-bg="#d7d2c8" style="--swatch:#d7d2c8" title="Lienzo"></button><button class="bg-swatch" data-bg="#f4f1ea" style="--swatch:#f4f1ea" title="Papel"></button><button class="bg-swatch" data-bg="#ffffff" style="--swatch:#ffffff" title="Blanco"></button><button class="bg-swatch" data-bg="#8f9490" style="--swatch:#8f9490" title="Gris"></button><button class="bg-swatch" data-bg="#232627" style="--swatch:#232627" title="Grafito"></button><button class="bg-swatch" data-bg="#101213" style="--swatch:#101213" title="Negro"></button><label class="bg-custom" title="Elegir color"><span>＋</span><input id="bg-custom-color" type="color" value="#d7d2c8" /></label></div></div></div><button class="view-tool" id="frame-model" title="Encuadrar modelo">⌗</button><button class="view-tool" id="export-pose" title="Exportar la pose actual como PNG con fondo transparente"><span>⇩</span> PNG</button></div>
      </div>
      <div class="viewport" id="viewport">
        <canvas id="model-canvas" aria-label="Modelo 3D interactivo del cráneo humano"></canvas>
        <div class="viewport-vignette"></div>
        <div class="viewport-hint"><span class="hint-mouse">⟲</span> ARRASTRA PARA ROTAR <span>·</span> RUEDA PARA ACERCAR</div>
        <div class="axis-widget"><span class="axis-y">Y</span><span class="axis-x">X</span><span class="axis-z">Z</span><i></i></div>
        <div class="loading-overlay" id="loading-overlay"><div class="loader-mark">O</div><span>Preparando estudio</span><small>Modelo anatómico · GLB</small></div>
        <div class="model-error" id="model-error" hidden>No se pudo cargar el modelo. Revisa que el archivo GLB esté en <code>public/models/</code>.</div>
        <div class="selection-toast" id="selection-toast" aria-live="polite"></div>
      </div>
      <div class="viewport-footer"><span>ARRASTRAR · ROTAR</span><span>RUEDA · ZOOM</span><span>CLIC · SELECCIONAR HUESO</span><span class="mesh-count" id="mesh-count">— ESTRUCTURAS</span></div>
    </section>

    <aside class="sketch-column">
      <div class="sketch-heading"><div><span class="section-index">04</span><h2>Tu boceto</h2></div><div class="sketch-page">HOJA 01</div></div>
      <div class="sketch-subtitle"><span>REFERENCIA DE OBSERVACIÓN</span><span>01 — CRÁNEO</span></div>
      <div class="paper-wrap" id="paper-wrap">
        <div class="paper-grid"></div>
        <canvas id="sketch-canvas" aria-label="Lienzo de dibujo del cráneo"></canvas>
        <div class="paper-corner">OSSO<br><span>ESTUDIO</span></div>
        <div class="paper-caption">NOTAS / PROPORCIÓN / LUZ</div>
      </div>
      <div class="sketch-tools">
        <div class="tool-row"><span class="tool-label">Trazo</span><div class="color-options"><button class="swatch selected" data-color="#252728" style="--swatch:#252728" title="Grafito"></button><button class="swatch" data-color="#bd5b3e" style="--swatch:#bd5b3e" title="Sanguina"></button><button class="swatch" data-color="#526f76" style="--swatch:#526f76" title="Azul gris"></button><label class="custom-color" title="Elegir color"><span>＋</span><input id="custom-color" type="color" value="#252728" /></label></div></div>
        <div class="range-group brush-size"><label for="brush">Grosor <output id="brush-value">3 px</output></label><input id="brush" type="range" min="1" max="14" value="3" /></div>
        <div class="sketch-actions"><button class="tool-action" id="undo-sketch">↶ <span>Deshacer</span></button><button class="tool-action" id="clear-sketch">⌫ <span>Limpiar hoja</span></button></div>
      </div>
      <div class="sketch-tip"><span>✳</span><p>Observa cómo cambia el volumen al mover la luz. Dibuja aquí las formas y sombras principales.</p></div>
      <div class="sketch-bottom"><span>LIENZO DIGITAL</span><span>ARCHIVO · 01</span></div>
    </aside>
  </main>
  <footer class="app-footer"><span>OSSO · HERRAMIENTA DE DIBUJO Y OBSERVACIÓN</span><a href="#credits">CRÉDITOS DEL MODELO ↗</a><span>VERSIÓN DE ESTUDIO ${__APP_VERSION__}</span></footer>
  <dialog id="credits-dialog" class="credits-dialog"><button class="close-dialog" id="close-credits" aria-label="Cerrar">×</button><div class="eyebrow">FUENTES Y LICENCIAS</div><h2>Créditos del modelo</h2><p>Modelo anatómico: “High quality skull”, creado por Mariano Coretti como parte de su tesis de odontología “Study and implementation of a decomposable virtual skull in 54 anatomically correct elements”. Atribución solicitada: “Created by Mariano Coretti.” Licencia: Creative Commons Attribution 3.0 (CC BY 3.0).</p><p>Adaptación en esta aplicación: exportación a GLB para el visor, selección individual de sus 53 piezas incluidas y traducción de los nombres anatómicos al español.</p><a href="https://blenderartists.org/t/high-quality-skull-free-asset-download/1100360" target="_blank" rel="noreferrer">Fuente y atribución ↗</a><a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">Texto de la licencia ↗</a><p class="credit-small">La interfaz y el código de OSSO son independientes del modelo anatómico.</p></dialog>
`;

const canvas = $('#model-canvas');
const viewport = $('#viewport');
const loadingOverlay = $('#loading-overlay');
const boneList = $('#bone-list');
const lightList = $('#light-list');
const selectedLightPanel = $('#selected-light');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d7d2c8');
scene.fog = new THREE.Fog('#d7d2c8', 7, 16);
state.scene = scene;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
camera.position.set(-2.35, 0.75, -4.5);
state.camera = camera;
// alpha: true permite exportar el PNG con fondo transparente (scene.background se
// desactiva solo durante la captura); preserveDrawingBuffer permite toDataURL.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
state.renderer = renderer;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 2.2;
controls.maxDistance = 9;
controls.target.set(0, 0, 0);
state.controls = controls;

const hemisphere = new THREE.HemisphereLight('#fff7e8', '#4a4950', state.envIntensity);
scene.add(hemisphere);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#36312c', opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.24;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(200, 80, '#a39e95', '#bbb6ad');
grid.position.y = -1.235;
grid.material.transparent = true;
grid.material.opacity = 0.14;
scene.add(grid);
state.grid = grid;

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(viewport);
function resizeRenderer() {
  const width = viewport.clientWidth || 1;
  const height = viewport.clientHeight || 1;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
resizeRenderer();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let toastTimer;
let previousHighlighted = null;
const boneEntries = [];

function sourceMeta(name) {
  const raw = String(name || '');
  const corettiSide = raw.match(/^(.*)_(DX|SX)$/i);
  if (corettiSide) return { baseName: corettiSide[1], side: corettiSide[2].toUpperCase() === 'DX' ? 'r' : 'l' };
  return { baseName: raw.replace(/\s+/g, ' ').trim(), side: undefined };
}
function cleanBoneName(name) {
  const { baseName: base } = sourceMeta(name);
  if (/^[1-4]\.[1-8]$/.test(base)) return `Diente ${base}`;
  return translations[base] || base.replace(/ bone$/i, '').replace(/ tooth$/i, '').replace(/\s+/g, ' ');
}
function isBoneMesh(object) {
  return object.isMesh && Boolean(skullNodeName(object));
}
function skullNodeName(object) {
  for (let current = object; current; current = current.parent) {
    const sourceName = current.userData?.name || current.name || '';
    if (skullPattern.test(sourceName)) return sourceName;
  }
  return '';
}
function copyWorldMesh(mesh, group, sourceName = skullNodeName(mesh)) {
  const clone = mesh.clone(false);
  clone.children = [];
  const metadata = sourceMeta(sourceName);
  clone.name = sourceName;
  clone.castShadow = true;
  clone.receiveShadow = true;
  clone.userData.sourceName = sourceName;
  clone.userData.baseName = metadata.baseName;
  clone.userData.side = metadata.side;
  clone.userData.displayName = cleanBoneName(metadata.baseName);
  clone.userData.mirrored = false;
  clone.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone();
  clone.userData.baseMaterial = clone.material;
  const matrix = mesh.matrixWorld.clone();
  matrix.decompose(clone.position, clone.quaternion, clone.scale);
  group.add(clone);
  boneEntries.push(clone);
  return clone;
}

function addLight(lightState) {
  let light;
  if (lightState.type === 'point') {
    light = new THREE.PointLight(lightState.color, lightState.intensity, 0, 1.55);
  } else if (lightState.type === 'spot') {
    light = new THREE.SpotLight(lightState.color, lightState.intensity, 0, Math.PI / 3.2, 0.32, 1.4);
    light.target.position.set(0, 0, 0);
    scene.add(light.target);
  } else {
    light = new THREE.DirectionalLight(lightState.color, lightState.intensity);
    light.target.position.set(0, 0, 0);
    scene.add(light.target);
  }
  light.position.set(lightState.x, lightState.y, lightState.z);
  light.castShadow = lightState.shadow && lightState.type !== 'point';
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 15;
  light.shadow.bias = -0.0003;
  scene.add(light);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshBasicMaterial({ color: lightState.color }));
  marker.position.copy(light.position);
  marker.userData.lightId = lightState.id;
  marker.renderOrder = 4;
  scene.add(marker);
  // Esfera de agarre invisible (hija del marker): agranda el área para arrastrar la fuente.
  const pick = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  pick.userData.lightId = lightState.id;
  marker.add(pick);
  state.helpers.set(lightState.id, { light, marker });
  light.visible = lightState.enabled;
  marker.visible = lightState.enabled && $('#toggle-lights').getAttribute('aria-pressed') === 'true';
}

// Escala de intensidad por tipo: direccional no se atenúa; puntual/foco usan caída
// física (candelas). Estos factores igualan el brillo percibido a ~3.5 unidades
// del cráneo para que al cambiar de tipo la luz no cambie de fuerza de golpe.
const lightDecay = { point: 1.55, spot: 1.4 };
const lightRefDistance = 3.5;
const lightMaxIntensity = (type) => (type === 'directional' ? 5 : 80);

function apparentIntensity(intensity, type) {
  return type === 'directional' ? intensity : intensity / Math.pow(lightRefDistance, lightDecay[type]);
}
function convertIntensity(intensity, fromType, toType) {
  const apparent = apparentIntensity(intensity, fromType);
  const raw = toType === 'directional' ? apparent : apparent * Math.pow(lightRefDistance, lightDecay[toType]);
  const max = lightMaxIntensity(toType);
  return Math.min(max, Math.max(0.1, Math.round(raw * 10) / 10));
}

// Actualiza la luz en sitio (color, intensidad, posición, sombras) sin destruirla:
// recrearla en cada input realocaba el shadow map y hacía parpadear la escena.
// Solo se recrea cuando cambia el tipo (clase de luz distinta).
function updateLight(lightState, { recreate = false } = {}) {
  const helper = state.helpers.get(lightState.id);
  if (!helper || recreate) {
    if (helper) {
      scene.remove(helper.light);
      scene.remove(helper.marker);
      if (helper.light.target) scene.remove(helper.light.target);
      helper.light.dispose?.();
      helper.marker.traverse((child) => { child.geometry?.dispose?.(); child.material?.dispose?.(); });
      state.helpers.delete(lightState.id);
    }
    addLight(lightState);
    return;
  }
  const light = helper.light;
  light.color.set(lightState.color);
  light.intensity = lightState.intensity;
  light.position.set(lightState.x, lightState.y, lightState.z);
  light.visible = lightState.enabled;
  light.castShadow = Boolean(lightState.shadow) && lightState.type !== 'point';
  helper.marker.position.copy(light.position);
  helper.marker.visible = lightState.enabled && $('#toggle-lights').getAttribute('aria-pressed') === 'true';
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load('./models/coretti-skull.glb', (gltf) => {
    gltf.scene.updateMatrixWorld(true);
    const modelGroup = new THREE.Group();
    modelGroup.name = 'skull-study-model';
    gltf.scene.traverse((object) => {
      if (!isBoneMesh(object)) return;
      copyWorldMesh(object, modelGroup, skullNodeName(object));
    });
    const bounds = new THREE.Box3().setFromObject(modelGroup);
    if (!Number.isFinite(bounds.min.x) || boneEntries.length === 0) throw new Error('No se encontraron estructuras del cráneo en el GLB.');
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const modelScale = 2.24 / Math.max(size.x, size.y, size.z);
    modelGroup.scale.setScalar(modelScale);
    modelGroup.position.copy(center).multiplyScalar(-modelScale);
    modelGroup.position.y -= 0.02;
    modelGroup.traverse((mesh) => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    // El GLB trae cada hueso con rotación embebida de +90° en X, lo que deja la cara
    // apuntando al suelo. Este pivot lo enderea (arriba = +Y, cara = −Z, coincide con
    // el HUD y el preset "Frente") sin tocar modelGroup, para que los sliders de
    // rotación y el reset sigan funcionando igual.
    const orientation = new THREE.Group();
    orientation.name = 'skull-orientation';
    orientation.quaternion
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    orientation.add(modelGroup);
    scene.add(orientation);
    state.modelRoot = modelGroup;
    state.modelMeshes = boneEntries;
    loadingOverlay.classList.add('is-hidden');
    $('#model-status').classList.add('ready');
    $('#model-label').textContent = 'Cráneo humano · 53 piezas seleccionables';
    $('#mesh-count').textContent = `${boneEntries.length} PIEZAS VISIBLES`;
    updateMeshCount();
    renderBoneList();
    // Material de hueso por defecto al cargar (mismo preset que muestra el chip activo).
    applyMaterial('bone');
    state.lights.forEach(addLight);
    const preset = { x: -2.35, y: 0.75, z: -4.5 };
    camera.position.set(preset.x, preset.y, preset.z);
    controls.update();
  }, undefined, (error) => {
    console.error('No se pudo cargar el modelo del cráneo:', error);
    loadingOverlay.classList.add('is-hidden');
    $('#model-error').hidden = false;
    $('#model-label').textContent = 'Modelo no disponible';
  });
}
loadModel();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

function renderBoneList() {
  const sorted = [...state.modelMeshes].sort((a, b) => a.userData.displayName.localeCompare(b.userData.displayName, 'es'));
  boneList.innerHTML = sorted.map((mesh, index) => {
    const name = mesh.userData.displayName;
    const side = mesh.userData.side;
    const sideLabel = side === 'r' ? 'D' : side === 'l' ? 'I' : '';
    return `<button class="bone-row" data-index="${index}" aria-pressed="false"><span class="bone-symbol">${name.toLowerCase().includes('diente') || name.toLowerCase().includes('incisivo') || name.toLowerCase().includes('molar') || name.toLowerCase().includes('canino') ? '○' : '⌑'}</span><span class="bone-name">${name}</span>${sideLabel ? `<span class="bone-side">${sideLabel}</span>` : ''}<span class="bone-eye">◉</span></button>`;
  }).join('');
  $$('.bone-row', boneList).forEach((button) => {
    button.addEventListener('click', () => {
      const mesh = sorted[Number(button.dataset.index)];
      if (mesh.visible) selectBone(mesh);
      else mesh.visible = true;
      button.classList.toggle('is-hidden', !mesh.visible);
      updateMeshCount();
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const mesh = sorted[Number(button.dataset.index)];
      mesh.visible = !mesh.visible;
      button.classList.toggle('is-hidden', !mesh.visible);
      updateMeshCount();
    });
  });
}

function updateMeshCount() {
  const visible = state.modelMeshes.filter((mesh) => mesh.visible).length;
  $('#mesh-count').textContent = `${visible} PIEZAS VISIBLES`;
}

function selectBone(mesh) {
  if (previousHighlighted) {
    const oldMaterials = Array.isArray(previousHighlighted.material) ? previousHighlighted.material : [previousHighlighted.material];
    oldMaterials.forEach((material) => { material.emissive?.set('#000000'); material.emissiveIntensity = 0; });
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => { if (material.emissive) { material.emissive.set('#9a482f'); material.emissiveIntensity = 0.38; } });
  previousHighlighted = mesh;
  state.selectedBone = mesh;
  $$('.bone-row').forEach((row) => {
    const side = mesh.userData.side;
    const expectedSide = side === 'r' ? 'D' : side === 'l' ? 'I' : undefined;
    const rowSide = row.querySelector('.bone-side')?.textContent;
    const sameBone = row.querySelector('.bone-name')?.textContent === mesh.userData.displayName && rowSide === expectedSide;
    row.classList.toggle('is-selected', sameBone);
  });
  const toast = $('#selection-toast');
  toast.textContent = mesh.userData.displayName + (mesh.userData.side ? ` · ${mesh.userData.side === 'r' ? 'derecho' : 'izquierdo'}` : '');
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2100);
}

// Quita la selección cuando el clic cae en el vacío del visor.
function deselectBone() {
  if (!state.selectedBone) return;
  if (previousHighlighted) {
    const oldMaterials = Array.isArray(previousHighlighted.material) ? previousHighlighted.material : [previousHighlighted.material];
    oldMaterials.forEach((material) => { material.emissive?.set('#000000'); material.emissiveIntensity = 0; });
  }
  previousHighlighted = null;
  state.selectedBone = null;
  $$('.bone-row').forEach((row) => row.classList.remove('is-selected'));
}

// El clic sobre el vacío deselecciona, pero solo si fue un clic real:
// si el puntero se movió (órbita con arrastre) no se toca la selección.
const selectionClick = { x: 0, y: 0, missed: false };

canvas.addEventListener('pointerdown', (event) => {
  if (beginLightDrag(event)) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(state.modelMeshes.filter((mesh) => mesh.visible), false);
  if (hits[0]) {
    selectBone(hits[0].object);
    selectionClick.missed = false;
  } else {
    selectionClick.missed = true;
    selectionClick.x = event.clientX;
    selectionClick.y = event.clientY;
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (!selectionClick.missed) return;
  const moved = Math.hypot(event.clientX - selectionClick.x, event.clientY - selectionClick.y);
  if (moved < 6) deselectBone();
});

// --- Arrastre de fuentes de luz en el visor ---
const markerRaycaster = new THREE.Raycaster();
const lightDrag = { id: null, plane: new THREE.Plane(), offset: new THREE.Vector3(), point: new THREE.Vector3() };
const dragNdc = new THREE.Vector2();
const camDir = new THREE.Vector3();

function pointerToNdc(event) {
  const rect = canvas.getBoundingClientRect();
  dragNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  dragNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return dragNdc;
}

function visibleMarkers() {
  const markers = [];
  state.helpers.forEach(({ marker }) => { if (marker.visible) markers.push(marker); });
  return markers;
}

function beginLightDrag(event) {
  const markers = visibleMarkers();
  if (!markers.length) return false;
  markerRaycaster.setFromCamera(pointerToNdc(event), camera);
  const hit = markerRaycaster.intersectObjects(markers, true)[0];
  if (!hit) return false;
  const id = hit.object.userData.lightId || hit.object.parent?.userData.lightId;
  const helper = state.helpers.get(id);
  if (!id || !helper) return false;
  lightDrag.id = id;
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  // Plano que mira a la cámara y pasa por la luz: se arrastra en el espacio de la vista.
  camera.getWorldDirection(camDir);
  lightDrag.plane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), helper.marker.position);
  if (markerRaycaster.ray.intersectPlane(lightDrag.plane, lightDrag.point)) {
    lightDrag.offset.copy(helper.marker.position).sub(lightDrag.point);
  } else {
    lightDrag.offset.set(0, 0, 0);
  }
  state.selectedLight = id;
  renderLights();
  renderSelectedLight();
  canvas.style.cursor = 'grabbing';
  event.preventDefault();
  event.stopPropagation();
  return true;
}

function moveLightDrag(event) {
  if (!lightDrag.id) return;
  const helper = state.helpers.get(lightDrag.id);
  const lightState = state.lights.find((item) => item.id === lightDrag.id);
  if (!helper || !lightState) return;
  markerRaycaster.setFromCamera(pointerToNdc(event), camera);
  if (!markerRaycaster.ray.intersectPlane(lightDrag.plane, lightDrag.point)) return;
  const target = lightDrag.point.add(lightDrag.offset);
  const clamp = (value) => Math.max(-6, Math.min(6, value));
  lightState.x = clamp(target.x);
  lightState.y = clamp(target.y);
  lightState.z = clamp(target.z);
  helper.light.position.set(lightState.x, lightState.y, lightState.z);
  helper.marker.position.copy(helper.light.position);
  if (state.selectedLight === lightState.id) {
    ['x', 'y', 'z'].forEach((axis) => { const input = $(`#light-${axis}`); if (input) input.value = String(Math.round(lightState[axis] * 10) / 10); });
  }
}

function endLightDrag() {
  if (!lightDrag.id) return;
  lightDrag.id = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}

canvas.addEventListener('pointermove', (event) => {
  if (lightDrag.id) { moveLightDrag(event); return; }
  if (event.buttons !== 0) return;
  const markers = visibleMarkers();
  if (!markers.length) { canvas.style.cursor = ''; return; }
  markerRaycaster.setFromCamera(pointerToNdc(event), camera);
  canvas.style.cursor = markerRaycaster.intersectObjects(markers, true)[0] ? 'grab' : '';
});
canvas.addEventListener('pointerup', endLightDrag);
canvas.addEventListener('pointercancel', endLightDrag);

const viewPositions = {
  threequarter: new THREE.Vector3(-2.35, 0.75, -4.5),
  front: new THREE.Vector3(0, 0.05, -5.4),
  side: new THREE.Vector3(-5.4, 0, 0),
  back: new THREE.Vector3(0, 0.05, 5.4),
  top: new THREE.Vector3(0, 5.4, 0.05),
};
$$('.preset').forEach((button) => button.addEventListener('click', () => {
  $$('.preset').forEach((item) => item.classList.toggle('active', item === button));
  const position = viewPositions[button.dataset.view];
  camera.position.copy(position);
  controls.target.set(0, 0, 0);
  controls.update();
  syncZoom();
}));

function syncZoom() {
  const distance = camera.position.distanceTo(controls.target);
  const value = Math.round(100 * 4.5 / distance);
  $('#zoom').value = String(Math.max(45, Math.min(165, value)));
  $('#zoom-value').textContent = `${$('#zoom').value}%`;
}
$$('[data-rotation]').forEach((input) => input.addEventListener('input', () => {
  if (!state.modelRoot) return;
  const axis = input.dataset.rotation;
  state.modelRoot.rotation[axis] = Number(input.value) * Math.PI / 180;
  $(`#${input.id}-value`).textContent = `${input.value}°`;
}));
$('#zoom').addEventListener('input', (event) => {
  const scale = Number(event.target.value) / 100;
  const direction = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(direction.multiplyScalar(4.5 / scale));
  $('#zoom-value').textContent = `${event.target.value}%`;
});
$('#reset-model').addEventListener('click', () => {
  if (state.modelRoot) state.modelRoot.rotation.set(0, 0, 0);
  $$('[data-rotation]').forEach((input) => { input.value = '0'; $(`#${input.id}-value`).textContent = '0°'; });
  camera.position.copy(viewPositions.threequarter);
  controls.target.set(0, 0, 0);
  controls.update(); syncZoom();
});
$('#frame-model').addEventListener('click', () => { camera.position.copy(viewPositions.threequarter); controls.target.set(0, 0, 0); controls.update(); syncZoom(); });
$('#toggle-grid').addEventListener('click', (event) => {
  state.grid.visible = !state.grid.visible;
  event.currentTarget.setAttribute('aria-pressed', String(state.grid.visible));
});
$('#toggle-lights').addEventListener('click', (event) => {
  const visible = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(visible));
  state.helpers.forEach(({ marker }, id) => { marker.visible = visible && Boolean(state.lights.find((light) => light.id === id)?.enabled); });
});
// Selector de color de fondo del visor: cambia scene.background y la niebla
// (se conserva al exportar el PNG, que siempre sale con fondo transparente).
const bgPopover = $('#bg-popover');
function closeBgPopover() {
  bgPopover.setAttribute('hidden', '');
  $('#bg-toggle').setAttribute('aria-expanded', 'false');
}
$('#bg-toggle').addEventListener('click', (event) => {
  event.stopPropagation();
  const willOpen = bgPopover.hasAttribute('hidden');
  if (willOpen) { bgPopover.removeAttribute('hidden'); } else { closeBgPopover(); }
  $('#bg-toggle').setAttribute('aria-expanded', String(willOpen));
});
bgPopover.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', () => { if (!bgPopover.hasAttribute('hidden')) closeBgPopover(); });
function setBackground(hex) {
  scene.background = new THREE.Color(hex);
  if (scene.fog) scene.fog.color.set(hex);
}
$$('.bg-swatch').forEach((button) => button.addEventListener('click', () => {
  $$('.bg-swatch').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  setBackground(button.dataset.bg);
}));
$('#bg-custom-color').addEventListener('input', (event) => {
  $$('.bg-swatch').forEach((item) => item.classList.remove('active'));
  setBackground(event.target.value);
});
$('#show-all-bones').addEventListener('click', () => {
  state.modelMeshes.forEach((mesh) => { mesh.visible = true; });
  $$('.bone-row').forEach((row) => row.classList.remove('is-hidden'));
  if (state.jawVariant !== 'full') setJawVariant(state.jawVariant); // "Mostrar todas" respeta la variante
  updateMeshCount();
});
$('#ambient').addEventListener('input', (event) => {
  state.envIntensity = Number(event.target.value) / 100;
  hemisphere.intensity = state.envIntensity;
  $('#ambient-value').textContent = `${event.target.value}%`;
});

// Temperatura de color: convierte Kelvin → hex (aprox. Tanner Helland) y al revés
// para mantener sincronizados el slider, el selector de color y la luz.
function kelvinToHex(kelvin) {
  const temp = kelvin / 100;
  let red; let green; let blue;
  if (temp <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temp) - 161.1195681661;
    blue = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    blue = 255;
  }
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(red), clamp(green), clamp(blue)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

// Los extremos del rango (2000 K muy naranja, 10000 K muy azul) tiñen el modelo
// entero. Se mezcla el color con blanco (60 % color / 40 % blanco) para que la
// temperatura sea cálida o fría sin "pintar" el hueso por completo.
function softKelvinHex(kelvin) {
  const mix = 0.6;
  const channel = (value) => Math.round(value * mix + 255 * (1 - mix));
  const rgb = kelvinToHex(kelvin).slice(1);
  return `#${[0, 2, 4].map((i) => channel(parseInt(rgb.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('')}`;
}

function nearestKelvin(hex) {
  const base = hex.replace('#', '');
  const target = [0, 2, 4].map((i) => parseInt(base.slice(i, i + 2), 16));
  let best = 5000; let bestDistance = Infinity;
  for (let kelvin = 2000; kelvin <= 10000; kelvin += 100) {
    const rgb = softKelvinHex(kelvin).slice(1);
    const sample = [0, 2, 4].map((i) => parseInt(rgb.slice(i, i + 2), 16));
    const distance = (target[0] - sample[0]) ** 2 + (target[1] - sample[1]) ** 2 + (target[2] - sample[2]) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = kelvin; }
  }
  return best;
}

// Aplica un color a la luz y actualiza todos los controles en sitio
// (re-renderizar destruiría los inputs y cerraría el selector de color nativo).
function applyLightColor(light, color) {
  light.color = color;
  const helper = state.helpers.get(light.id);
  if (helper) { helper.light.color.set(color); helper.marker.material.color.set(color); }
  const chip = lightList.querySelector(`[data-light-id="${light.id}"] .light-chip`);
  if (chip) chip.style.setProperty('--light-color', color);
  const hex = $('#selected-light .light-color-picker span');
  if (hex) hex.textContent = color.toUpperCase();
  const colorInput = $('#light-color');
  if (colorInput && colorInput.value !== color) colorInput.value = color;
}

// Sincroniza el slider de temperatura, su lectura y los presets con light.kelvin.
function syncTempUI(light) {
  const slider = $('#light-temp');
  const output = $('#light-temp-value');
  if (slider) slider.value = String(light.kelvin);
  if (output) output.textContent = `${light.kelvin} K`;
  $$('#selected-light .temp-chip').forEach((chip) => chip.classList.toggle('active', Number(chip.dataset.kelvin) === light.kelvin));
}

function renderLights() {
  lightList.innerHTML = state.lights.map((light, index) => `<button class="light-card ${light.id === state.selectedLight ? 'selected' : ''} ${light.enabled ? '' : 'disabled'}" data-light-id="${light.id}"><span class="light-chip" style="--light-color:${light.color}">${light.type === 'directional' ? '↗' : light.type === 'spot' ? '⌁' : '●'}</span><span class="light-meta"><strong>${light.name}</strong><small>${light.type === 'directional' ? 'DIRECCIONAL' : light.type === 'spot' ? 'FOCO' : 'PUNTUAL'}</small></span><span class="light-number">${String(index + 1).padStart(2, '0')}</span><span class="light-toggle">${light.enabled ? '●' : '○'}</span></button>`).join('');
  $$('.light-card').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (event.target.closest('.light-toggle')) {
        const item = state.lights.find((light) => light.id === button.dataset.lightId);
        item.enabled = !item.enabled;
        updateLight(item); renderLights(); renderSelectedLight(); return;
      }
      state.selectedLight = button.dataset.lightId;
      renderLights(); renderSelectedLight();
    });
  });
  renderSelectedLight();
}

function renderSelectedLight() {
  const light = state.lights.find((item) => item.id === state.selectedLight);
  if (!light) { selectedLightPanel.innerHTML = '<p class="empty-lights">Selecciona una fuente para editarla.</p>'; return; }
  if (light.kelvin == null) light.kelvin = nearestKelvin(light.color);
  selectedLightPanel.innerHTML = `
    <div class="selected-light-title"><span>AJUSTES DE FUENTE</span>${state.lights.length > 1 ? `<button class="remove-light" id="remove-light" title="Quitar fuente">Eliminar</button>` : ''}</div>
    <div class="light-config-row"><label for="light-type">Tipo</label><select id="light-type"><option value="directional" ${light.type === 'directional' ? 'selected' : ''}>Direccional</option><option value="point" ${light.type === 'point' ? 'selected' : ''}>Puntual</option><option value="spot" ${light.type === 'spot' ? 'selected' : ''}>Foco</option></select></div>
    <div class="light-config-row color-config"><label for="light-color">Tono</label><div class="light-color-picker"><input id="light-color" type="color" value="${light.color}" /><span>${light.color.toUpperCase()}</span></div></div>
    <div class="range-group temp-group"><label for="light-temp">Temperatura <output id="light-temp-value">${light.kelvin} K</output></label><input id="light-temp" type="range" min="2000" max="10000" step="100" value="${light.kelvin}" style="background:linear-gradient(90deg,#ff9338,#ffcf8f,#ffffff,#cfe0ff,#79aaff)" /><div class="temp-presets">${[3000, 4000, 5000, 6000, 7000, 8000].map((k) => `<button class="temp-chip ${light.kelvin === k ? 'active' : ''}" data-kelvin="${k}">${k} K</button>`).join('')}</div></div>
    <div class="range-group"><label for="light-intensity">Intensidad <output id="light-intensity-value">${Math.round(light.intensity * 10) / 10}</output></label><input id="light-intensity" type="range" min="0" max="${lightMaxIntensity(light.type)}" step="0.1" value="${Math.min(light.intensity, lightMaxIntensity(light.type))}" /></div>
    <div class="position-heading"><span>POSICIÓN / DIRECCIÓN</span><span>X · Y · Z</span></div>
    <div class="coordinate-row"><label>X <input id="light-x" type="number" min="-6" max="6" step="0.1" value="${light.x}" /></label><label>Y <input id="light-y" type="number" min="-6" max="6" step="0.1" value="${light.y}" /></label><label>Z <input id="light-z" type="number" min="-6" max="6" step="0.1" value="${light.z}" /></label></div>
    <label class="shadow-toggle"><input id="light-shadow" type="checkbox" ${light.shadow ? 'checked' : ''} ${light.type === 'point' ? 'disabled' : ''}/><span class="checkmark"></span><span>Proyectar sombras</span><span class="shadow-cost">${light.type === 'point' ? 'No disponible' : 'Más rendimiento'}</span></label>
  `;
  $('#light-type').addEventListener('change', (event) => {
    const previousType = light.type;
    const nextType = event.target.value;
    if (nextType === previousType) return;
    // Reescalar la intensidad para conservar el brillo percibido al cambiar de tipo.
    light.intensity = convertIntensity(light.intensity, previousType, nextType);
    light.type = nextType;
    if (nextType === 'point') light.shadow = false;
    updateLight(light, { recreate: true });
    renderLights();
  });
  // Selector de color manual: mantiene el slider de temperatura sincronizado.
  $('#light-color').addEventListener('input', (event) => {
    applyLightColor(light, event.target.value);
    light.kelvin = nearestKelvin(light.color);
    syncTempUI(light);
  });
  // Temperatura de color (Kelvin): define el tono de la luz, del 2000 K (cálido)
  // al 10000 K (frío), sincronizado con el selector de color.
  const setKelvin = (kelvin) => {
    const value = Math.max(2000, Math.min(10000, Math.round(kelvin / 100) * 100));
    light.kelvin = value;
    applyLightColor(light, softKelvinHex(value));
    syncTempUI(light);
  };
  $('#light-temp').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setKelvin(value);
  });
  $$('#selected-light .temp-chip').forEach((chip) => chip.addEventListener('click', () => setKelvin(Number(chip.dataset.kelvin))));
  $('#light-intensity').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    light.intensity = value;
    $('#light-intensity-value').textContent = `${Math.round(light.intensity * 10) / 10}`;
    updateLight(light);
  });
  ['x', 'y', 'z'].forEach((axis) => $(`#light-${axis}`).addEventListener('input', (event) => {
    // El campo numérico puede quedar vacío o con "-" mientras se escribe: ignorar
    // valores no finitos para que la luz no salte a NaN y desaparezca de la escena.
    if (event.target.value.trim() === '') return;
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    light[axis] = value;
    updateLight(light);
  }));
  $('#light-shadow').addEventListener('change', (event) => { light.shadow = event.target.checked; updateLight(light); });
  $('#remove-light')?.addEventListener('click', () => {
    const removed = state.helpers.get(light.id);
    if (removed) { scene.remove(removed.light, removed.marker); if (removed.light.target) scene.remove(removed.light.target); state.helpers.delete(light.id); }
    state.lights = state.lights.filter((item) => item.id !== light.id);
    state.selectedLight = state.lights[0]?.id;
    renderLights();
  });
}
$('#add-light').addEventListener('click', () => {
  if (state.lights.length >= 5) { toast('Puedes usar hasta cinco fuentes a la vez.'); return; }
  const index = state.lights.length + 1;
  const light = { id: `light-${Date.now()}`, name: `Luz nueva ${index - 2 > 0 ? index - 2 : ''}`.trim(), type: 'spot', color: '#f2e1c1', intensity: 12, x: -2, y: 1.7, z: 2.2, enabled: true, shadow: true };
  state.lights.push(light); state.selectedLight = light.id; addLight(light); renderLights();
});
function toast(message) {
  const element = $('#selection-toast'); element.textContent = message; element.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 2000);
}
renderLights();

// --- Materiales del modelo (hueso / metal / vidrio / madera) ---
let environmentMap = null;
let woodTexture = null;

function getEnvironment() {
  if (!environmentMap) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  return environmentMap;
}

// Textura de madera generada por código: vetas sinusoidales sobre base cálida.
function makeWoodTexture() {
  if (woodTexture) return woodTexture;
  const size = 512;
  const surface = document.createElement('canvas');
  surface.width = surface.height = size;
  const context = surface.getContext('2d');
  context.fillStyle = '#9a6a3d';
  context.fillRect(0, 0, size, size);
  for (let line = 0; line < 150; line += 1) {
    const baseY = Math.random() * size;
    const shade = 40 + Math.floor(Math.random() * 45);
    context.strokeStyle = `rgba(${shade + 45},${shade},${Math.max(18, shade - 22)},${0.1 + Math.random() * 0.25})`;
    context.lineWidth = 1 + Math.random() * 3;
    context.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = baseY + Math.sin((x / size) * Math.PI * 4 + line) * 6 + Math.sin(x * 0.05 + line) * 3;
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let knot = 0; knot < 5; knot += 1) {
    const kx = Math.random() * size;
    const ky = Math.random() * size;
    for (let ring = 1; ring <= 5; ring += 1) {
      context.strokeStyle = `rgba(70,42,22,${0.16 - ring * 0.02})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.ellipse(kx, ky, ring * 6, ring * 3.4, Math.random(), 0, Math.PI * 2);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  woodTexture = texture;
  return texture;
}

// Textura de hueso: "White Stucco" de Poly Haven (CC0, 1K) con contraste
// reducido offline (35% del original, sin manchas) — se carga como imagen
// directa: usar CanvasTexture con canvas redimensionado se subía en negro a la GPU.
let boneTexture = null;
function getBoneTexture() {
  if (!boneTexture) {
    boneTexture = new THREE.TextureLoader().load('./textures/bone_diffuse_soft.jpg');
    boneTexture.wrapS = boneTexture.wrapT = THREE.RepeatWrapping;
    boneTexture.colorSpace = THREE.SRGBColorSpace;
    boneTexture.repeat.set(1.5, 1.5);
  }
  return boneTexture;
}

// Cada malla guarda su material original (baseMaterial) y una caché por preset,
// para que el resaltado de selección (emissive) siga funcionando por malla.
function presetMaterialFor(mesh, preset) {
  if (!mesh.userData.presetMaterials) mesh.userData.presetMaterials = {};
  if (mesh.userData.presetMaterials[preset]) return mesh.userData.presetMaterials[preset];
  let material;
  if (preset === 'bone') {
    material = new THREE.MeshStandardMaterial({ map: getBoneTexture(), color: '#f7f1e3', roughness: 0.6, metalness: 0 });
  } else if (preset === 'metal') {
    material = new THREE.MeshStandardMaterial({ color: '#d8dbe0', metalness: 1, roughness: 0.28, envMapIntensity: 1.1 });
  } else if (preset === 'glass') {
    material = new THREE.MeshPhysicalMaterial({ color: '#eef4f6', metalness: 0, roughness: 0.14, transmission: 0.9, thickness: 0.4, ior: 1.45, transparent: true });
  } else {
    material = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), color: state.woodTint || '#ffffff', roughness: 0.75, metalness: 0 });
  }
  mesh.userData.presetMaterials[preset] = material;
  return material;
}

function clearGlow(material) {
  if (material?.emissive) { material.emissive.set('#000000'); material.emissiveIntensity = 0; }
}

function applyMaterial(preset) {
  // Metal y vidrio necesitan un entorno (PMREM) para reflejar; el hueso y la
  // madera lo dejan apagado para no alterar su aspecto de estudio.
  scene.environment = preset === 'metal' || preset === 'glass' ? getEnvironment() : null;
  state.modelMeshes.forEach((mesh) => {
    const base = mesh.userData.baseMaterial;
    if (base) clearGlow(base);
    Object.values(mesh.userData.presetMaterials || {}).forEach(clearGlow);
    mesh.material = presetMaterialFor(mesh, preset);
  });
  if (state.selectedBone?.material) {
    const materials = Array.isArray(state.selectedBone.material) ? state.selectedBone.material : [state.selectedBone.material];
    materials.forEach((material) => { if (material.emissive) { material.emissive.set('#9a482f'); material.emissiveIntensity = 0.38; } });
  }
  $('#material-value').textContent = { bone: 'Hueso', metal: 'Metal', glass: 'Vidrio', wood: 'Madera' }[preset] || 'Hueso';
  $('#wood-color-row').hidden = preset !== 'wood';
}

// Tinte de la madera: multiplica el color de la textura generada por código.
function setWoodTint(color) {
  state.woodTint = color;
  const hex = $('#wood-color-hex');
  const input = $('#wood-color');
  if (hex) hex.textContent = color.toUpperCase();
  if (input && input.value !== color) input.value = color;
  state.modelMeshes.forEach((mesh) => {
    const material = mesh.userData.presetMaterials?.wood;
    if (material) material.color.set(color);
  });
}

$('#wood-color').addEventListener('input', (event) => setWoodTint(event.target.value));

$$('.material-chip').forEach((button) => button.addEventListener('click', () => {
  $$('.material-chip').forEach((item) => item.classList.toggle('active', item === button));
  applyMaterial(button.dataset.material);
}));

// Variante del modelo: completo o sin mandíbula (la mandíbula y los dientes
// inferiores, cuadrantes 3 y 4 de la notación FDI).
function isJawPiece(mesh) {
  const name = mesh.userData.displayName || '';
  return name === 'Mandíbula' || /^Diente [34]\./.test(name);
}

function setJawVariant(variant) {
  state.jawVariant = variant;
  const show = variant === 'full';
  state.modelMeshes.forEach((mesh) => { if (isJawPiece(mesh)) mesh.visible = show; });
  $('#jaw-value').textContent = show ? 'Completo' : 'Sin mandíbula';
  $$('.variant-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.jaw === variant));
  $$('.bone-row').forEach((row) => {
    const name = row.querySelector('.bone-name')?.textContent || '';
    const jawRow = name === 'Mandíbula' || /^Diente [34]\./.test(name);
    row.classList.toggle('is-variant-off', jawRow && !show);
  });
  if (!show && state.selectedBone && isJawPiece(state.selectedBone)) deselectBone();
  updateMeshCount();
}

$$('.variant-chip').forEach((chip) => chip.addEventListener('click', () => setJawVariant(chip.dataset.jaw)));

// --- Exportación de la pose como PNG con fondo transparente ---
$('#export-pose').addEventListener('click', () => {
  if (!state.modelRoot) { toast('El modelo aún no está listo.'); return; }
  const previousBackground = scene.background;
  const previousFog = scene.fog;
  const previousFloor = floor.visible;
  const previousGrid = state.grid.visible;
  const markerVisibility = [];
  // Escena limpia: solo el modelo, sin fondo, niebla, suelo, rejilla ni marcadores.
  scene.background = null;
  scene.fog = null;
  floor.visible = false;
  state.grid.visible = false;
  state.helpers.forEach(({ marker }) => { markerVisibility.push([marker, marker.visible]); marker.visible = false; });
  renderer.setClearAlpha(0);
  renderer.render(scene, camera);
  // toBlob en vez de toDataURL: la data URL del PNG completo es enorme y algunos
  // navegadores bloquean o silencian la descarga. El blob usa object URL estable.
  // toBlob toma el snapshot del canvas al llamar, así que la escena se restaura
  // de inmediato (sin esperar al callback) para que no parpadee un frame.
  renderer.domElement.toBlob((blob) => {
    if (!blob || !blob.size) { toast('No se pudo generar el PNG (lienzo vacío).'); return; }
    const kb = Math.max(1, Math.round(blob.size / 1024));
    // Descarga clásica: object URL + anchor (fallback y navegadores sin FS Access).
    const download = () => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.download = 'osso-pose-craneo.png';
      anchor.href = url;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revocar tras el click para no romper la descarga en curso.
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast(`Pose exportada (${kb} KB): se guarda en tu carpeta de Descargas.`);
    };
    // Si el navegador soporta File System Access, el usuario elige dónde guardar
    // (evita que el archivo se pierda cuando Descargas está personalizado).
    // Se escribe como ArrayBuffer: escribir el Blob directo dejó archivos de 0 bytes.
    // userActivation evita lanzar el diálogo sin un clic real del usuario.
    if (window.showSaveFilePicker && navigator.userActivation && navigator.userActivation.isActive) {
      window.showSaveFilePicker({
        suggestedName: 'osso-pose-craneo.png',
        types: [{ description: 'Imagen PNG', accept: { 'image/png': ['.png'] } }],
      }).then(async (handle) => {
        const data = await blob.arrayBuffer();
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        toast(`Pose guardada (${kb} KB) en la carpeta que elegiste.`);
      }).catch((error) => {
        if (error && error.name === 'AbortError') return; // el usuario canceló
        download();
      });
      return;
    }
    download();
  }, 'image/png');
  scene.background = previousBackground;
  scene.fog = previousFog;
  floor.visible = previousFloor;
  state.grid.visible = previousGrid;
  markerVisibility.forEach(([marker, visible]) => { marker.visible = visible; });
});

// Drawing sheet: independent 2D canvas for fast sketching and PNG export.
const sketchCanvas = $('#sketch-canvas');
const sketchContext = sketchCanvas.getContext('2d');
const paperWrap = $('#paper-wrap');
let drawing = false;
let currentColor = '#252728';
let brushWidth = 3;
const undoStack = [];
function resizeSketch(keep = true) {
  const old = keep && sketchCanvas.width ? document.createElement('canvas') : null;
  if (old) { old.width = sketchCanvas.width; old.height = sketchCanvas.height; old.getContext('2d').drawImage(sketchCanvas, 0, 0); }
  const rect = paperWrap.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  sketchCanvas.width = Math.round(rect.width * ratio);
  sketchCanvas.height = Math.round(rect.height * ratio);
  sketchContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (old) sketchContext.drawImage(old, 0, 0, rect.width, rect.height);
}
const sketchObserver = new ResizeObserver(() => resizeSketch(true));
sketchObserver.observe(paperWrap);
resizeSketch(false);
function saveUndo() {
  if (undoStack.length > 12) undoStack.shift();
  undoStack.push(sketchContext.getImageData(0, 0, sketchCanvas.width, sketchCanvas.height));
}
function sketchPoint(event) {
  const rect = sketchCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
sketchCanvas.addEventListener('pointerdown', (event) => {
  drawing = true; sketchCanvas.setPointerCapture(event.pointerId); saveUndo();
  const point = sketchPoint(event); sketchContext.beginPath(); sketchContext.moveTo(point.x, point.y);
  sketchContext.strokeStyle = currentColor; sketchContext.lineWidth = brushWidth; sketchContext.lineCap = 'round'; sketchContext.lineJoin = 'round';
  sketchContext.lineTo(point.x + 0.01, point.y + 0.01); sketchContext.stroke();
});
sketchCanvas.addEventListener('pointermove', (event) => { if (!drawing) return; const point = sketchPoint(event); sketchContext.lineTo(point.x, point.y); sketchContext.stroke(); });
const endDraw = () => { drawing = false; sketchContext.closePath(); };
sketchCanvas.addEventListener('pointerup', endDraw);
sketchCanvas.addEventListener('pointercancel', endDraw);
$$('.swatch').forEach((button) => button.addEventListener('click', () => {
  currentColor = button.dataset.color;
  $$('.swatch').forEach((item) => item.classList.toggle('selected', item === button));
}));
$('#custom-color').addEventListener('input', (event) => { currentColor = event.target.value; $$('.swatch').forEach((item) => item.classList.remove('selected')); });
$('#brush').addEventListener('input', (event) => { brushWidth = Number(event.target.value); $('#brush-value').textContent = `${brushWidth} px`; });
$('#undo-sketch').addEventListener('click', () => { const image = undoStack.pop(); if (image) sketchContext.putImageData(image, 0, 0); });
$('#clear-sketch').addEventListener('click', () => { saveUndo(); sketchContext.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height); });
$('#save-sketch').addEventListener('click', () => {
  const exportCanvas = document.createElement('canvas');
  const ratio = window.devicePixelRatio || 1;
  exportCanvas.width = Math.round(paperWrap.clientWidth * ratio);
  exportCanvas.height = Math.round(paperWrap.clientHeight * ratio);
  const context = exportCanvas.getContext('2d');
  context.fillStyle = '#f5f1e9'; context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  context.drawImage(sketchCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
  const anchor = document.createElement('a'); anchor.download = 'osso-boceto-craneo.png'; anchor.href = exportCanvas.toDataURL('image/png'); anchor.click();
});
$('#reset-all').addEventListener('click', () => {
  $('#reset-model').click();
  state.lights = [
    { id: 'key', name: 'Luz principal', type: 'directional', color: '#ffd7a1', intensity: 2.25, x: -2.5, y: 3.1, z: -3.4, enabled: true, shadow: true },
    { id: 'fill', name: 'Luz de relleno', type: 'point', color: '#b5d8ff', intensity: 26, x: 2.8, y: 0.6, z: -1.4, enabled: true, shadow: false },
  ];
  [...state.helpers.keys()].forEach((id) => { const helper = state.helpers.get(id); scene.remove(helper.light, helper.marker); if (helper.light.target) scene.remove(helper.light.target); state.helpers.delete(id); });
  state.selectedLight = 'key'; state.lights.forEach(addLight); renderLights();
  state.envIntensity = 0.62; hemisphere.intensity = 0.62; $('#ambient').value = '62'; $('#ambient-value').textContent = '62%';
  state.grid.visible = true; $('#toggle-grid').setAttribute('aria-pressed', 'true');
  $$('.bg-swatch').forEach((item, id) => item.classList.toggle('active', id === 0));
  $('#bg-custom-color').value = '#d7d2c8';
  setBackground('#d7d2c8');
  setWoodTint('#ffffff');
  toast('Espacio de estudio restaurado.');
});

// --- Perfiles de pose: guardan luces, material, fondo y cámara en el navegador ---
const PROFILE_KEY = 'craneo-studio-profiles';
const MATERIAL_NAMES = { bone: 'Hueso', metal: 'Metal', glass: 'Vidrio', wood: 'Madera' };
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function readProfiles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeProfiles(profiles) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles)); } catch { toast('No se pudo guardar: el navegador bloqueó el almacenamiento.'); }
}

// Instantánea de toda la configuración actual de estudio.
function captureProfile(name) {
  const background = scene.background;
  return {
    id: `profile-${Date.now()}`,
    name,
    camera: { position: camera.position.toArray(), target: controls.target.toArray() },
    rotation: ['x', 'y', 'z'].map((axis) => (state.modelRoot ? state.modelRoot.rotation[axis] : 0)),
    material: $$('.material-chip.active')[0]?.dataset.material || 'bone',
    woodTint: state.woodTint,
    jawVariant: state.jawVariant,
    background: background ? `#${background.getHexString()}` : '#d7d2c8',
    ambient: state.envIntensity,
    selectedLight: state.selectedLight,
    lights: JSON.parse(JSON.stringify(state.lights)),
  };
}

// Restaura un perfil replicando la misma mecánica de "Restaurar" por subsistemas.
function loadProfile(profile) {
  if (!state.modelRoot) { toast('El modelo aún no está listo.'); return; }
  // Cámara (posición y objetivo reales; no obliga a coincidir con un preset)
  camera.position.fromArray(profile.camera.position);
  controls.target.fromArray(profile.camera.target);
  controls.update();
  syncZoom();
  $$('.preset').forEach((item) => item.classList.remove('active'));
  // Rotación del modelo + sliders sincronizados
  const rotation = Array.isArray(profile.rotation) ? profile.rotation : [0, 0, 0];
  ['x', 'y', 'z'].forEach((axis, index) => { state.modelRoot.rotation[axis] = Number(rotation[index]) || 0; });
  $$('[data-rotation]').forEach((input) => {
    const degrees = Math.round((Number(rotation[['x', 'y', 'z'].indexOf(input.dataset.rotation)]) || 0) * 180 / Math.PI);
    input.value = String(degrees);
    $(`#${input.id}-value`).textContent = `${degrees}°`;
  });
  // Material, tinte de madera y variante
  const material = MATERIAL_NAMES[profile.material] ? profile.material : 'bone';
  $$('.material-chip').forEach((item) => item.classList.toggle('active', item.dataset.material === material));
  applyMaterial(material);
  setWoodTint(profile.woodTint || '#ffffff');
  setJawVariant(profile.jawVariant || 'full');
  // Fondo del visor
  const background = profile.background || '#d7d2c8';
  const matchingSwatch = $$('.bg-swatch').find((item) => (item.dataset.bg || '').toLowerCase() === background.toLowerCase());
  $$('.bg-swatch').forEach((item) => item.classList.toggle('active', item === matchingSwatch));
  $('#bg-custom-color').value = background;
  setBackground(background);
  // Luz ambiente
  const ambient = Math.round((Number(profile.ambient) || 0) * 100);
  state.envIntensity = ambient / 100;
  hemisphere.intensity = state.envIntensity;
  $('#ambient').value = String(ambient);
  $('#ambient-value').textContent = `${ambient}%`;
  // Fuentes de luz: se retiran las actuales y se recrean desde el perfil
  [...state.helpers.keys()].forEach((id) => {
    const helper = state.helpers.get(id);
    scene.remove(helper.light, helper.marker);
    if (helper.light.target) scene.remove(helper.light.target);
    state.helpers.delete(id);
  });
  state.lights = JSON.parse(JSON.stringify(Array.isArray(profile.lights) && profile.lights.length ? profile.lights : []));
  if (!state.lights.length) {
    state.lights = [{ id: 'key', name: 'Luz principal', type: 'directional', color: '#ffd7a1', intensity: 2.25, x: -2.5, y: 3.1, z: -3.4, enabled: true, shadow: true }];
  }
  state.selectedLight = state.lights.some((light) => light.id === profile.selectedLight) ? profile.selectedLight : state.lights[0].id;
  state.lights.forEach(addLight);
  renderLights(); // también repinta el panel "Ajustes de fuente"
  toast(`Perfil "${profile.name}" cargado.`);
}

function renderProfiles() {
  const list = $('#profile-list');
  const profiles = readProfiles();
  if (!profiles.length) {
    list.innerHTML = '<p class="profile-empty">Sin perfiles guardados. Ajusta la escena, ponle nombre y pulsa Guardar.</p>';
    return;
  }
  list.innerHTML = profiles.map((profile) => `
    <div class="profile-row" data-id="${escapeHtml(profile.id)}">
      <button class="profile-load" title="Cargar este perfil">
        <strong>${escapeHtml(profile.name)}</strong>
        <small>${profile.lights?.length || 0} luces · ${MATERIAL_NAMES[profile.material] || 'Hueso'}${profile.jawVariant === 'no-jaw' ? ' · sin mandíbula' : ''}</small>
      </button>
      <button class="profile-delete" title="Eliminar perfil" aria-label="Eliminar perfil ${escapeHtml(profile.name)}">✕</button>
    </div>`).join('');
  $$('.profile-row', list).forEach((row) => {
    const profile = readProfiles().find((item) => item.id === row.dataset.id);
    row.querySelector('.profile-load').addEventListener('click', () => profile && loadProfile(profile));
    row.querySelector('.profile-delete').addEventListener('click', () => {
      writeProfiles(readProfiles().filter((item) => item.id !== row.dataset.id));
      renderProfiles();
      toast('Perfil eliminado.');
    });
  });
}

$('#save-profile').addEventListener('click', () => {
  if (!state.modelRoot) { toast('El modelo aún no está listo.'); return; }
  const profiles = readProfiles();
  const name = $('#profile-name').value.trim() || `Pose ${profiles.length + 1}`;
  profiles.push(captureProfile(name));
  writeProfiles(profiles);
  $('#profile-name').value = '';
  renderProfiles();
  toast(`Perfil "${name}" guardado.`);
});

$('#profile-name').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') $('#save-profile').click();
});

renderProfiles();

$('#credits-dialog').showModal = $('#credits-dialog').showModal.bind($('#credits-dialog'));
$$('a[href="#credits"]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); $('#credits-dialog').showModal(); }));
$('#close-credits').addEventListener('click', () => $('#credits-dialog').close());
$('#credits-dialog').addEventListener('click', (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });

// --- Auto-update: solo dentro del .exe de Tauri ---
// Comprueba el endpoint del updater y, si hay una versión más nueva,
// muestra un aviso con botón para descargarla e instalarla.
// En el navegador (modo dev) no hace nada.
async function checkForUpdates() {
  if (!('__TAURI_INTERNALS__' in window)) return;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update) showUpdateBanner(update);
  } catch (error) {
    console.warn('No se pudo comprobar actualizaciones:', error);
  }
}

function showUpdateBanner(update) {
  if ($('#update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <div class="update-text">
      <strong>Nueva versión ${escapeHtml(update.version)}</strong>
      <small>${escapeHtml(update.body || 'Hay una actualización disponible de OSSO · Craneo Studio.')}</small>
    </div>
    <button class="update-apply">Actualizar</button>
    <button class="update-close" aria-label="Cerrar aviso de actualización">✕</button>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('is-visible'));
  banner.querySelector('.update-close').addEventListener('click', () => banner.remove());
  banner.querySelector('.update-apply').addEventListener('click', async () => {
    const apply = banner.querySelector('.update-apply');
    apply.disabled = true;
    apply.textContent = 'Descargando…';
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      let downloaded = 0;
      let total = 0;
      // En Windows el instalador cierra la app solo al instalar (limitación de NSIS).
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength || 0;
        if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          apply.textContent = total ? `Descargando ${Math.round(100 * downloaded / total)} %` : 'Descargando…';
        }
      });
      apply.textContent = 'Instalado · reiniciando…';
      await relaunch();
    } catch (error) {
      apply.disabled = false;
      apply.textContent = 'Reintentar';
      toast(`No se pudo actualizar: ${error.message || error}`);
    }
  });
}

checkForUpdates();
setInterval(checkForUpdates, 4 * 60 * 60 * 1000);

// Muestra la versión real de la app en el pie (dentro del .exe);
// en el navegador se queda la versión fijada al compilar la web.
async function syncAppVersion() {
  if (!('__TAURI_INTERNALS__' in window)) return;
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    const version = await getVersion();
    const slot = $('.app-footer span:last-child');
    if (slot) slot.textContent = `VERSIÓN DE ESTUDIO ${version}`;
  } catch (error) {
    console.warn('No se pudo leer la versión de la app:', error);
  }
}
syncAppVersion();

// En la web ofrecemos la descarga del .exe de escritorio;
// dentro de la propia app ese botón no tiene sentido.
// La URL se lee de latest.json (misma fuente que el actualizador).
if (!('__TAURI_INTERNALS__' in window)) {
  const download = $('#download-app');
  download.hidden = false;
  fetch('./latest.json')
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const url = data?.platforms?.['windows-x86_64']?.url;
      if (url) download.href = url;
    })
    .catch(() => {}); // sin latest.json nos quedamos con el href por defecto
}
