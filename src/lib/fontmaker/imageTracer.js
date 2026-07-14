import { CANVAS_SIZE } from "./charset";

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

/**
 * Render an image into the drawing-canvas coordinate space and trace its
 * dark regions into filled vector contours (holes automatically reversed).
 */
export function traceImage(img) {
  const size = CANVAS_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const scale = Math.min(size / img.width, size / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const data = ctx.getImageData(0, 0, size, size).data;
  return traceImageData(data, size, size);
}

function traceImageData(data, w, h) {
  const bin = new Uint8Array(w * h);

  // Adaptive threshold: average luminance; darker-than-average = ink.
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    sum += r * 0.299 + g * 0.587 + b * 0.114;
  }
  let threshold = sum / (w * h);
  threshold = Math.min(Math.max(threshold, 90), 190);

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    bin[i] = lum < threshold ? 1 : 0;
  }

  const visited = new Uint8Array(w * h);
  const contours = [];
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (bin[idx] === 1 && visited[idx] === 0) {
        const c = mooreTrace(bin, visited, w, h, x, y, dx, dy);
        if (c.length >= 8) contours.push(simplify(c, 2.0));
      }
    }
  }

  // Reverse holes via even-odd parity so letters like O / A keep their counters.
  for (let i = 0; i < contours.length; i++) {
    const centroid = centroidOf(contours[i]);
    let depth = 0;
    for (let j = 0; j < contours.length; j++) {
      if (i === j) continue;
      if (pointInPolygon(centroid, contours[j])) depth++;
    }
    if (depth % 2 === 1) contours[i].reverse();
  }

  contours.sort((a, b) => b.length - a.length);
  return contours.slice(0, 8);
}

function mooreTrace(bin, visited, w, h, sx, sy, dx, dy) {
  const contour = [{ x: sx, y: sy }];
  visited[sy * w + sx] = 1;
  let cx = sx;
  let cy = sy;
  let dir = 6; // entered from the west
  let guard = 0;
  const maxGuard = w * h * 4 + 1000;

  while (guard++ < maxGuard) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) % 8;
      const nx = cx + dx[nd];
      const ny = cy + dy[nd];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (bin[ny * w + nx] === 1) {
        cx = nx;
        cy = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found) break;
    contour.push({ x: cx, y: cy });
    visited[cy * w + cx] = 1;
    if (cx === sx && cy === sy) break;
  }
  return contour;
}

function simplify(pts, tol) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const last = out[out.length - 1];
    if (Math.hypot(pts[i].x - last.x, pts[i].y - last.y) >= tol) out.push(pts[i]);
  }
  return out;
}

function centroidOf(pts) {
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

function pointInPolygon({ x, y }, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}