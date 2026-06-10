export function simplifyPointsRDP(points, epsilon = 2) {
  if (!Array.isArray(points) || points.length <= 2) {
    return Array.isArray(points) ? points.slice() : [];
  }

  const first = points[0];
  const last = points[points.length - 1];
  let index = -1;
  let maxDistance = -1;

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > epsilon && index > 0) {
    const left = simplifyPointsRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyPointsRDP(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function perpendicularDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const numerator = Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x);
  const denominator = Math.hypot(dx, dy);
  return numerator / denominator;
}
