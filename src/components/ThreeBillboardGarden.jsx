import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FIG_SPRITE_POOLS } from '../data/figSpriteAssets';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const TAU = Math.PI * 2;

function ThreeBillboardGarden({ mood, sceneState = {}, elementHistory = [], quiet = false, calm = false, interactionMode = 'draw', handDrawOnly = false }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, pointerId: null, x: 0, y: 0, orbit: 0, tilt: 0, zoom: 0 });
  const sceneStateRef = useRef(sceneState);
  const interactionModeRef = useRef(interactionMode);
  const sceneKey = useMemo(
    () => [
      mood?.tone || 'path',
      sceneState.totalStrokeCount || 0,
      sceneState.grassCoverage || 0,
      sceneState.flowerBloom || 0,
      sceneState.windEnergy || 0,
      sceneState.nightSparkle || 0,
      elementHistory.length,
    ].join('|'),
    [mood?.tone, sceneState, elementHistory.length],
  );

  useEffect(() => {
    sceneStateRef.current = sceneState;
  }, [sceneState]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
    if (interactionMode !== 'view') {
      pointerRef.current = { x: 0, y: 0 };
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
    }
  }, [interactionMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = createEngine(canvas);
    engineRef.current = engine;
    seedGarden(engine, { mood, sceneState, elementHistory, quiet, calm, handDrawOnly });

    const parent = canvas.closest('.garden-stage') || canvas.parentElement || canvas;
    const handlePointer = (event) => {
      if (interactionModeRef.current !== 'view') return;
      const rect = parent.getBoundingClientRect();
      pointerRef.current = {
        x: clamp(((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2, -1, 1),
        y: clamp(((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2, -1, 1),
      };
      if (dragRef.current.active && (dragRef.current.pointerId === null || dragRef.current.pointerId === event.pointerId)) {
        const dx = event.clientX - dragRef.current.x;
        const dy = event.clientY - dragRef.current.y;
        dragRef.current.x = event.clientX;
        dragRef.current.y = event.clientY;
        dragRef.current.orbit += dx * 0.006;
        dragRef.current.tilt = clamp(dragRef.current.tilt + dy * 0.004, -0.65, 0.55);
      }
    };
    const handlePointerDown = (event) => {
      handlePointer(event);
      if (!isSceneRotateGesture(event, interactionModeRef.current)) return;
      event.preventDefault();
      dragRef.current.active = true;
      dragRef.current.pointerId = event.pointerId;
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
    };
    const handlePointerUp = (event) => {
      if (dragRef.current.pointerId !== null && dragRef.current.pointerId !== event.pointerId) return;
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
    };
    const handleContextMenu = (event) => {
      if (isSceneRotateGesture(event, interactionModeRef.current)) event.preventDefault();
    };
    const handleWheel = (event) => {
      if (interactionModeRef.current !== 'view') return;
      event.preventDefault();
      dragRef.current.zoom = clamp(dragRef.current.zoom + event.deltaY * 0.0035, -9, 8);
    };

    parent.addEventListener('pointermove', handlePointer, { passive: true, capture: true });
    parent.addEventListener('pointerdown', handlePointerDown, { passive: false, capture: true });
    parent.addEventListener('pointerup', handlePointerUp, { passive: true, capture: true });
    parent.addEventListener('pointercancel', handlePointerUp, { passive: true, capture: true });
    parent.addEventListener('contextmenu', handleContextMenu);
    parent.addEventListener('wheel', handleWheel, { passive: false });

    let raf = 0;
    const loop = () => {
      raf = window.requestAnimationFrame(loop);
      updateEngine(engine, pointerRef.current, dragRef.current, sceneStateRef.current, interactionModeRef.current);
    };
    loop();

    return () => {
      window.cancelAnimationFrame(raf);
      parent.removeEventListener('pointermove', handlePointer, { capture: true });
      parent.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      parent.removeEventListener('pointerup', handlePointerUp, { capture: true });
      parent.removeEventListener('pointercancel', handlePointerUp, { capture: true });
      parent.removeEventListener('contextmenu', handleContextMenu);
      parent.removeEventListener('wheel', handleWheel);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    seedGarden(engine, { mood, sceneState, elementHistory, quiet, calm, handDrawOnly });
  }, [sceneKey, mood, sceneState, elementHistory, quiet, calm, handDrawOnly]);

  return <canvas className="three-billboard-garden" ref={canvasRef} aria-hidden="true" />;
}

function isSceneRotateGesture(event, mode = 'draw') {
  return mode === 'view' && event.button === 0;
}

function createEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
  camera.position.set(0, 8.5, 28);
  camera.lookAt(0, 2.6, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x7aa16b, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0cb, 1.45);
  sun.position.set(12, 24, 14);
  scene.add(sun);

  const world = new THREE.Group();
  scene.add(world);

  const billboards = new BillboardSystem(world);
  const sprites = buildSpriteLibrary();
  const ground = createGround();
  world.add(ground);
  const placementMarkers = new THREE.Group();
  world.add(placementMarkers);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const skyPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || canvas.clientWidth || 1);
    const height = Math.max(1, rect.height || canvas.clientHeight || 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    renderer,
    scene,
    camera,
    world,
    billboards,
    sprites,
    ground,
    placementMarkers,
    raycaster,
    ndc,
    skyPlane,
    historyPlacementCache: new Map(),
    hemi,
    sun,
    observer,
    clock: new THREE.Clock(),
    dispose() {
      observer.disconnect();
      disposeObject(world);
      renderer.dispose();
    },
  };
}

function updateEngine(engine, pointer, drag, sceneState, interactionMode = 'draw') {
  const elapsed = engine.clock.getElapsedTime();
  const wind = clamp((sceneState.windEnergy || 0) * 1.45 + Math.abs(sceneState.gestureWind || 0) * 0.55, 0.16, 1.35);
  const calm = clamp(sceneState.calmLevel || 0, 0, 1);
  const speed = 0.13 + wind * 0.08;
  const viewMotion = interactionMode === 'view';
  const orbit = drag.orbit + (viewMotion ? elapsed * speed * (0.8 + (sceneState.animationSpeed || 1) * 0.35) + pointer.x * 0.16 : 0);
  const radius = 29 - calm * 1.8 + drag.zoom;
  const x = Math.sin(orbit) * radius * 0.52;
  const z = Math.cos(orbit) * radius + 3.4;
  const y = 7.8 + (viewMotion ? pointer.y * -1.35 : 0) + drag.tilt * 2.4 + calm * 0.7;

  engine.camera.position.lerp(new THREE.Vector3(x, y, z), 0.07);
  engine.camera.lookAt((viewMotion ? pointer.x * 2.2 : 0), 2.0 + (viewMotion ? pointer.y * -0.55 : 0) + drag.tilt * 0.5, -2.4);
  engine.world.rotation.y = viewMotion ? Math.sin(elapsed * 0.16) * 0.05 + pointer.x * 0.035 : 0;
  engine.billboards.setWind(wind);
  engine.billboards.update(elapsed);
  updatePlacementMarkers(engine);

  const night = (sceneState.nightSparkle || 0) > 0.22 || (sceneState.brightness || 1) < 0.38;
  engine.renderer.toneMappingExposure = night ? 0.72 : 1.02 + (sceneState.sunlightWarmth || 0) * 0.12;
  engine.hemi.intensity = night ? 0.72 : 1.08;
  engine.sun.intensity = night ? 0.48 : 1.45;
  engine.renderer.render(engine.scene, engine.camera);
}

function seedGarden(engine, { mood, sceneState, elementHistory, quiet, calm, handDrawOnly }) {
  engine.billboards.clearAll();
  clearPlacementMarkers(engine);
  setGroundTone(engine.ground, sceneState);

  const seed = hashString(`${mood?.id || mood?.tone || 'garden'}-${sceneState.totalStrokeCount || 0}-${elementHistory.length}`);
  const random = mulberry32(seed);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const moodFamily = moodToFlowerFamily(mood);
  const grassCount = handDrawOnly ? 0 : Math.round(80 + (sceneState.grassCoverage || 0) * 210 + (sceneState.growthLevel || 0) * 80);
  const flowerCount = handDrawOnly ? 0 : Math.round(8 + (sceneState.flowerBloom || 0) * 120 + (sceneState.flowerCount || 0) * 5);
  const treeCount = handDrawOnly ? 0 : (quiet || calm ? 24 : 36);
  const cloudCount = handDrawOnly ? 0 : Math.round(5 + (sceneState.windEnergy || 0) * 6 + (sceneState.fogOpacity || 0) * 5);
  const butterflyCount = handDrawOnly ? 0 : Math.round(5 + (sceneState.sunlightWarmth || 0) * 8 + (sceneState.flowerBloom || 0) * 7);

  const layers = {
    grass: engine.sprites.grass.map((texture) => engine.billboards.createLayer(texture, { sway: 1.15, capacity: 700 })),
    trees: engine.sprites.trees.map((texture) => engine.billboards.createLayer(texture, { sway: 0.22, capacity: 90 })),
    clouds: engine.sprites.clouds.map((texture) => engine.billboards.createLayer(texture, { sway: 0, capacity: 30 })),
    butterflies: engine.sprites.butterflies.map((texture) => engine.billboards.createLayer(texture, { sway: 0.45, capacity: 30 })),
    flowers: engine.sprites.flowers[moodFamily].map((texture) => engine.billboards.createLayer(texture, { sway: 1.1, capacity: 420 })),
  };

  for (let index = 0; index < grassCount; index += 1) {
    const [x, z] = randomDisc(random, 20, 14);
    engine.billboards.add(pick(layers.grass), x, 0.02, z, 1.25 + random() * 1.45, random() * TAU);
  }
  for (let index = 0; index < flowerCount; index += 1) {
    const [x, z] = randomDisc(random, 18, 12.5);
    engine.billboards.add(pick(layers.flowers), x, 0.04, z, 2.4 + random() * 2.4, random() * TAU);
  }
  for (let index = 0; index < treeCount; index += 1) {
    const angle = random() * TAU;
    const rx = 24 + random() * 10;
    const rz = 17 + random() * 8;
    const frontBand = Math.sin(angle) > 0.42;
    const treeZ = frontBand ? Math.sin(angle) * (rz + 4) + 4 : Math.sin(angle) * rz - 8;
    engine.billboards.add(pick(layers.trees), Math.cos(angle) * rx, 0, treeZ, 7.6 + random() * 7.4, random() * TAU);
  }
  for (let index = 0; index < cloudCount; index += 1) {
    const angle = random() * TAU;
    const rx = 20 + random() * 18;
    const rz = 12 + random() * 18;
    engine.billboards.add(pick(layers.clouds), Math.cos(angle) * rx, 10 + random() * 8, Math.sin(angle) * rz - 8, 6 + random() * 5, random() * TAU);
  }
  for (let index = 0; index < butterflyCount; index += 1) {
    const [x, z] = randomDisc(random, 16, 10);
    engine.billboards.add(pick(layers.butterflies), x, 1.8 + random() * 2.8, z, 0.75 + random() * 0.5, random() * TAU);
  }

  const strokeItems = elementHistory.slice(-70);
  strokeItems.forEach((item, index) => {
    addHistoryBillboards(engine, layers, item, index);
  });
}

function addHistoryBillboards(engine, layers, item, index) {
  const seed = hashString(item.id || item.sourceStrokeId || `${item.tool}-${index}`);
  const random = mulberry32(seed);
  const family = getToolBillboardFamily(item.tool);
  const base = getScenePointFromStroke(engine, item, family, index);
  const intensity = clamp(item.speed || item.density || 0.5, 0.18, 1);
  const clusterCount = getToolClusterCount(item.tool, intensity);
  const groundBaseCount = family === 'flower' ? 2 + Math.round(intensity * 2) : 0;
  const ageSeconds = Math.max(0, (Date.now() - Number(item.createdAt || 0)) / 1000);
  const birthTime = Number(item.createdAt || 0);

  addPlacementMarker(engine, base, family, ageSeconds);

  for (let offset = 0; offset < clusterCount; offset += 1) {
    const layer = pickLayerForTool(layers, item.tool, random);
    if (!layer) continue;
    const spread = getClusterSpread(family, intensity);
    const dx = (random() - 0.5) * spread.x;
    const dz = (random() - 0.5) * spread.z;
    const dy = family === 'sky' ? (random() - 0.5) * spread.y : random() * spread.y;
    const size = getToolSize(item.tool, intensity) * (0.82 + random() * 0.42);
    const x = clamp(base.x + dx, -24, 24);
    const y = Math.max(0.02, base.y + dy);
    const z = clamp(base.z + dz, -20, 18);
    engine.billboards.add(layer, x, y, z, size, random() * TAU, { birthTime });
  }

  for (let offset = 0; offset < groundBaseCount; offset += 1) {
    const grassLayer = pickLayerForTool(layers, 'grass', random);
    const angle = random() * TAU;
    const radius = 0.45 + random() * (1.1 + intensity);
    const size = (0.82 + random() * 0.58) * (1.2 + intensity * 0.8);
    engine.billboards.add(
      grassLayer,
      clamp(base.x + Math.cos(angle) * radius, -24, 24),
      0.025,
      clamp(base.z + Math.sin(angle) * radius * 0.75, -20, 18),
      size,
      random() * TAU,
      { birthTime },
    );
  }
}

function addPlacementMarker(engine, base, family, ageSeconds) {
  if (!Number.isFinite(ageSeconds) || ageSeconds > 1.5 || family === 'sky') return;
  const fade = 1 - clamp(ageSeconds / 1.5, 0, 1);
  const geometry = new THREE.RingGeometry(0.45 + (1 - fade) * 0.2, 1.1 + (1 - fade) * 1.4, 40);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffe39a,
    transparent: true,
    opacity: 0.34 * fade,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const marker = new THREE.Mesh(geometry, material);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(base.x, 0.035, base.z);
  marker.renderOrder = 6;
  marker.userData.createdAt = Date.now() - ageSeconds * 1000;
  engine.placementMarkers.add(marker);
}

function clearPlacementMarkers(engine) {
  if (!engine.placementMarkers) return;
  for (const child of [...engine.placementMarkers.children]) {
    engine.placementMarkers.remove(child);
    child.geometry?.dispose();
    child.material?.dispose();
  }
}

function updatePlacementMarkers(engine) {
  if (!engine.placementMarkers) return;
  const now = Date.now();
  for (const marker of [...engine.placementMarkers.children]) {
    const age = (now - Number(marker.userData.createdAt || now)) / 1000;
    if (age > 1.5) {
      engine.placementMarkers.remove(marker);
      marker.geometry?.dispose();
      marker.material?.dispose();
      continue;
    }
    const fade = 1 - clamp(age / 1.5, 0, 1);
    marker.scale.setScalar(1 + age * 0.32);
    marker.material.opacity = 0.34 * fade;
    marker.material.needsUpdate = true;
  }
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - ((1 - t) ** 3);
}

function pickLayerForTool(layers, tool, random = Math.random) {
  const randomLayer = (items) => items[Math.floor(random() * items.length)];
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) return randomLayer(layers.flowers);
  if (['grass', 'seed', 'reed', 'moss', 'smallTree', 'sprout', 'memorySeed'].includes(tool)) return randomLayer(layers.grass);
  if (['cloud', 'wind', 'windLine', 'softWind', 'ribbon', 'floatingLeaf'].includes(tool)) return randomLayer(layers.clouds);
  if (['sun', 'sunlight', 'lantern', 'firefly', 'star', 'moonbeam', 'rainbow'].includes(tool)) return randomLayer(layers.butterflies);
  return randomLayer(layers.grass);
}

function getScenePointFromStroke(engine, item, family, index) {
  const cacheKey = item.id || item.sourceStrokeId || `${item.tool}-${index}`;
  const cached = engine.historyPlacementCache.get(cacheKey);
  if (cached) return cached;

  const point = raycastScenePointFromStroke(engine, item, family) || getWorldPointFromStroke(item, family);
  engine.historyPlacementCache.set(cacheKey, point);
  return point;
}

function raycastScenePointFromStroke(engine, item, family) {
  const width = Math.max(item.canvasWidth || item.stageWidth || 720, 1);
  const height = Math.max(item.canvasHeight || item.stageHeight || 540, 1);
  const x = Number.isFinite(item.x) ? item.x : item.quickdrawBoundingBox?.centerX;
  const y = Number.isFinite(item.y) ? item.y : item.quickdrawBoundingBox?.centerY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  engine.ndc.set(
    clamp((x / width) * 2 - 1, -1, 1),
    clamp(-(y / height) * 2 + 1, -1, 1),
  );
  engine.camera.updateMatrixWorld(true);
  engine.world.updateMatrixWorld(true);
  engine.raycaster.setFromCamera(engine.ndc, engine.camera);

  if (family === 'sky') {
    const skyHit = new THREE.Vector3();
    if (engine.raycaster.ray.intersectPlane(engine.skyPlane, skyHit)) {
      const local = engine.world.worldToLocal(skyHit.clone());
      return {
        x: clamp(local.x, -22, 22),
        y: clamp(local.y, 6.8, 15.5),
        z: clamp(local.z, -18, 10),
      };
    }
  }

  const hits = engine.raycaster.intersectObject(engine.ground, false);
  if (!hits.length) return null;
  const local = engine.world.worldToLocal(hits[0].point.clone());
  return {
    x: clamp(local.x, -24, 24),
    y: 0.05,
    z: clamp(local.z, -20, 18),
  };
}

function getWorldPointFromStroke(item, family) {
  const width = Math.max(item.canvasWidth || 720, 1);
  const height = Math.max(item.canvasHeight || 540, 1);
  const nx = clamp((Number.isFinite(item.x) ? item.x / width : 0.5) * 2 - 1, -1, 1);
  const ny = clamp((Number.isFinite(item.y) ? item.y / height : 0.58) * 2 - 1, -1, 1);

  if (family === 'sky') {
    return {
      x: nx * 18,
      y: 8.2 + (1 - Math.max(0, ny)) * 2.8,
      z: -11 + ny * 5,
    };
  }

  const depth = clamp(ny + 0.18, -0.95, 1);
  const perspectiveWidth = 9.5 + (depth + 1) * 4.6;
  return {
    x: nx * perspectiveWidth,
    y: 0.05,
    z: depth * 13.5,
  };
}

function getToolBillboardFamily(tool) {
  if (isSkyTool(tool)) return 'sky';
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) return 'flower';
  return 'ground';
}

function getToolClusterCount(tool, intensity) {
  if (['cloud', 'wind', 'windLine', 'softWind', 'ribbon', 'floatingLeaf'].includes(tool)) return 1 + Math.round(intensity * 2);
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) return 2 + Math.round(intensity * 3);
  if (['grass', 'seed', 'reed', 'moss', 'smallTree', 'sprout', 'memorySeed'].includes(tool)) return 3 + Math.round(intensity * 5);
  if (['sun', 'sunlight', 'lantern', 'firefly', 'star', 'moonbeam', 'rainbow'].includes(tool)) return 2 + Math.round(intensity * 3);
  return 2 + Math.round(intensity * 4);
}

function getClusterSpread(family, intensity) {
  if (family === 'sky') return { x: 5 + intensity * 6, y: 1.2 + intensity * 1.6, z: 2.5 + intensity * 2 };
  if (family === 'flower') return { x: 2 + intensity * 2.4, y: 0.18, z: 1.2 + intensity * 2.2 };
  return { x: 2.4 + intensity * 3.4, y: 0.12, z: 1.8 + intensity * 2.8 };
}

function getToolSize(tool, intensity) {
  if (['cloud', 'wind', 'windLine', 'softWind'].includes(tool)) return 4 + intensity * 3.5;
  if (['flower', 'firstFlower', 'bud', 'quietFlower'].includes(tool)) return 2.6 + intensity * 1.8;
  if (['sun', 'sunlight', 'firefly', 'star'].includes(tool)) return 0.7 + intensity * 0.7;
  return 1.5 + intensity * 1.2;
}

function isSkyTool(tool) {
  return ['cloud', 'wind', 'windLine', 'softWind', 'ribbon', 'floatingLeaf', 'sun', 'sunlight', 'firefly', 'star', 'moonbeam', 'rainbow'].includes(tool);
}

class BillboardSystem {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this.shared = {
      uTime: { value: 0 },
      uWind: { value: 0.25 },
    };
  }

  createLayer(texture, { sway = 1, capacity = 500 } = {}) {
    const image = texture.image;
    const aspect = image && image.height ? image.width / image.height : (texture.userData.defaultAspect || 1);
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 6);
    geometry.translate(0, 0.5, 0);
    const phases = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    geometry.setAttribute('aPhase', phases);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    const shared = this.shared;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shared.uTime;
      shader.uniforms.uWind = shared.uWind;
      shader.uniforms.uSway = { value: sway };
      shader.vertexShader = [
        'attribute float aPhase;',
        'uniform float uTime;',
        'uniform float uWind;',
        'uniform float uSway;',
        shader.vertexShader,
      ].join('\n');
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        [
          'vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);',
          'float sx = length(instanceMatrix[0].xyz);',
          'float sy = length(instanceMatrix[1].xyz);',
          'float wave = sin(uTime * 2.2 + aPhase) * 0.42 + sin(uTime * 0.92 + aPhase * 1.7) * 0.18;',
          'float sway = uSway * uWind * wave * position.y * sy;',
          'mvPosition.x += position.x * sx + sway;',
          'mvPosition.y += position.y * sy;',
          'gl_Position = projectionMatrix * mvPosition;',
        ].join('\n'),
      );
    };

    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);

    const layer = {
      mesh,
      phases,
      capacity,
      count: 0,
      aspect,
      matrix: new THREE.Matrix4(),
      instances: new Array(capacity),
    };
    this.layers.push(layer);
    return layer;
  }

  add(layer, x, y, z, size, phase, options = {}) {
    if (!layer || layer.count >= layer.capacity) return false;
    const index = layer.count;
    layer.matrix.makeScale(size * layer.aspect, size, 1);
    layer.matrix.setPosition(x, y, z);
    layer.mesh.setMatrixAt(index, layer.matrix);
    layer.phases.array[index] = phase;
    layer.instances[index] = {
      x,
      y,
      z,
      size,
      birthTime: options.birthTime || 0,
    };
    layer.count += 1;
    layer.mesh.count = layer.count;
    layer.mesh.instanceMatrix.needsUpdate = true;
    layer.phases.needsUpdate = true;
    return true;
  }

  clearAll() {
    for (const layer of this.layers) {
      this.scene.remove(layer.mesh);
      layer.mesh.geometry.dispose();
      layer.mesh.material.dispose();
    }
    this.layers = [];
  }

  setWind(value) {
    this.shared.uWind.value = value;
  }

  update(elapsed) {
    this.shared.uTime.value = elapsed;
    const now = Date.now();
    for (const layer of this.layers) {
      let needsMatrixUpdate = false;
      for (let index = 0; index < layer.count; index += 1) {
        const item = layer.instances[index];
        if (!item?.birthTime) continue;
        const age = now - item.birthTime;
        if (age < 0 || age > 1100) continue;
        const grow = 0.08 + easeOutCubic(age / 1100) * 0.92;
        layer.matrix.makeScale(item.size * grow * layer.aspect, item.size * grow, 1);
        layer.matrix.setPosition(item.x, item.y, item.z);
        layer.mesh.setMatrixAt(index, layer.matrix);
        needsMatrixUpdate = true;
      }
      if (needsMatrixUpdate) layer.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

function buildSpriteLibrary() {
  return {
    flowers: {
      path: loadTextures(FIG_SPRITE_POOLS.flower),
      leaf: loadTextures(FIG_SPRITE_POOLS.flower),
      balloon: loadTextures(FIG_SPRITE_POOLS.flower),
      stone: loadTextures(FIG_SPRITE_POOLS.flower.slice(4)),
      snail: loadTextures(FIG_SPRITE_POOLS.flower.slice(8)),
      lamp: loadTextures(FIG_SPRITE_POOLS.flower.slice(0, 12)),
      fog: loadTextures(FIG_SPRITE_POOLS.flower.slice(10)),
    },
    grass: loadTextures(FIG_SPRITE_POOLS.grass),
    trees: Array.from({ length: 5 }, () => makeTreeTexture()),
    clouds: loadTextures(FIG_SPRITE_POOLS.cloud),
    butterflies: Array.from({ length: 4 }, () => makeButterflyTexture()),
  };
}

function loadTextures(paths) {
  const loader = new THREE.TextureLoader();
  return paths.map((path) => {
    const texture = loader.load(path);
    texture.userData.defaultAspect = path.includes('/cloud-') ? 2.45 : path.includes('/flower-') ? 0.92 : 1.85;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  });
}

function makeCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function makeFlowerTexture(colors) {
  return makeCanvasTexture(160, 210, (ctx, width, height) => {
    const random = Math.random;
    const cx = width / 2;
    const headY = 68 + random() * 22;
    const petalColor = colors[Math.floor(random() * colors.length)];
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(83, 138, 83, 0.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, height - 5);
    ctx.quadraticCurveTo(cx - 12 + random() * 24, 150, cx, headY + 18);
    ctx.stroke();
    for (let i = 0; i < 2; i += 1) {
      ctx.fillStyle = 'rgba(108, 163, 91, 0.7)';
      ctx.beginPath();
      ctx.ellipse(cx + (i ? 17 : -17), 132 + i * 13, 20, 8, i ? -0.5 : 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.filter = 'blur(3px)';
    ctx.fillStyle = petalColor.replace(')', ', 0.35)').replace('rgb', 'rgba');
    ctx.beginPath();
    ctx.arc(cx, headY, 44, 0, TAU);
    ctx.fill();
    ctx.filter = 'blur(0.8px)';
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * 22, headY + Math.sin(angle) * 18);
      ctx.rotate(angle);
      ctx.fillStyle = petalColor;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 13, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f6cf67';
    ctx.beginPath();
    ctx.arc(cx, headY, 10, 0, TAU);
    ctx.fill();
  });
}

function makeGrassTexture() {
  return makeCanvasTexture(120, 130, (ctx, width, height) => {
    const blades = 7 + Math.floor(Math.random() * 6);
    for (let i = 0; i < blades; i += 1) {
      const baseX = 22 + Math.random() * (width - 44);
      const topX = baseX - 30 + Math.random() * 60;
      const topY = 18 + Math.random() * 55;
      ctx.fillStyle = `hsla(${92 + Math.random() * 42}, 46%, ${38 + Math.random() * 20}%, 0.86)`;
      ctx.beginPath();
      ctx.moveTo(baseX - 4, height);
      ctx.quadraticCurveTo((baseX + topX) / 2, (height + topY) / 2, topX, topY);
      ctx.quadraticCurveTo((baseX + topX) / 2 + 7, (height + topY) / 2, baseX + 5, height);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function makeTreeTexture() {
  return makeCanvasTexture(260, 330, (ctx, width, height) => {
    const cx = width / 2;
    ctx.fillStyle = 'rgba(122, 87, 55, 0.82)';
    ctx.beginPath();
    ctx.moveTo(cx - 14, height);
    ctx.quadraticCurveTo(cx - 10, 220, cx - 5, 150);
    ctx.lineTo(cx + 8, 150);
    ctx.quadraticCurveTo(cx + 10, 220, cx + 18, height);
    ctx.closePath();
    ctx.fill();
    const hue = 96 + Math.random() * 42;
    for (let i = 0; i < 18; i += 1) {
      const x = cx - 70 + Math.random() * 140;
      const y = 58 + Math.random() * 118;
      const radius = 34 + Math.random() * 32;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${hue}, 43%, 58%, 0.58)`);
      gradient.addColorStop(1, `hsla(${hue - 12}, 36%, 36%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
  });
}

function makeCloudTexture(pink = false) {
  return makeCanvasTexture(340, 180, (ctx, width, height) => {
    for (let i = 0; i < 11; i += 1) {
      const x = 52 + Math.random() * (width - 104);
      const y = 68 + Math.random() * 54;
      const radius = 34 + Math.random() * 38;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, pink ? 'rgba(246, 185, 206, 0.66)' : 'rgba(255, 255, 255, 0.72)');
      gradient.addColorStop(1, pink ? 'rgba(246, 185, 206, 0)' : 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
  });
}

function makeButterflyTexture() {
  return makeCanvasTexture(96, 78, (ctx, width, height) => {
    const cx = width / 2;
    const cy = height / 2;
    const color = ['#f0a2ba', '#f4c76f', '#9ac4e1', '#c8a4e6'][Math.floor(Math.random() * 4)];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx - 15, cy - 3, 18, 24, -0.55, 0, TAU);
    ctx.ellipse(cx + 15, cy - 3, 18, 24, 0.55, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(90, 76, 100, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 22);
    ctx.stroke();
  });
}

function createGround() {
  const texture = makeGroundTexture('#a8c982', '#d6e3a7');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(48, 48);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.96,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  return mesh;
}

function makeGroundTexture(base, alt) {
  return makeCanvasTexture(128, 128, (ctx) => {
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        ctx.fillStyle = (x + y) % 2 ? base : alt;
        ctx.fillRect(x * 64, y * 64, 64, 64);
      }
    }
    ctx.strokeStyle = 'rgba(102, 144, 84, 0.35)';
    ctx.lineWidth = 2;
    for (let index = 0; index <= 2; index += 1) {
      ctx.beginPath();
      ctx.moveTo(index * 64, 0);
      ctx.lineTo(index * 64, 128);
      ctx.moveTo(0, index * 64);
      ctx.lineTo(128, index * 64);
      ctx.stroke();
    }
  });
}

function setGroundTone(ground, sceneState) {
  if (!ground?.material) return;
  const wet = clamp(sceneState.soilWetness || 0, 0, 1);
  const green = clamp(sceneState.groundGreen || sceneState.grassCoverage || 0, 0, 1);
  ground.material.opacity = 0.72 + green * 0.18;
  ground.material.color.setRGB(0.88 - wet * 0.12, 0.96 - wet * 0.18, 0.82 - wet * 0.08);
  ground.material.needsUpdate = true;
}

function randomDisc(random, rx, rz) {
  const radius = Math.sqrt(random());
  const angle = random() * TAU;
  return [Math.cos(angle) * radius * rx, Math.sin(angle) * radius * rz];
}

function moodToFlowerFamily(mood) {
  return {
    path: 'path',
    leaf: 'leaf',
    balloon: 'balloon',
    stone: 'stone',
    snail: 'snail',
    lamp: 'lamp',
    fog: 'fog',
  }[mood?.tone] || 'path';
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.map) material.map.dispose();
        material.dispose();
      }
    }
  });
}

export default ThreeBillboardGarden;
