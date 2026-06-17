import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const TAU = Math.PI * 2;

function ThreeBillboardGarden({ mood, sceneState = {}, elementHistory = [], quiet = false, calm = false }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const sceneStateRef = useRef(sceneState);
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
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = createEngine(canvas);
    engineRef.current = engine;
    seedGarden(engine, { mood, sceneState, elementHistory, quiet, calm });

    const parent = canvas.closest('.garden-stage') || canvas.parentElement || canvas;
    const handlePointer = (event) => {
      const rect = parent.getBoundingClientRect();
      pointerRef.current = {
        x: clamp(((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2, -1, 1),
        y: clamp(((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2, -1, 1),
      };
    };

    parent.addEventListener('pointermove', handlePointer, { passive: true, capture: true });
    parent.addEventListener('pointerdown', handlePointer, { passive: true, capture: true });

    let raf = 0;
    const loop = () => {
      raf = window.requestAnimationFrame(loop);
      updateEngine(engine, pointerRef.current, sceneStateRef.current);
    };
    loop();

    return () => {
      window.cancelAnimationFrame(raf);
      parent.removeEventListener('pointermove', handlePointer, { capture: true });
      parent.removeEventListener('pointerdown', handlePointer, { capture: true });
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    seedGarden(engine, { mood, sceneState, elementHistory, quiet, calm });
  }, [sceneKey, mood, sceneState, elementHistory, quiet, calm]);

  return <canvas className="three-billboard-garden" ref={canvasRef} aria-hidden="true" />;
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

function updateEngine(engine, pointer, sceneState) {
  const elapsed = engine.clock.getElapsedTime();
  const wind = clamp((sceneState.windEnergy || 0) + Math.abs(sceneState.gestureWind || 0) * 0.35, 0.06, 1);
  const calm = clamp(sceneState.calmLevel || 0, 0, 1);
  const orbit = elapsed * (0.025 + wind * 0.028) * (0.72 + (sceneState.animationSpeed || 1) * 0.28);
  const radius = 29 - calm * 2.6;
  const x = Math.sin(orbit) * radius * 0.18 + pointer.x * 2.1;
  const z = Math.cos(orbit) * radius + 1.8;
  const y = 8.2 + pointer.y * -0.9 + calm * 0.9;

  engine.camera.position.lerp(new THREE.Vector3(x, y, z), 0.045);
  engine.camera.lookAt(pointer.x * 1.2, 2.3 + pointer.y * -0.35, 0);
  engine.world.rotation.y = Math.sin(elapsed * 0.08) * 0.025 + pointer.x * 0.018;
  engine.billboards.setWind(wind);
  engine.billboards.update(elapsed);

  const night = (sceneState.nightSparkle || 0) > 0.22 || (sceneState.brightness || 1) < 0.38;
  engine.renderer.toneMappingExposure = night ? 0.72 : 1.02 + (sceneState.sunlightWarmth || 0) * 0.12;
  engine.hemi.intensity = night ? 0.72 : 1.08;
  engine.sun.intensity = night ? 0.48 : 1.45;
  engine.renderer.render(engine.scene, engine.camera);
}

function seedGarden(engine, { mood, sceneState, elementHistory, quiet, calm }) {
  engine.billboards.clearAll();
  setGroundTone(engine.ground, sceneState);

  const seed = hashString(`${mood?.id || mood?.tone || 'garden'}-${sceneState.totalStrokeCount || 0}-${elementHistory.length}`);
  const random = mulberry32(seed);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const moodFamily = moodToFlowerFamily(mood);
  const grassCount = Math.round(120 + (sceneState.grassCoverage || 0) * 280 + (sceneState.growthLevel || 0) * 120);
  const flowerCount = Math.round(30 + (sceneState.flowerBloom || 0) * 190 + (sceneState.flowerCount || 0) * 7);
  const treeCount = quiet || calm ? 24 : 36;
  const cloudCount = Math.round(5 + (sceneState.windEnergy || 0) * 6 + (sceneState.fogOpacity || 0) * 5);
  const butterflyCount = Math.round(5 + (sceneState.sunlightWarmth || 0) * 8 + (sceneState.flowerBloom || 0) * 7);

  const layers = {
    grass: engine.sprites.grass.map((texture) => engine.billboards.createLayer(texture, { sway: 1, capacity: 700 })),
    trees: engine.sprites.trees.map((texture) => engine.billboards.createLayer(texture, { sway: 0.12, capacity: 90 })),
    clouds: engine.sprites.clouds.map((texture) => engine.billboards.createLayer(texture, { sway: 0, capacity: 30 })),
    butterflies: engine.sprites.butterflies.map((texture) => engine.billboards.createLayer(texture, { sway: 0.28, capacity: 30 })),
    flowers: engine.sprites.flowers[moodFamily].map((texture) => engine.billboards.createLayer(texture, { sway: 1, capacity: 420 })),
  };

  for (let index = 0; index < grassCount; index += 1) {
    const [x, z] = randomDisc(random, 20, 14);
    engine.billboards.add(pick(layers.grass), x, 0.02, z, 1.0 + random() * 1.1, random() * TAU);
  }
  for (let index = 0; index < flowerCount; index += 1) {
    const [x, z] = randomDisc(random, 18, 12.5);
    engine.billboards.add(pick(layers.flowers), x, 0.04, z, 1.8 + random() * 1.8, random() * TAU);
  }
  for (let index = 0; index < treeCount; index += 1) {
    const angle = random() * TAU;
    const rx = 24 + random() * 10;
    const rz = 17 + random() * 8;
    const frontBand = Math.sin(angle) > 0.42;
    const treeZ = frontBand ? Math.sin(angle) * (rz + 4) + 4 : Math.sin(angle) * rz - 8;
    engine.billboards.add(pick(layers.trees), Math.cos(angle) * rx, 0, treeZ, 6.8 + random() * 6.2, random() * TAU);
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
  for (const item of strokeItems) {
    const layer = pickLayerForTool(layers, item.tool);
    if (!layer) continue;
    const x = ((item.x || 360) / Math.max(item.canvasWidth || 720, 1) - 0.5) * 24;
    const z = ((item.y || 360) / Math.max(item.canvasHeight || 540, 1) - 0.55) * 16;
    const size = getToolSize(item.tool, item.speed || item.density || 0.5);
    const y = isSkyTool(item.tool) ? 6 + random() * 4 : 0.08;
    engine.billboards.add(layer, x, y, z, size, random() * TAU);
  }
}

function pickLayerForTool(layers, tool) {
  const randomLayer = (items) => items[Math.floor(Math.random() * items.length)];
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) return randomLayer(layers.flowers);
  if (['grass', 'seed', 'reed', 'moss', 'smallTree', 'sprout', 'memorySeed'].includes(tool)) return randomLayer(layers.grass);
  if (['cloud', 'wind', 'windLine', 'softWind', 'ribbon', 'floatingLeaf'].includes(tool)) return randomLayer(layers.clouds);
  if (['sun', 'sunlight', 'lantern', 'firefly', 'star', 'moonbeam', 'rainbow'].includes(tool)) return randomLayer(layers.butterflies);
  return randomLayer(layers.grass);
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
    const aspect = image && image.height ? image.width / image.height : 1;
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
          'float wave = sin(uTime * 1.75 + aPhase) * 0.26 + sin(uTime * 0.72 + aPhase * 1.7) * 0.12;',
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
    };
    this.layers.push(layer);
    return layer;
  }

  add(layer, x, y, z, size, phase) {
    if (!layer || layer.count >= layer.capacity) return false;
    const index = layer.count;
    layer.matrix.makeScale(size * layer.aspect, size, 1);
    layer.matrix.setPosition(x, y, z);
    layer.mesh.setMatrixAt(index, layer.matrix);
    layer.phases.array[index] = phase;
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
      if (layer.mesh.material.map) layer.mesh.material.map.dispose();
      layer.mesh.material.dispose();
    }
    this.layers = [];
  }

  setWind(value) {
    this.shared.uWind.value = value;
  }

  update(elapsed) {
    this.shared.uTime.value = elapsed;
  }
}

function buildSpriteLibrary() {
  return {
    flowers: {
      path: Array.from({ length: 5 }, () => makeFlowerTexture(['#f3a1bd', '#ffd66f', '#e77f8f'])),
      leaf: Array.from({ length: 5 }, () => makeFlowerTexture(['#9ccf87', '#f7c66d', '#d88f74'])),
      balloon: Array.from({ length: 5 }, () => makeFlowerTexture(['#f4a4c7', '#f6c56e', '#d9a0e8'])),
      stone: Array.from({ length: 5 }, () => makeFlowerTexture(['#aeb2c7', '#d7bd82', '#8fb6d7'])),
      snail: Array.from({ length: 5 }, () => makeFlowerTexture(['#c9a4d6', '#e9c47b', '#9ccf9b'])),
      lamp: Array.from({ length: 5 }, () => makeFlowerTexture(['#ffe38a', '#f4a3a3', '#f8cf77'])),
      fog: Array.from({ length: 5 }, () => makeFlowerTexture(['#a9c8df', '#c8b8df', '#e6b7c6'])),
    },
    grass: Array.from({ length: 6 }, () => makeGrassTexture()),
    trees: Array.from({ length: 5 }, () => makeTreeTexture()),
    clouds: Array.from({ length: 4 }, (_, index) => makeCloudTexture(index > 1)),
    butterflies: Array.from({ length: 4 }, () => makeButterflyTexture()),
  };
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
