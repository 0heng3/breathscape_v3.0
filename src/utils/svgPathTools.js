export function pathFromPoints(points, closed = false) {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) {
    const point = points[0];
    return `M ${fmt(point.x)} ${fmt(point.y)}`;
  }

  const commands = [`M ${fmt(points[0].x)} ${fmt(points[0].y)}`];
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const point = points[index];
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;
    commands.push(`Q ${fmt(prev.x)} ${fmt(prev.y)} ${fmt(midX)} ${fmt(midY)}`);
  }
  if (closed) commands.push('Z');
  return commands.join(' ');
}

export function squigglePath(cx, cy, width, amplitude, waves = 2.4, shift = 0) {
  const points = [];
  const steps = 16;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = cx - width / 2 + width * t;
    const y = cy + Math.sin((t * waves + shift) * Math.PI * 2) * amplitude + Math.sin(t * Math.PI * 2) * amplitude * 0.18;
    points.push({ x, y });
  }
  return pathFromPoints(points);
}

export function wavePath(cx, cy, width, amplitude, waves = 2, shift = 0) {
  return squigglePath(cx, cy, width, amplitude, waves, shift);
}

export function stemPath(x, y, height, wobble = 0) {
  return pathFromPoints([
    { x, y },
    { x: x + wobble * 0.25, y: y - height * 0.35 },
    { x: x - wobble * 0.2, y: y - height * 0.7 },
    { x: x + wobble * 0.12, y: y - height },
  ]);
}

export function teardropPath(cx, cy, radius, drift = 0) {
  const points = [];
  const steps = 14;
  for (let index = 0; index <= steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps;
    const stretch = index < steps / 2 ? 1 : 0.7;
    const x = cx + Math.cos(angle) * radius * stretch * 0.74 + drift * 0.12;
    const y = cy + Math.sin(angle) * radius * (index < steps / 2 ? 1.06 : 0.68);
    points.push({ x, y });
  }
  return pathFromPoints(points, true);
}

export function circlePath(cx, cy, radius, wobble = 0.05) {
  const points = [];
  const steps = 18;
  for (let index = 0; index <= steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps - Math.PI / 2;
    const mod = 1 + Math.sin(index * 1.7) * wobble;
    points.push({
      x: cx + Math.cos(angle) * radius * mod,
      y: cy + Math.sin(angle) * radius * mod,
    });
  }
  return pathFromPoints(points, true);
}

export function starPath(cx, cy, radius, rotation = -Math.PI / 2) {
  const points = [];
  for (let index = 0; index < 5; index += 1) {
    const outer = rotation + index * ((Math.PI * 2) / 5);
    const inner = outer + Math.PI / 5;
    points.push({ x: cx + Math.cos(outer) * radius, y: cy + Math.sin(outer) * radius });
    points.push({ x: cx + Math.cos(inner) * radius * 0.44, y: cy + Math.sin(inner) * radius * 0.44 });
  }
  return pathFromPoints(points, true);
}

export function flowerPath(cx, cy, radius, petals = 5) {
  const paths = [circlePath(cx, cy, radius * 0.34, 0.12)];
  for (let index = 0; index < petals; index += 1) {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / petals);
    const tip = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
    const left = {
      x: cx + Math.cos(angle - 0.24) * radius * 0.5,
      y: cy + Math.sin(angle - 0.24) * radius * 0.5,
    };
    const right = {
      x: cx + Math.cos(angle + 0.24) * radius * 0.5,
      y: cy + Math.sin(angle + 0.24) * radius * 0.5,
    };
    paths.push(pathFromPoints([left, tip, right], true));
  }
  return paths;
}

export function lanternPath(cx, cy, width, height) {
  return [
    `M ${fmt(cx - width * 0.26)} ${fmt(cy - height * 0.12)} C ${fmt(cx - width * 0.34)} ${fmt(cy + height * 0.18)} ${fmt(cx - width * 0.18)} ${fmt(cy + height * 0.54)} ${fmt(cx)} ${fmt(cy + height * 0.6)} C ${fmt(cx + width * 0.18)} ${fmt(cy + height * 0.54)} ${fmt(cx + width * 0.34)} ${fmt(cy + height * 0.18)} ${fmt(cx + width * 0.26)} ${fmt(cy - height * 0.12)}`,
    `M ${fmt(cx - width * 0.14)} ${fmt(cy - height * 0.18)} L ${fmt(cx + width * 0.14)} ${fmt(cy - height * 0.18)}`,
    `M ${fmt(cx)} ${fmt(cy - height * 0.18)} L ${fmt(cx)} ${fmt(cy - height * 0.48)}`,
  ];
}

export function bridgePath(cx, cy, width, archHeight) {
  return [
    `M ${fmt(cx - width / 2)} ${fmt(cy)} L ${fmt(cx + width / 2)} ${fmt(cy)}`,
    `M ${fmt(cx - width / 2 + 8)} ${fmt(cy)} C ${fmt(cx - width * 0.2)} ${fmt(cy - archHeight)} ${fmt(cx + width * 0.2)} ${fmt(cy - archHeight)} ${fmt(cx + width / 2 - 8)} ${fmt(cy)}`,
    `M ${fmt(cx - width / 2 + 10)} ${fmt(cy)} L ${fmt(cx - width / 2 + 10)} ${fmt(cy + archHeight * 0.55)}`,
    `M ${fmt(cx + width / 2 - 10)} ${fmt(cy)} L ${fmt(cx + width / 2 - 10)} ${fmt(cy + archHeight * 0.55)}`,
  ];
}

export function mushroomPath(cx, cy, capRadius, stemHeight) {
  return [
    `M ${fmt(cx - capRadius)} ${fmt(cy)} C ${fmt(cx - capRadius * 0.7)} ${fmt(cy - capRadius * 0.9)} ${fmt(cx + capRadius * 0.7)} ${fmt(cy - capRadius * 0.9)} ${fmt(cx + capRadius)} ${fmt(cy)}`,
    `M ${fmt(cx - capRadius * 0.55)} ${fmt(cy + 2)} C ${fmt(cx - capRadius * 0.26)} ${fmt(cy + stemHeight * 0.4)} ${fmt(cx + capRadius * 0.26)} ${fmt(cy + stemHeight * 0.4)} ${fmt(cx + capRadius * 0.55)} ${fmt(cy + 2)}`,
    `M ${fmt(cx)} ${fmt(cy)} L ${fmt(cx)} ${fmt(cy + stemHeight)}`,
  ];
}

export function grassBladePath(x, y, height, lean = 0) {
  return `M ${fmt(x)} ${fmt(y)} C ${fmt(x + lean * 0.28)} ${fmt(y - height * 0.42)} ${fmt(x + lean * 0.48)} ${fmt(y - height * 0.72)} ${fmt(x + lean)} ${fmt(y - height)}`;
}

export function soilWavePath(cx, cy, width, depth, waves = 2.8) {
  const points = [];
  const steps = 18;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = cx - width / 2 + width * t;
    const y = cy + Math.sin((t * waves) * Math.PI * 2) * depth * 0.55 + Math.sin(t * Math.PI * 2) * depth * 0.1;
    points.push({ x, y });
  }
  return pathFromPoints(points);
}

export function drawStyleClass(toolId) {
  return `qd-${toolId}`;
}

export function serializeVariantSvg(variant, stroke = '#4f5e74') {
  const paths = variant.paths || [];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${variant.viewBox || '0 0 256 256'}" fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round">
${paths.map((d) => `<path d="${d}" stroke-width="${variant.strokeWidth || 5}" />`).join('\n')}
</svg>
`;
}

export function fmt(value) {
  return Number.parseFloat(Number(value || 0).toFixed(1));
}
