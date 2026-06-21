import React, { useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_STORY_MOTION_CONTROLS,
  normalizeStoryMotionControls,
  smoothStoryMotionControls,
} from '../story-scene/storyMotionControls';

const DEFAULT_SCENE_PROFILE = {
  outdoor: false,
  clouds: false,
  rain: false,
  grass: false,
  flowers: false,
  trees: false,
  leaves: false,
  petals: false,
  ripples: false,
  sparkles: true,
};

function StoryDynamicOverlay({
  intensity = 0.72,
  mood = 'calm',
  controls = DEFAULT_STORY_MOTION_CONTROLS,
  action = null,
  sceneProfile = DEFAULT_SCENE_PROFILE,
  interaction = null,
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef(null);
  const frameRef = useRef(0);
  const controlsRef = useRef(normalizeStoryMotionControls(controls));
  const targetControlsRef = useRef(normalizeStoryMotionControls(controls));
  const actionRef = useRef(action);
  const sceneProfileRef = useRef(sceneProfile);
  const interactionRef = useRef(interaction);

  const palette = useMemo(() => getMoodPalette(mood), [mood]);

  useEffect(() => {
    targetControlsRef.current = normalizeStoryMotionControls(controls);
  }, [controls]);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    sceneProfileRef.current = { ...DEFAULT_SCENE_PROFILE, ...sceneProfile };
  }, [sceneProfile]);

  useEffect(() => {
    interactionRef.current = interaction;
  }, [interaction]);

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
      const smoothing = 1 - Math.exp(-delta * 4.8);
      controlsRef.current = smoothStoryMotionControls(controlsRef.current, targetControlsRef.current, smoothing);
      drawOverlay(context, canvas, particlesRef.current, {
        time: time / 1000,
        delta,
        intensity,
        palette,
        controls: controlsRef.current,
        action: actionRef.current,
        sceneProfile: sceneProfileRef.current,
        interaction: interactionRef.current,
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
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
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
    clouds: Array.from({ length: 8 }, (_, index) => ({
      x: seeded(index, 0.05, 0.85) * width,
      y: seeded(index + 10, 0.08, 0.36) * height,
      scale: seeded(index + 20, 0.78, 1.35),
      speed: seeded(index + 30, 8, 18),
      alpha: seeded(index + 40, 0.16, 0.34),
    })),
    windLines: Array.from({ length: 18 }, (_, index) => ({
      x: seeded(index + 42, -0.25, 1) * width,
      y: seeded(index + 62, 0.12, 0.78) * height,
      length: seeded(index + 82, 24, 72),
      speed: seeded(index + 102, 90, 180),
      phase: seeded(index + 122, 0, Math.PI * 2),
      alpha: seeded(index + 142, 0.12, 0.28),
    })),
    sparkles: Array.from({ length: 54 }, (_, index) => ({
      x: seeded(index + 50, 0.12, 0.9) * width,
      y: seeded(index + 80, 0.1, 0.82) * height,
      radius: seeded(index + 110, 1.2, 3.4),
      phase: seeded(index + 140, 0, Math.PI * 2),
      color: palette.sparkle,
    })),
    petals: Array.from({ length: 42 }, (_, index) => ({
      x: seeded(index + 170, 0.04, 0.95) * width,
      y: seeded(index + 200, 0.02, 1) * height,
      size: seeded(index + 230, 3.5, 8),
      speed: seeded(index + 260, 14, 38),
      drift: seeded(index + 290, -18, 24),
      phase: seeded(index + 320, 0, Math.PI * 2),
    })),
    rain: Array.from({ length: 180 }, (_, index) => ({
      x: seeded(index + 350, -0.08, 1.08) * width,
      y: seeded(index + 430, 0, 1) * height,
      length: seeded(index + 510, 8, 19),
      speed: seeded(index + 590, 160, 260),
      alpha: seeded(index + 670, 0.22, 0.62),
    })),
    grass: Array.from({ length: 112 }, (_, index) => ({
      x: seeded(index + 750, -0.02, 1.02) * width,
      y: seeded(index + 830, 0.78, 1.01) * height,
      height: seeded(index + 910, 18, 58),
      width: seeded(index + 940, 1.4, 3.6),
      phase: seeded(index + 990, 0, Math.PI * 2),
      color: index % 3 === 0 ? palette.grassAlt : palette.grass,
    })),
    flowers: Array.from({ length: 32 }, (_, index) => ({
      x: seeded(index + 1100, 0.02, 0.98) * width,
      y: seeded(index + 1140, 0.79, 0.99) * height,
      height: seeded(index + 1180, 30, 82),
      size: seeded(index + 1220, 7, 16),
      phase: seeded(index + 1260, 0, Math.PI * 2),
      colorIndex: index % palette.flowers.length,
    })),
    trees: [
      { x: width * 0.08, y: height * 0.85, height: height * 0.34, scale: 1.08, phase: 0.4 },
      { x: width * 0.91, y: height * 0.87, height: height * 0.3, scale: 0.94, phase: 2.1 },
      { x: width * 0.18, y: height * 0.82, height: height * 0.22, scale: 0.72, phase: 4.2 },
    ],
    leaves: Array.from({ length: 46 }, (_, index) => ({
      x: seeded(index + 1320, -0.05, 1.05) * width,
      y: seeded(index + 1380, 0.32, 0.92) * height,
      size: seeded(index + 1440, 4, 10),
      speed: seeded(index + 1500, 20, 62),
      fall: seeded(index + 1560, 8, 24),
      phase: seeded(index + 1620, 0, Math.PI * 2),
      color: index % 2 ? palette.leaf : palette.leafAlt,
    })),
    ripples: Array.from({ length: 14 }, (_, index) => ({
      x: seeded(index + 1680, 0.05, 0.95) * width,
      y: seeded(index + 1710, 0.8, 0.98) * height,
      phase: seeded(index + 1740, 0, 1),
      scale: seeded(index + 1770, 0.7, 1.35),
    })),
    gestureParticles: Array.from({ length: 64 }, (_, index) => ({
      angle: seeded(index + 1820, 0, Math.PI * 2),
      radius: seeded(index + 1880, 18, 120),
      size: seeded(index + 1940, 2.5, 8),
      phase: seeded(index + 2000, 0, Math.PI * 2),
      speed: seeded(index + 2060, 0.7, 1.8),
    })),
    handTrails: [],
  };
}

function drawOverlay(context, canvas, particles, options) {
  if (!particles) return;
  const { time, delta, intensity, palette, controls, action, sceneProfile, interaction } = options;
  const width = canvas.width || 1;
  const height = canvas.height || 1;
  const actionMotion = getActionMotion(action, time);
  const animatedControls = applyActionToControls(controls, actionMotion);
  const speedScale = 0.42 + (1 - animatedControls.calmLevel) * 0.72;
  const windScale = 0.35 + animatedControls.windStrength * 1.25;
  context.clearRect(0, 0, width, height);

  drawLight(context, width, height, palette, intensity, animatedControls, time);
  if (sceneProfile.clouds) drawClouds(context, particles.clouds, width, time * speedScale, intensity, animatedControls, windScale);
  if (sceneProfile.outdoor) drawWind(context, particles.windLines, width, height, delta, time, intensity, animatedControls);
  if (sceneProfile.rain && (palette.rain || animatedControls.rainAmount > 0.04)) {
    drawRain(context, particles.rain, width, height, delta * speedScale, intensity, palette, animatedControls);
  }
  if (sceneProfile.sparkles) drawSparkles(context, particles.sparkles, time, intensity, animatedControls);
  drawGestureInteraction(
    context,
    particles,
    width,
    height,
    time,
    delta,
    intensity,
    palette,
    actionMotion,
    interaction,
    sceneProfile,
  );
  if (sceneProfile.trees) drawTrees(context, particles.trees, time, intensity, palette, animatedControls, windScale, actionMotion, width);
  if (sceneProfile.grass || sceneProfile.flowers) {
    drawMeadow(
      context,
      sceneProfile.grass ? particles.grass : [],
      sceneProfile.flowers ? particles.flowers : [],
      time,
      intensity,
      palette,
      animatedControls,
      windScale,
      actionMotion,
      width,
    );
  }
  if (sceneProfile.leaves) drawLeaves(context, particles.leaves, width, height, delta, time, intensity, animatedControls, windScale);
  if (sceneProfile.petals) drawPetals(context, particles.petals, width, height, delta * speedScale, time, intensity, palette, animatedControls, windScale);
  if (sceneProfile.ripples && animatedControls.rainAmount > 0.08) {
    drawRipples(context, particles.ripples, time, intensity, palette, animatedControls);
  }
}

function drawLight(context, width, height, palette, intensity, controls, time) {
  const breath = 0.94 + Math.sin(time * 0.7) * 0.06 * controls.cameraBreath;
  const gradient = context.createRadialGradient(width * 0.68, height * 0.23, 0, width * 0.68, height * 0.23, width * 0.54);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalAlpha = (0.14 + intensity * 0.12 + controls.sunWarmth * 0.2) * breath;
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 1;
}

function drawClouds(context, clouds, width, time, intensity, controls, windScale) {
  const activeCount = Math.ceil(clouds.length * clamp(controls.cloudAmount, 0.02, 1));
  const cloudColor = controls.rainAmount > 0.18 || controls.cloudAmount > 0.7
    ? 'rgba(107, 119, 137, 0.92)'
    : 'rgba(255, 248, 223, 0.96)';
  clouds.slice(0, activeCount).forEach((cloud) => {
    const direction = controls.windDirection >= 0 ? 1 : -1;
    const gustSpeed = 1 + controls.windGust * 2.4;
    const travel = time * cloud.speed * intensity * windScale * gustSpeed * direction;
    const x = positiveModulo(cloud.x + travel + 110, width + 220) - 110;
    context.save();
    context.globalAlpha = cloud.alpha * (0.25 + controls.cloudAmount * 1.15);
    context.translate(x, cloud.y);
    context.scale(cloud.scale, cloud.scale);
    context.fillStyle = cloudColor;
    context.beginPath();
    context.ellipse(-34, 6, 42, 16, 0, 0, Math.PI * 2);
    context.ellipse(0, -2, 52, 22, 0, 0, Math.PI * 2);
    context.ellipse(45, 7, 45, 17, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawWind(context, windLines, width, height, delta, time, intensity, controls) {
  const strength = clamp(Math.max(controls.windStrength * 0.72, controls.windGust), 0, 1);
  if (strength < 0.18) return;
  const activeCount = Math.max(2, Math.floor(windLines.length * strength));
  const direction = controls.windDirection >= 0 ? 1 : -1;
  context.lineWidth = Math.max(1, width / 760);
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(255, 250, 224, 0.82)';
  windLines.slice(0, activeCount).forEach((line) => {
    line.x += line.speed * delta * direction * (0.45 + strength * 1.25);
    if (direction > 0 && line.x > width + line.length) line.x = -line.length;
    if (direction < 0 && line.x < -line.length) line.x = width + line.length;
    const curve = Math.sin(time * 2.2 + line.phase) * 5 * strength;
    context.globalAlpha = line.alpha * intensity * strength;
    context.beginPath();
    context.moveTo(line.x, line.y);
    context.quadraticCurveTo(
      line.x + direction * line.length * 0.5,
      clamp(line.y + curve, 0, height),
      line.x + direction * line.length,
      line.y,
    );
    context.stroke();
  });
  context.globalAlpha = 1;
}

function drawRain(context, rain, width, height, delta, intensity, palette, controls) {
  const rainAmount = Math.max(controls.rainAmount, palette.rain ? 0.12 : 0);
  const activeDrops = Math.floor(rain.length * clamp(rainAmount * 1.35, 0, 1));
  context.strokeStyle = palette.rain || 'rgba(145, 183, 218, 0.74)';
  context.lineWidth = Math.max(1.2, width / 760);
  rain.slice(0, activeDrops).forEach((drop) => {
    drop.y += drop.speed * delta * (0.5 + intensity + rainAmount);
    drop.x += (18 + controls.windDirection * 44 * controls.windStrength) * delta;
    if (drop.y > height + 24) {
      drop.y = -24;
      drop.x = (drop.x + width * 0.37) % width;
    }
    context.globalAlpha = drop.alpha * intensity * (0.7 + rainAmount * 0.55);
    context.beginPath();
    context.moveTo(drop.x, drop.y);
    context.lineTo(drop.x - drop.length * 0.32, drop.y + drop.length);
    context.stroke();
  });
  context.globalAlpha = 1;
}

function drawTrees(context, trees, time, intensity, palette, controls, windScale, actionMotion, width) {
  trees.forEach((tree) => {
    const wind = getWindAt(tree.x / width, controls, actionMotion) * windScale;
    const sway = (
      Math.sin(time * 1.15 + tree.phase) * 0.025
      + wind * 0.09
    ) * intensity;
    const trunkWidth = tree.height * 0.085 * tree.scale;
    const crownRadius = tree.height * 0.24 * tree.scale;
    context.save();
    context.translate(tree.x, tree.y);
    context.rotate(sway * 0.28);
    context.globalAlpha = 0.72 + controls.flowerBloom * 0.2;
    context.fillStyle = palette.trunk;
    context.beginPath();
    context.moveTo(-trunkWidth * 0.58, 0);
    context.quadraticCurveTo(-trunkWidth * 0.2, -tree.height * 0.48, sway * tree.height * 0.18, -tree.height * 0.7);
    context.lineTo(trunkWidth * 0.48, -tree.height * 0.68);
    context.quadraticCurveTo(trunkWidth * 0.2, -tree.height * 0.42, trunkWidth * 0.62, 0);
    context.closePath();
    context.fill();

    const crownX = sway * tree.height * 0.42;
    const crownY = -tree.height * 0.72;
    context.fillStyle = palette.tree;
    context.beginPath();
    context.arc(crownX - crownRadius * 0.72, crownY + crownRadius * 0.1, crownRadius * 0.72, 0, Math.PI * 2);
    context.arc(crownX, crownY - crownRadius * 0.16, crownRadius, 0, Math.PI * 2);
    context.arc(crownX + crownRadius * 0.76, crownY + crownRadius * 0.08, crownRadius * 0.7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.treeLight;
    context.globalAlpha *= 0.72;
    context.beginPath();
    context.arc(crownX - crownRadius * 0.2, crownY - crownRadius * 0.38, crownRadius * 0.55, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawMeadow(context, grass, flowers, time, intensity, palette, controls, windScale, actionMotion, width) {
  context.lineCap = 'round';
  grass.forEach((blade) => {
    const wind = getWindAt(blade.x / width, controls, actionMotion) * (0.75 + controls.windGust * 1.4);
    const sway = (
      Math.sin(time * (1.25 + controls.windStrength * 1.25) + blade.phase) * blade.height * 0.12
      + wind * blade.height * 0.42
    ) * intensity * windScale;
    context.lineWidth = blade.width;
    context.strokeStyle = blade.color;
    context.globalAlpha = 0.58 + controls.flowerBloom * 0.3;
    context.beginPath();
    context.moveTo(blade.x, blade.y);
    context.quadraticCurveTo(
      blade.x + sway * 0.35,
      blade.y - blade.height * 0.55,
      blade.x + sway,
      blade.y - blade.height,
    );
    context.stroke();
  });

  const flowerCount = Math.max(10, Math.floor(flowers.length * (0.45 + controls.flowerBloom * 0.55)));
  flowers.slice(0, flowerCount).forEach((flower) => {
    const wind = getWindAt(flower.x / width, controls, actionMotion) * (0.75 + controls.windGust * 1.4);
    const sway = (
      Math.sin(time * (1.2 + controls.windStrength * 1.3) + flower.phase) * flower.height * 0.08
      + wind * flower.height * 0.36
    ) * intensity * windScale;
    const headX = flower.x + sway;
    const headY = flower.y - flower.height;
    context.strokeStyle = palette.stem;
    context.lineWidth = Math.max(2, flower.size * 0.18);
    context.globalAlpha = 0.9;
    context.beginPath();
    context.moveTo(flower.x, flower.y);
    context.quadraticCurveTo(flower.x + sway * 0.25, flower.y - flower.height * 0.55, headX, headY);
    context.stroke();
    context.fillStyle = palette.flowers[flower.colorIndex];
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (Math.PI * 2 * petal) / 5 + time * 0.08;
      context.beginPath();
      context.ellipse(
        headX + Math.cos(angle) * flower.size * 0.55,
        headY + Math.sin(angle) * flower.size * 0.55,
        flower.size * 0.42,
        flower.size * 0.62,
        angle,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.fillStyle = palette.flowerCenter;
    context.beginPath();
    context.arc(headX, headY, flower.size * 0.38, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawLeaves(context, leaves, width, height, delta, time, intensity, controls, windScale) {
  const strength = clamp(controls.windStrength * 0.7 + controls.windGust * 0.65, 0, 1);
  const activeCount = Math.max(8, Math.floor(leaves.length * (0.25 + strength * 0.75)));
  const direction = controls.windDirection >= 0 ? 1 : -1;
  leaves.slice(0, activeCount).forEach((leaf) => {
    leaf.x += leaf.speed * delta * direction * (0.25 + strength * 1.4) * windScale;
    leaf.y += leaf.fall * delta * (0.3 + (1 - controls.calmLevel) * 0.7);
    if (leaf.x > width + 20) leaf.x = -20;
    if (leaf.x < -20) leaf.x = width + 20;
    if (leaf.y > height + 14) leaf.y = height * 0.3;
    context.save();
    context.translate(leaf.x, leaf.y);
    context.rotate(time * (0.8 + strength * 2.4) + leaf.phase);
    context.globalAlpha = (0.35 + strength * 0.55) * intensity;
    context.fillStyle = leaf.color;
    context.beginPath();
    context.ellipse(0, 0, leaf.size, leaf.size * 0.46, 0.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
  context.globalAlpha = 1;
}

function drawRipples(context, ripples, time, intensity, palette, controls) {
  context.strokeStyle = palette.ripple;
  context.lineWidth = 1.5;
  ripples.forEach((ripple) => {
    const progress = (time * (0.35 + controls.rainAmount * 0.8) + ripple.phase) % 1;
    const radius = (5 + progress * 24) * ripple.scale;
    context.globalAlpha = (1 - progress) * controls.rainAmount * intensity * 0.58;
    context.beginPath();
    context.ellipse(ripple.x, ripple.y, radius, radius * 0.28, 0, 0, Math.PI * 2);
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
    petal.x += Math.sin(time + petal.phase) * 0.35
      + (petal.drift + controls.windDirection * (32 + controls.windGust * 68)) * delta * intensity * windScale;
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

function drawGestureInteraction(
  context,
  particles,
  width,
  height,
  time,
  delta,
  intensity,
  palette,
  motion,
  interaction,
  sceneProfile,
) {
  updateHandTrails(particles, interaction, time, width, height);
  drawHandTrails(context, particles.handTrails, time, intensity, palette, sceneProfile);

  const primaryHand = interaction?.hands?.[0] || null;
  const secondaryHand = interaction?.hands?.[1] || null;
  if (primaryHand) drawPalmHalo(context, primaryHand.x * width, primaryHand.y * height, time, intensity, palette, interaction.energy);
  if (secondaryHand) drawPalmHalo(context, secondaryHand.x * width, secondaryHand.y * height, time, intensity, palette, interaction.energy);

  if (!motion.id || motion.envelope <= 0.001) return;
  const anchor = getGestureAnchor(motion.id, interaction, width, height);
  if (motion.id === 'blow') {
    drawBlowStream(context, particles.gestureParticles, anchor, width, height, time, intensity, palette, motion);
  } else if (motion.id === 'raise') {
    drawRadialBloom(context, particles.gestureParticles, anchor, time, intensity, palette, motion);
  } else if (motion.id === 'smile') {
    drawGrowingFlowers(context, particles.gestureParticles, anchor, time, intensity, palette, motion);
  } else if (motion.id === 'calm') {
    drawCalmRings(context, anchor, time, intensity, palette, motion);
  } else if (motion.id === 'closer') {
    drawLeafWreath(context, particles.gestureParticles, anchor, time, intensity, palette, motion);
  }
}

function updateHandTrails(particles, interaction, time, width, height) {
  if (interaction?.timestamp && interaction.timestamp !== particles.lastInteractionTimestamp) {
    particles.lastInteractionTimestamp = interaction.timestamp;
    interaction.hands.forEach((hand, index) => {
      const point = {
        x: hand.x * width,
        y: hand.y * height,
        time,
        hand: index,
      };
      const previous = [...particles.handTrails].reverse().find((item) => item.hand === index);
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > Math.max(6, width * 0.012)) {
        particles.handTrails.push(point);
      }
    });
  }
  particles.handTrails = particles.handTrails.filter((point) => time - point.time < 2.2).slice(-34);
}

function drawHandTrails(context, trails, time, intensity, palette, sceneProfile) {
  trails.forEach((point, index) => {
    const age = time - point.time;
    const alpha = clamp(1 - age / 2.2, 0, 1) * intensity;
    const scale = 0.55 + clamp(age / 0.7, 0, 1) * 0.5;
    if (sceneProfile.flowers && index % 3 === 0) {
      drawMiniFlower(context, point.x, point.y, 7 * scale, palette.flowers[index % palette.flowers.length], palette.flowerCenter, alpha);
    } else {
      context.globalAlpha = alpha * 0.72;
      context.fillStyle = palette.sparkle;
      context.beginPath();
      context.arc(point.x, point.y, 2.2 + scale * 2.2, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.globalAlpha = 1;
}

function drawPalmHalo(context, x, y, time, intensity, palette, energy = 0.3) {
  const radius = 16 + energy * 18 + Math.sin(time * 2.2) * 2;
  context.strokeStyle = palette.sparkle;
  context.lineWidth = 1.5;
  context.globalAlpha = (0.22 + energy * 0.34) * intensity;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
}

function getGestureAnchor(actionId, interaction, width, height) {
  if (actionId === 'blow' && interaction?.mouth) {
    return { x: interaction.mouth.x * width, y: interaction.mouth.y * height };
  }
  if (interaction?.hands?.length) {
    const hands = interaction.hands;
    return {
      x: hands.reduce((sum, hand) => sum + hand.x, 0) / hands.length * width,
      y: hands.reduce((sum, hand) => sum + hand.y, 0) / hands.length * height,
    };
  }
  const fallback = {
    blow: { x: width * 0.22, y: height * 0.52 },
    raise: { x: width * 0.5, y: height * 0.52 },
    smile: { x: width * 0.5, y: height * 0.68 },
    calm: { x: width * 0.5, y: height * 0.56 },
    closer: { x: width * 0.5, y: height * 0.54 },
  };
  return fallback[actionId] || fallback.raise;
}

function drawBlowStream(context, particles, anchor, width, height, time, intensity, palette, motion) {
  const travel = clamp(motion.elapsed / 3.2, 0, 1);
  particles.slice(0, 42).forEach((particle, index) => {
    const stagger = index / 42 * 0.9;
    const progress = clamp((travel - stagger) / Math.max(0.1, 1 - stagger), 0, 1);
    if (progress <= 0) return;
    const distance = progress * width * (0.55 + particle.speed * 0.18);
    const x = anchor.x + distance;
    const y = anchor.y
      + Math.sin(progress * 5 + particle.phase) * (12 + particle.radius * 0.18)
      + (index % 3 - 1) * 8;
    if (x > width + 20 || y < -20 || y > height + 20) return;
    const alpha = motion.envelope * (1 - progress * 0.58) * intensity;
    drawLeafShape(context, x, y, particle.size, time * 2.2 + particle.phase, index % 2 ? palette.leaf : palette.petal, alpha);
  });
  context.strokeStyle = palette.sparkle;
  context.lineWidth = 1.6;
  for (let line = 0; line < 5; line += 1) {
    context.globalAlpha = motion.envelope * (0.16 + line * 0.035) * intensity;
    context.beginPath();
    context.moveTo(anchor.x, anchor.y + (line - 2) * 9);
    context.quadraticCurveTo(
      anchor.x + width * 0.22,
      anchor.y + Math.sin(time * 1.8 + line) * 18,
      anchor.x + width * (0.42 + travel * 0.18),
      anchor.y + (line - 2) * 13,
    );
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawRadialBloom(context, particles, anchor, time, intensity, palette, motion) {
  const radiusScale = smoothstep(0, 1, motion.envelope);
  particles.slice(0, 46).forEach((particle, index) => {
    const radius = particle.radius * radiusScale;
    const angle = particle.angle + Math.sin(time * 0.5 + particle.phase) * 0.08;
    const x = anchor.x + Math.cos(angle) * radius;
    const y = anchor.y + Math.sin(angle) * radius;
    context.strokeStyle = palette.sparkle;
    context.lineWidth = 1;
    context.globalAlpha = motion.envelope * 0.26 * intensity;
    context.beginPath();
    context.moveTo(anchor.x, anchor.y);
    context.lineTo(x, y);
    context.stroke();
    drawLeafShape(context, x, y, particle.size, angle, index % 2 ? palette.leaf : palette.sparkle, motion.envelope * 0.78 * intensity);
  });
  context.globalAlpha = 1;
}

function drawGrowingFlowers(context, particles, anchor, time, intensity, palette, motion) {
  particles.slice(0, 28).forEach((particle, index) => {
    const delay = index / 28 * 1.8;
    const growth = smoothstep(delay, delay + 0.8, motion.elapsed) * motion.envelope;
    if (growth <= 0.01) return;
    const angle = particle.angle;
    const radius = 24 + particle.radius * 0.85;
    const x = anchor.x + Math.cos(angle) * radius;
    const y = anchor.y + Math.sin(angle) * radius * 0.58;
    drawMiniFlower(
      context,
      x,
      y,
      particle.size * (0.7 + growth * 0.8),
      palette.flowers[index % palette.flowers.length],
      palette.flowerCenter,
      growth * intensity,
    );
  });
}

function drawCalmRings(context, anchor, time, intensity, palette, motion) {
  for (let ring = 0; ring < 4; ring += 1) {
    const progress = (motion.elapsed * 0.3 + ring * 0.24) % 1;
    context.strokeStyle = palette.sparkle;
    context.lineWidth = 1.5;
    context.globalAlpha = (1 - progress) * motion.envelope * 0.45 * intensity;
    context.beginPath();
    context.ellipse(anchor.x, anchor.y, 18 + progress * 110, 8 + progress * 46, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawLeafWreath(context, particles, anchor, time, intensity, palette, motion) {
  const radius = 26 + smoothstep(0, 1, motion.envelope) * 76;
  particles.slice(0, 36).forEach((particle, index) => {
    const angle = particle.angle + time * 0.2;
    const x = anchor.x + Math.cos(angle) * radius;
    const y = anchor.y + Math.sin(angle) * radius * 0.72;
    drawLeafShape(context, x, y, particle.size * 1.2, angle + Math.PI / 2, index % 2 ? palette.leaf : palette.leafAlt, motion.envelope * 0.84 * intensity);
  });
}

function drawMiniFlower(context, x, y, size, color, centerColor, alpha) {
  context.save();
  context.translate(x, y);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = petal / 5 * Math.PI * 2;
    context.beginPath();
    context.ellipse(Math.cos(angle) * size * 0.55, Math.sin(angle) * size * 0.55, size * 0.42, size * 0.65, angle, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = centerColor;
  context.beginPath();
  context.arc(0, 0, size * 0.38, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawLeafShape(context, x, y, size, rotation, color, alpha) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(0, 0, size, size * 0.45, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function getActionMotion(action, time) {
  if (!action?.id || !Number.isFinite(action.startedAt)) {
    return { id: '', elapsed: 0, envelope: 0, wavePosition: -1, spring: 0 };
  }
  const elapsed = Math.max(0, time - action.startedAt / 1000);
  const durations = {
    blow: 6.2,
    raise: 4.8,
    smile: 5.2,
    rain: 6.8,
    calm: 5.6,
    closer: 4.2,
  };
  const duration = durations[action.id] || 5;
  const attack = smoothstep(0, Math.min(0.75, duration * 0.18), elapsed);
  const release = 1 - smoothstep(duration * 0.55, duration, elapsed);
  const envelope = clamp(attack * release, 0, 1);
  const wavePosition = action.id === 'blow' ? clamp((elapsed - 0.25) / 2.5, -0.15, 1.15) : -1;
  const springTime = Math.max(0, elapsed - 2.25);
  const spring = action.id === 'blow'
    ? Math.sin(springTime * 4.6) * Math.exp(-springTime * 0.72) * release
    : 0;
  return { id: action.id, elapsed, envelope, wavePosition, spring };
}

function applyActionToControls(controls, motion) {
  const next = { ...controls };
  const amount = motion.envelope;
  if (motion.id === 'blow') {
    next.windStrength = clamp(Math.max(next.windStrength, amount * 0.92), 0, 1);
    next.windGust = clamp(Math.max(next.windGust, amount), 0, 1);
    next.windDirection = 1;
    next.cloudAmount = clamp(next.cloudAmount * (1 - amount * 0.9), 0, 1);
    next.rainAmount = clamp(next.rainAmount * (1 - amount), 0, 1);
    next.calmLevel = clamp(next.calmLevel * (1 - amount * 0.62), 0, 1);
  } else if (motion.id === 'raise') {
    next.sunWarmth = clamp(next.sunWarmth + amount * 0.48, 0, 1);
    next.sparkleDensity = clamp(next.sparkleDensity + amount * 0.42, 0, 1);
    next.flowerBloom = clamp(next.flowerBloom + amount * 0.32, 0, 1);
    next.cloudAmount = clamp(next.cloudAmount * (1 - amount * 0.45), 0, 1);
  } else if (motion.id === 'smile') {
    next.sunWarmth = clamp(next.sunWarmth + amount * 0.55, 0, 1);
    next.sparkleDensity = clamp(next.sparkleDensity + amount * 0.62, 0, 1);
    next.flowerBloom = clamp(next.flowerBloom + amount * 0.55, 0, 1);
    next.rainAmount = clamp(next.rainAmount * (1 - amount), 0, 1);
  } else if (motion.id === 'rain') {
    next.cloudAmount = clamp(next.cloudAmount + amount * 0.7, 0, 1);
    next.rainAmount = clamp(next.rainAmount + amount * 0.78, 0, 1);
    next.sunWarmth = clamp(next.sunWarmth * (1 - amount * 0.65), 0, 1);
    next.sparkleDensity = clamp(next.sparkleDensity * (1 - amount * 0.8), 0, 1);
  } else if (motion.id === 'calm') {
    next.windStrength = clamp(next.windStrength * (1 - amount * 0.9), 0, 1);
    next.windGust = clamp(next.windGust * (1 - amount), 0, 1);
    next.rainAmount = clamp(next.rainAmount * (1 - amount), 0, 1);
    next.calmLevel = clamp(next.calmLevel + amount * 0.45, 0, 1);
    next.cameraBreath = clamp(next.cameraBreath + amount * 0.5, 0, 1);
  }
  return next;
}

function getWindAt(normalizedX, controls, motion) {
  const ambient = controls.windDirection * controls.windStrength * 0.72;
  if (motion.id !== 'blow' || motion.envelope <= 0) return ambient;
  const distanceFromWave = (normalizedX - motion.wavePosition) / 0.2;
  const wave = Math.exp(-(distanceFromWave * distanceFromWave)) * motion.envelope * 1.65;
  const trailingSpring = motion.wavePosition > normalizedX
    ? motion.spring * Math.exp(-Math.abs(normalizedX - motion.wavePosition) * 1.8) * 0.55
    : 0;
  return ambient + wave + trailingSpring;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function getMoodPalette(mood) {
  const palettes = {
    sad: {
      light: 'rgba(186, 210, 255, 0.34)',
      sparkle: 'rgba(188, 222, 255, 0.78)',
      petal: 'rgba(190, 210, 238, 0.68)',
      grass: 'rgba(90, 139, 104, 0.72)',
      grassAlt: 'rgba(111, 155, 122, 0.68)',
      stem: '#4f8662',
      tree: '#527d67',
      treeLight: '#78a57b',
      trunk: '#6c5a4a',
      leaf: '#6f9b72',
      leafAlt: '#8cad75',
      flowers: ['#b6c8ed', '#d9b9df', '#9fbce8', '#f0d1dd'],
      flowerCenter: '#f0d78c',
      ripple: 'rgba(161, 196, 226, 0.8)',
      rain: 'rgba(145, 183, 218, 0.74)',
    },
    happy: {
      light: 'rgba(255, 228, 138, 0.4)',
      sparkle: 'rgba(255, 237, 150, 0.86)',
      petal: 'rgba(255, 168, 139, 0.72)',
      grass: 'rgba(82, 153, 91, 0.72)',
      grassAlt: 'rgba(136, 178, 78, 0.68)',
      stem: '#4a985b',
      tree: '#4f9b64',
      treeLight: '#83c16e',
      trunk: '#866246',
      leaf: '#70ae62',
      leafAlt: '#a2c95d',
      flowers: ['#ff866f', '#f8b44e', '#f47fac', '#8fc5ef'],
      flowerCenter: '#ffe36e',
      ripple: 'rgba(120, 184, 218, 0.76)',
    },
    calm: {
      light: 'rgba(255, 230, 170, 0.36)',
      sparkle: 'rgba(255, 244, 190, 0.82)',
      petal: 'rgba(238, 162, 153, 0.66)',
      grass: 'rgba(88, 144, 98, 0.7)',
      grassAlt: 'rgba(132, 165, 90, 0.66)',
      stem: '#4f8d5b',
      tree: '#568d62',
      treeLight: '#82ae68',
      trunk: '#7c6048',
      leaf: '#75a565',
      leafAlt: '#a2bb65',
      flowers: ['#ef847e', '#f4bd56', '#e982b1', '#92bfe5'],
      flowerCenter: '#f7db66',
      ripple: 'rgba(137, 189, 207, 0.76)',
    },
    angry: {
      light: 'rgba(255, 194, 126, 0.28)',
      sparkle: 'rgba(255, 209, 139, 0.76)',
      petal: 'rgba(232, 116, 97, 0.64)',
      grass: 'rgba(102, 133, 82, 0.72)',
      grassAlt: 'rgba(151, 142, 76, 0.64)',
      stem: '#64733f',
      tree: '#667545',
      treeLight: '#94924b',
      trunk: '#7a5541',
      leaf: '#7b8747',
      leafAlt: '#a69445',
      flowers: ['#dc625b', '#e89045', '#c75d78', '#e5af4e'],
      flowerCenter: '#f1c75e',
      ripple: 'rgba(164, 145, 121, 0.72)',
    },
    scared: {
      light: 'rgba(215, 205, 255, 0.32)',
      sparkle: 'rgba(222, 218, 255, 0.82)',
      petal: 'rgba(190, 172, 224, 0.58)',
      grass: 'rgba(78, 128, 108, 0.66)',
      grassAlt: 'rgba(101, 145, 125, 0.62)',
      stem: '#477968',
      tree: '#4d7669',
      treeLight: '#6d9682',
      trunk: '#655a51',
      leaf: '#628b79',
      leafAlt: '#86a68a',
      flowers: ['#a996d1', '#c0a5d6', '#8faed1', '#d2a7c6'],
      flowerCenter: '#e8cf82',
      ripple: 'rgba(160, 177, 219, 0.8)',
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
