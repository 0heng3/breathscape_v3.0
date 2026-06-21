import React, { useEffect, useMemo, useRef } from 'react';

const DEFAULT_CONTROLS = {
  windStrength: 0.32,
  windDirection: 0.25,
  rainAmount: 0.02,
  sunWarmth: 0.52,
  sparkleDensity: 0.42,
  flowerBloom: 0.5,
  calmLevel: 0.68,
};

function StoryDynamicOverlay({ intensity = 0.72, mood = 'calm', controls = DEFAULT_CONTROLS }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef(null);
  const frameRef = useRef(0);
  const controlsRef = useRef(normalizeControls(controls));

  const palette = useMemo(() => getMoodPalette(mood), [mood]);

  useEffect(() => {
    controlsRef.current = normalizeControls(controls);
  }, [controls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas(canvas);
      particlesRef.current = createParticles(canvas, palette);
    });
    resizeObserver.observe(canvas);
    resizeCanvas(canvas);
    particlesRef.current = createParticles(canvas, palette);

    let lastTime = performance.now();
    const render = (time) => {
      const delta = Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;
      drawOverlay(context, canvas, particlesRef.current, {
        time: time / 1000,
        delta,
        intensity,
        palette,
        controls: controlsRef.current,
      });
      frameRef.current = window.requestAnimationFrame(render);
    };
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [intensity, palette]);

  return <canvas ref={canvasRef} className="story-dynamic-overlay" aria-hidden="true" />;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * pixelRatio));
  const height = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function createParticles(canvas, palette) {
  const width = canvas.width || 1;
  const height = canvas.height || 1;
  return {
    clouds: Array.from({ length: 5 }, (_, index) => ({
      x: seeded(index, 0.05, 0.85) * width,
      y: seeded(index + 10, 0.08, 0.36) * height,
      scale: seeded(index + 20, 0.78, 1.35),
      speed: seeded(index + 30, 8, 18),
      alpha: seeded(index + 40, 0.16, 0.34),
    })),
    sparkles: Array.from({ length: 42 }, (_, index) => ({
      x: seeded(index + 50, 0.12, 0.9) * width,
      y: seeded(index + 80, 0.1, 0.82) * height,
      radius: seeded(index + 110, 1.2, 3.4),
      phase: seeded(index + 140, 0, Math.PI * 2),
      color: palette.sparkle,
    })),
    petals: Array.from({ length: 24 }, (_, index) => ({
      x: seeded(index + 170, 0.04, 0.95) * width,
      y: seeded(index + 200, 0.02, 1) * height,
      size: seeded(index + 230, 3.5, 8),
      speed: seeded(index + 260, 14, 38),
      drift: seeded(index + 290, -18, 24),
      phase: seeded(index + 320, 0, Math.PI * 2),
    })),
    rain: Array.from({ length: 72 }, (_, index) => ({
      x: seeded(index + 350, -0.08, 1.08) * width,
      y: seeded(index + 430, 0, 1) * height,
      length: seeded(index + 510, 8, 19),
      speed: seeded(index + 590, 160, 260),
      alpha: seeded(index + 670, 0.08, 0.22),
    })),
    grass: Array.from({ length: 34 }, (_, index) => ({
      x: seeded(index + 750, 0.03, 0.97) * width,
      y: seeded(index + 830, 0.72, 0.96) * height,
      height: seeded(index + 910, 12, 32),
      phase: seeded(index + 990, 0, Math.PI * 2),
      color: index % 3 === 0 ? palette.grassAlt : palette.grass,
    })),
  };
}

function drawOverlay(context, canvas, particles, options) {
  if (!particles) return;
  const { time, delta, intensity, palette, controls } = options;
  const width = canvas.width || 1;
  const height = canvas.height || 1;
  const speedScale = 0.42 + (1 - controls.calmLevel) * 0.72;
  const windScale = 0.35 + controls.windStrength * 1.25;
  context.clearRect(0, 0, width, height);

  drawLight(context, width, height, palette, intensity, controls);
  drawClouds(context, particles.clouds, width, time * speedScale, intensity, controls, windScale);
  if (palette.rain || controls.rainAmount > 0.04) drawRain(context, particles.rain, width, height, delta * speedScale, intensity, palette, controls);
  drawSparkles(context, particles.sparkles, time, intensity, controls);
  drawPetals(context, particles.petals, width, height, delta * speedScale, time, intensity, palette, controls, windScale);
  drawGrass(context, particles.grass, time, intensity, controls, windScale);
}

function drawLight(context, width, height, palette, intensity, controls) {
  const gradient = context.createRadialGradient(width * 0.68, height * 0.23, 0, width * 0.68, height * 0.23, width * 0.54);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalAlpha = 0.14 + intensity * 0.12 + controls.sunWarmth * 0.2;
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 1;
}

function drawClouds(context, clouds, width, time, intensity, controls, windScale) {
  clouds.forEach((cloud) => {
    const direction = controls.windDirection >= 0 ? 1 : -1;
    const travel = time * cloud.speed * intensity * windScale * direction;
    const x = positiveModulo(cloud.x + travel + 110, width + 220) - 110;
    context.save();
    context.globalAlpha = cloud.alpha * (0.75 + controls.calmLevel * 0.35);
    context.translate(x, cloud.y);
    context.scale(cloud.scale, cloud.scale);
    context.fillStyle = '#fff8df';
    context.beginPath();
    context.ellipse(-34, 6, 42, 16, 0, 0, Math.PI * 2);
    context.ellipse(0, -2, 52, 22, 0, 0, Math.PI * 2);
    context.ellipse(45, 7, 45, 17, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawRain(context, rain, width, height, delta, intensity, palette, controls) {
  const rainAmount = Math.max(controls.rainAmount, palette.rain ? 0.12 : 0);
  const activeDrops = Math.floor(rain.length * clamp(rainAmount * 1.35, 0, 1));
  context.strokeStyle = palette.rain || 'rgba(145, 183, 218, 0.74)';
  context.lineWidth = Math.max(1, width / 900);
  rain.slice(0, activeDrops).forEach((drop) => {
    drop.y += drop.speed * delta * (0.5 + intensity + rainAmount);
    drop.x += (18 + controls.windDirection * 44 * controls.windStrength) * delta;
    if (drop.y > height + 24) {
      drop.y = -24;
      drop.x = (drop.x + width * 0.37) % width;
    }
    context.globalAlpha = drop.alpha * intensity * (0.45 + rainAmount);
    context.beginPath();
    context.moveTo(drop.x, drop.y);
    context.lineTo(drop.x - drop.length * 0.32, drop.y + drop.length);
    context.stroke();
  });
  context.globalAlpha = 1;
}

function drawSparkles(context, sparkles, time, intensity, controls) {
  const visibleCount = Math.max(4, Math.floor(sparkles.length * clamp(controls.sparkleDensity, 0.08, 1)));
  sparkles.slice(0, visibleCount).forEach((sparkle) => {
    const alpha = (0.18 + Math.sin(time * 1.7 + sparkle.phase) * 0.14) * intensity;
    if (alpha <= 0.02) return;
    context.globalAlpha = alpha * (0.65 + controls.sunWarmth * 0.45);
    context.fillStyle = sparkle.color;
    context.beginPath();
    context.arc(sparkle.x, sparkle.y, sparkle.radius * (0.86 + controls.sparkleDensity * 0.34), 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawPetals(context, petals, width, height, delta, time, intensity, palette, controls, windScale) {
  const visibleCount = Math.max(6, Math.floor(petals.length * clamp(controls.flowerBloom, 0.15, 1)));
  petals.forEach((petal) => {
    const active = petals.indexOf(petal) < visibleCount;
    if (!active && petal.y < height * 0.72) return;
    petal.y += petal.speed * delta * (0.4 + intensity * 0.7);
    petal.x += Math.sin(time + petal.phase) * 0.35 + (petal.drift + controls.windDirection * 32) * delta * intensity * windScale;
    if (petal.y > height + 20) {
      petal.y = -20;
      petal.x = (petal.x + width * 0.29) % width;
    }
    context.save();
    context.globalAlpha = (0.18 + intensity * 0.18) * (0.65 + controls.flowerBloom * 0.55);
    context.translate(petal.x, petal.y);
    context.rotate(Math.sin(time * 1.2 + petal.phase) * 0.9);
    context.fillStyle = palette.petal;
    context.beginPath();
    context.ellipse(0, 0, petal.size * 0.5, petal.size, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
  context.globalAlpha = 1;
}

function drawGrass(context, grass, time, intensity, controls, windScale) {
  context.lineWidth = 2;
  context.lineCap = 'round';
  grass.forEach((blade) => {
    const directional = controls.windDirection * blade.height * 0.1 * controls.windStrength;
    const sway = (Math.sin(time * 2.4 + blade.phase) * blade.height * 0.22 + directional) * intensity * windScale;
    context.strokeStyle = blade.color;
    context.globalAlpha = 0.22 + controls.flowerBloom * 0.2;
    context.beginPath();
    context.moveTo(blade.x, blade.y);
    context.quadraticCurveTo(blade.x + sway * 0.35, blade.y - blade.height * 0.55, blade.x + sway, blade.y - blade.height);
    context.stroke();
  });
  context.globalAlpha = 1;
}

function normalizeControls(controls = DEFAULT_CONTROLS) {
  return {
    windStrength: clamp(Number(controls.windStrength ?? DEFAULT_CONTROLS.windStrength), 0, 1),
    windDirection: clamp(Number(controls.windDirection ?? DEFAULT_CONTROLS.windDirection), -1, 1),
    rainAmount: clamp(Number(controls.rainAmount ?? DEFAULT_CONTROLS.rainAmount), 0, 1),
    sunWarmth: clamp(Number(controls.sunWarmth ?? DEFAULT_CONTROLS.sunWarmth), 0, 1),
    sparkleDensity: clamp(Number(controls.sparkleDensity ?? DEFAULT_CONTROLS.sparkleDensity), 0, 1),
    flowerBloom: clamp(Number(controls.flowerBloom ?? DEFAULT_CONTROLS.flowerBloom), 0, 1),
    calmLevel: clamp(Number(controls.calmLevel ?? DEFAULT_CONTROLS.calmLevel), 0, 1),
  };
}

function getMoodPalette(mood) {
  const palettes = {
    sad: {
      light: 'rgba(186, 210, 255, 0.34)',
      sparkle: 'rgba(188, 222, 255, 0.78)',
      petal: 'rgba(190, 210, 238, 0.68)',
      grass: 'rgba(90, 139, 104, 0.72)',
      grassAlt: 'rgba(111, 155, 122, 0.68)',
      rain: 'rgba(145, 183, 218, 0.74)',
    },
    happy: {
      light: 'rgba(255, 228, 138, 0.4)',
      sparkle: 'rgba(255, 237, 150, 0.86)',
      petal: 'rgba(255, 168, 139, 0.72)',
      grass: 'rgba(82, 153, 91, 0.72)',
      grassAlt: 'rgba(136, 178, 78, 0.68)',
    },
    calm: {
      light: 'rgba(255, 230, 170, 0.36)',
      sparkle: 'rgba(255, 244, 190, 0.82)',
      petal: 'rgba(238, 162, 153, 0.66)',
      grass: 'rgba(88, 144, 98, 0.7)',
      grassAlt: 'rgba(132, 165, 90, 0.66)',
    },
    angry: {
      light: 'rgba(255, 194, 126, 0.28)',
      sparkle: 'rgba(255, 209, 139, 0.76)',
      petal: 'rgba(232, 116, 97, 0.64)',
      grass: 'rgba(102, 133, 82, 0.72)',
      grassAlt: 'rgba(151, 142, 76, 0.64)',
    },
    scared: {
      light: 'rgba(215, 205, 255, 0.32)',
      sparkle: 'rgba(222, 218, 255, 0.82)',
      petal: 'rgba(190, 172, 224, 0.58)',
      grass: 'rgba(78, 128, 108, 0.66)',
      grassAlt: 'rgba(101, 145, 125, 0.62)',
    },
  };
  return palettes[mood] || palettes.calm;
}

function seeded(seed, min, max) {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default StoryDynamicOverlay;
