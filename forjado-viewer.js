/* =========================================================================
   forjado-viewer.js — Visor 3D del panel de forjado ACTIA
   three.js + GLTFLoader + OrbitControls. Animación Ensamblado <-> Explotado.
   Lazy-init: solo arranca cuando la sección entra en viewport.
   ========================================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = 'assets/forjado-panel.glb';

/* Capas del forjado, en orden de stack y con su etiqueta + prefijos de nodo. */
const LAYER_DEFS = [
  { key: 'yeso',      label: 'Placa yeso-fibra (Fermacell)', prefixes: ['P - Yeso Fibra'] },
  { key: 'vapor',     label: 'Lámina de vapor',              prefixes: ['Lámina vapor', 'Lamina vapor', 'L\u00e1mina vapor'] },
  { key: 'estructura',label: 'Estructura · vigas GL24h',     prefixes: ['Durmiente', 'Correa', 'Testero'] },
  { key: 'aislante',  label: 'Aislante · lana de roca',      prefixes: ['Aislante'] },
  { key: 'osb',       label: 'Tablero OSB',                  prefixes: ['P - OSB'] },
];

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
}
const LAYER_NORM = LAYER_DEFS.map(d => ({ key: d.key, nps: d.prefixes.map(norm) }));

function matchLayer(name) {
  const n = norm(name);
  if (!n) return null;
  for (const def of LAYER_NORM) {
    for (const p of def.nps) {
      if (p && n.indexOf(p) !== -1) return def.key;
    }
  }
  return null;
}

function init() {
  const wrap = document.getElementById('forjado-canvas');
  if (!wrap || wrap.dataset.ready) return;
  wrap.dataset.ready = '1';

  const loadingEl = document.getElementById('forjado-loading');

  const W = () => wrap.clientWidth;
  const H = () => wrap.clientHeight;

  // ---- Renderer ----------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrap.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'pan-y';

  // ---- Scene + env -------------------------------------------------------
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ---- Camera ------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.01, 5000);

  // ---- Lights ------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cdb6, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(1, 1.6, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-1.2, 0.4, -0.8);
  scene.add(fill);

  // ---- Controls ----------------------------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false;        // sin zoom — encuadre fijo
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.6;

  // ---- Model state -------------------------------------------------------
  const root = new THREE.Group();
  scene.add(root);

  const layerGroups = {};   // key -> { meshes:[], dir:Vector3, offset:number, baseOffsets:Map }
  let explodeAxis = new THREE.Vector3(0, 1, 0);
  let explodeSpacing = 1;
  let modelRadius = 1;
  let centerYFull = 0;   // Y of the exploded centroid (target rises with explode)
  let frameSphereR = 1;  // bounding-sphere radius of the exploded model
  function reframe() {
    const vHalf = (camera.fov * Math.PI / 180) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const dist = frameSphereR / Math.sin(Math.min(vHalf, hHalf)) * 1.05;
    camera.position.set(
      controls.target.x + dist * 0.62,
      controls.target.y + dist * 0.42,
      controls.target.z + dist * 0.95
    );
    camera.near = dist / 1000;
    camera.far = dist * 14;
    camera.updateProjectionMatrix();
  }

  let explode = 1;          // current 0..1 (start exploded)
  let explodeTarget = 1;
  const partData = [];      // { mesh, baseWorld:Vector3, mag:number }
  let worldUpWorld = new THREE.Vector3(0, 1, 0);  // world vertical (explode dir)
  const _scratch = new THREE.Vector3();

  // ---- Ground shadow plane ----------------------------------------------
  let shadowPlane;

  const loader = new GLTFLoader();
  loader.load(MODEL_URL, (gltf) => {
    const model = gltf.scene;

    // Group meshes by layer (walk up to find a named ancestor that matches)
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) {
        o.material.side = THREE.DoubleSide;
        if ('roughness' in o.material && o.material.roughness > 0.95) o.material.roughness = 0.85;
      }
      let p = o, key = null;
      while (p && !key) { key = matchLayer(p.name); p = p.parent; }
      if (!key) key = 'estructura';
      (layerGroups[key] = layerGroups[key] || { meshes: [] }).meshes.push(o);
    });

    root.add(model);

    // Center the whole model at origin
    let box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    modelRadius = Math.max(size.x, size.y, size.z) * 0.5;

    // Determine stacking axis = axis where the layer centroids spread most
    const present = LAYER_DEFS.filter(d => layerGroups[d.key]);
    const centroids = present.map(d => {
      const b = new THREE.Box3();
      layerGroups[d.key].meshes.forEach(m => b.expandByObject(m));
      return { key: d.key, c: b.getCenter(new THREE.Vector3()) };
    });
    const spread = (ax) => {
      let mn = Infinity, mx = -Infinity;
      centroids.forEach(o => { const v = o.c.getComponent(ax); mn = Math.min(mn, v); mx = Math.max(mx, v); });
      return mx - mn;
    };
    const sx = spread(0), sy = spread(1), sz = spread(2);
    const axI = (sx >= sy && sx >= sz) ? 0 : (sy >= sz ? 1 : 2);
    explodeAxis = new THREE.Vector3(axI === 0 ? 1 : 0, axI === 1 ? 1 : 0, axI === 2 ? 1 : 0);
    // Force the UP sense to be +Y so "arriba" reads correctly on screen.
    if (explodeAxis.y < 0) explodeAxis.multiplyScalar(-1);
    const axisExtent = size.getComponent(axI);
    const nLayers = centroids.length;
    const footprint = Math.max(size.x, size.y, size.z);
    explodeSpacing = Math.max((axisExtent / Math.max(1, nLayers)) * 1.5, footprint * 0.085);

    // ---- Bidirectional explosion centered on the timber frame ----
    // The structure (correa/durmiente/testero) + the insulation between joists
    // stay FIXED in the middle. Every other sheet moves away from that plane:
    // sheets physically above rise, sheets below descend. Sheets are clustered
    // by their real height (not by material) because Fermacell exists both on
    // top and bottom — grouping by material would average them to the center.
    const ANCHOR_KEYS = new Set(['estructura', 'aislante']);
    const _b = new THREE.Box3(), _v = new THREE.Vector3();
    const meshInfo = [];
    Object.keys(layerGroups).forEach((k) => {
      layerGroups[k].meshes.forEach((m) => {
        _b.setFromObject(m);
        meshInfo.push({ m, key: k, c: _b.getCenter(_v).getComponent(axI), anchor: ANCHOR_KEYS.has(k) });
      });
    });
    const anchorMeshes = meshInfo.filter(o => o.anchor);
    const movingMeshes = meshInfo.filter(o => !o.anchor);
    const anchorC = anchorMeshes.length
      ? anchorMeshes.reduce((s, o) => s + o.c, 0) / anchorMeshes.length
      : meshInfo.reduce((s, o) => s + o.c, 0) / meshInfo.length;

    // World "up" = the stacking axis expressed in WORLD space. Revit models
    // carry a root rotation AND a unit scale that isn't 1, so we move each part
    // in true world space (via worldToLocal) instead of along its local axis.
    worldUpWorld.copy(explodeAxis).normalize();
    scene.updateMatrixWorld(true);

    const SEP = 0.5; // 50 cm fixed gap between consecutive layers

    // Cluster MOVING meshes into distinct sheets by height (gap to previous mesh)
    movingMeshes.sort((a, b) => a.c - b.c);
    const gap = axisExtent * 0.015; // ~6 mm: splits boards, keeps a board together
    const sheets = [];
    movingMeshes.forEach((o) => {
      const last = sheets[sheets.length - 1];
      if (last && (o.c - last.cMax) <= gap) {
        last.items.push(o); last.cMax = o.c; last.sum += o.c; last.cAvg = last.sum / last.items.length;
      } else {
        sheets.push({ items: [o], cMax: o.c, sum: o.c, cAvg: o.c, mag: 0 });
      }
    });
    // Uniform 50 cm steps: above the frame -> up, below -> down
    const aboveSheets = sheets.filter(s => s.cAvg > anchorC).sort((a, b) => a.cAvg - b.cAvg);
    const belowSheets = sheets.filter(s => s.cAvg <= anchorC).sort((a, b) => b.cAvg - a.cAvg);
    aboveSheets.forEach((s, i) => { s.mag = (i + 1) * SEP; });
    belowSheets.forEach((s, i) => { s.mag = -(i + 1) * SEP; });

    // Anchored timber frame + insulation (fixed in the middle)
    anchorMeshes.forEach((o) => partData.push({ mesh: o.m, baseWorld: o.m.getWorldPosition(new THREE.Vector3()), mag: 0 }));
    // Moving sheets
    let maxMag = 0, minMag = 0;
    sheets.forEach((s) => {
      maxMag = Math.max(maxMag, s.mag); minMag = Math.min(minMag, s.mag);
      s.items.forEach((o) => partData.push({ mesh: o.m, baseWorld: o.m.getWorldPosition(new THREE.Vector3()), mag: s.mag }));
    });

    const maxOffset = Math.max(Math.abs(maxMag), Math.abs(minMag));
    centerYFull = (maxMag + minMag) / 2;   // world-Y midpoint of the exploded stack
    const verticalExtent = (maxMag - minMag) + axisExtent;

    // Ground shadow — sits just below the anchored bottom layer
    const groundY = -(size.y / 2 + modelRadius * 0.25);
    const shMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(modelRadius * 16, modelRadius * 16), shMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = groundY;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Camera framing — fit the exploded BOUNDING SPHERE so the panel stays
    // fully visible at any rotation (zoom is disabled). Account for the
    // portrait viewport: the narrower (horizontal) FOV is the binding limit.
    frameSphereR = 0.5 * Math.sqrt(size.x * size.x + size.z * size.z + verticalExtent * verticalExtent) * 1.06;
    controls.target.set(0, centerYFull, 0);
    reframe();
    controls.maxPolarAngle = Math.PI * 0.92;   // don't dip fully under the floor
    const shadowSpan = Math.max(size.x, size.z, verticalExtent);
    key.shadow.camera.left = -shadowSpan;
    key.shadow.camera.right = shadowSpan;
    key.shadow.camera.top = shadowSpan;
    key.shadow.camera.bottom = -shadowSpan;
    key.shadow.camera.near = 0.01;
    key.shadow.camera.far = camera.position.length() + frameSphereR * 4;
    key.shadow.camera.updateProjectionMatrix();
    controls.update();

    applyExplode(explode);
    if (loadingEl) loadingEl.style.display = 'none';
    wrap.dataset.loaded = '1';

    window.__forjadoDebug = {
      meshCount: partData.length,
      groups: Object.keys(layerGroups).map(k => k + ':' + layerGroups[k].meshes.length),
      size: size.toArray().map(v => Math.round(v * 100) / 100),
      modelRadius: Math.round(modelRadius * 100) / 100,
      camPos: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      near: +camera.near.toFixed(3), far: Math.round(camera.far),
      axis: explodeAxis.toArray(),
      sep: SEP,
      anchorC: Math.round(anchorC * 1000) / 1000,
      centerYFull: Math.round(centerYFull * 100) / 100,
      magRange: [Math.round(minMag * 100) / 100, Math.round(maxMag * 100) / 100],
      sheets: sheets.length, above: aboveSheets.length, below: belowSheets.length,
      anchorMeshes: anchorMeshes.length, movingMeshes: movingMeshes.length,
      // Verify the top sheet's ACTUAL world displacement is purely vertical:
      worldMoveSample: (function(){
        let top = null; partData.forEach(p => { if (!top || p.mag > top.mag) top = p; });
        if (!top) return null;
        const w = top.mesh.getWorldPosition(new THREE.Vector3());
        return w.sub(top.baseWorld).toArray().map(v => Math.round(v * 1000) / 1000);
      })(),
    };
    window.__forjadoFit = () => {
      renderer.render(scene, camera);
      camera.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const mn = box.min, mx = box.max; const xs = [], ys = [];
      for (const x of [mn.x, mx.x]) for (const y of [mn.y, mx.y]) for (const z of [mn.z, mx.z]) {
        const v = new THREE.Vector3(x, y, z).project(camera); xs.push(v.x); ys.push(v.y);
      }
      const inView = Math.max(...xs.map(Math.abs)) <= 1 && Math.max(...ys.map(Math.abs)) <= 1;
      return JSON.stringify({ inView, boxMin: box.min.toArray().map(v=>Math.round(v*100)/100), boxMax: box.max.toArray().map(v=>Math.round(v*100)/100), camPos: camera.position.toArray().map(v=>Math.round(v*100)/100), fov: camera.fov, aspect: Math.round(camera.aspect*100)/100, ndcX: [Math.min(...xs).toFixed(2), Math.max(...xs).toFixed(2)], ndcY: [Math.min(...ys).toFixed(2), Math.max(...ys).toFixed(2)] });
    };
    window.__forjadoRotateFit = (azDeg, polarDeg) => {
      const r = camera.position.distanceTo(controls.target);
      const az = azDeg * Math.PI / 180, po = polarDeg * Math.PI / 180;
      camera.position.set(
        controls.target.x + r * Math.sin(po) * Math.sin(az),
        controls.target.y + r * Math.cos(po),
        controls.target.z + r * Math.sin(po) * Math.cos(az)
      );
      camera.lookAt(controls.target);
      camera.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const mn = box.min, mx = box.max; const xs = [], ys = [];
      for (const x of [mn.x, mx.x]) for (const y of [mn.y, mx.y]) for (const z of [mn.z, mx.z]) {
        const v = new THREE.Vector3(x, y, z).project(camera); xs.push(v.x); ys.push(v.y);
      }
      const inView = Math.max(...xs.map(Math.abs)) <= 1 && Math.max(...ys.map(Math.abs)) <= 1;
      return JSON.stringify({ az: azDeg, polar: polarDeg, inView, ndcMaxAbs: [Math.max(...xs.map(Math.abs)).toFixed(2), Math.max(...ys.map(Math.abs)).toFixed(2)] });
    };
    window.__forjadoProbe = () => {
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let lit = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 5) lit++;
      return JSON.stringify({ w, h, litFrac: Math.round(lit / (w * h) * 100) + '%' });
    };
  }, (xhr) => {
    if (loadingEl && xhr.total) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      loadingEl.textContent = 'Cargando modelo 3D · ' + pct + '%';
    }
  }, (err) => {
    console.error('[forjado] error cargando glb', err);
    if (loadingEl) loadingEl.textContent = 'No se pudo cargar el modelo 3D';
  });

  function applyExplode(t) {
    for (const p of partData) {
      // world target = original world position + world-vertical * mag
      _scratch.copy(p.baseWorld).addScaledVector(worldUpWorld, p.mag * t);
      // convert to the mesh's local space (handles root rotation + scale)
      p.mesh.parent.worldToLocal(_scratch);
      p.mesh.position.copy(_scratch);
    }
  }

  // ---- Public controls ---------------------------------------------------
  const slider = document.getElementById('forjado-scrub');
  const btnAsm = document.querySelector('[data-mode-btn="assembled"]');
  const btnExp = document.querySelector('[data-mode-btn="exploded"]');
  const rotToggle = document.getElementById('forjado-rotate');

  function setActiveBtn() {
    const exploded = explodeTarget > 0.5;
    btnAsm && btnAsm.classList.toggle('active', !exploded);
    btnExp && btnExp.classList.toggle('active', exploded);
  }
  if (btnAsm) btnAsm.addEventListener('click', () => { explodeTarget = 0; setActiveBtn(); });
  if (btnExp) btnExp.addEventListener('click', () => { explodeTarget = 1; setActiveBtn(); });
  if (slider) slider.addEventListener('input', () => {
    explode = explodeTarget = slider.value / 100;
    setActiveBtn();
  });
  if (rotToggle) rotToggle.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    rotToggle.classList.toggle('active', controls.autoRotate);
  });

  // ---- Resize ------------------------------------------------------------
  const ro = new ResizeObserver(() => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    reframe();
  });
  ro.observe(wrap);

  // ---- Loop --------------------------------------------------------------
  function tick() {
    requestAnimationFrame(tick);
    // ease explode toward target
    if (Math.abs(explode - explodeTarget) > 0.001) {
      explode += (explodeTarget - explode) * 0.12;
      if (slider && document.activeElement !== slider) slider.value = Math.round(explode * 100);
      applyExplode(explode);
    }
    // Keep the model vertically centered: target rises as it explodes.
    controls.target.y += (centerYFull * explode - controls.target.y) * 0.2;
    controls.update();
    renderer.render(scene, camera);
  }
  tick();
}

// Lazy init when the solution section scrolls into view
function arm() {
  const target = document.getElementById('forjado-canvas');
  if (!target) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { io.disconnect(); init(); } });
  }, { rootMargin: '200px' });
  io.observe(target);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arm);
} else {
  arm();
}

// Debug/verification hook — allows forcing init without scrolling.
window.__initForjado = init;
