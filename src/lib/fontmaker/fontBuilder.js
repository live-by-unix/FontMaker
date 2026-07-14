import opentype from "opentype.js";
import pako from "pako";
import {
  CANVAS_SIZE,
  BASELINE_Y,
  CAP_HEIGHT_Y,
} from "./charset";

const PEN_WIDTH = 16; // visual pen thickness used to turn hand strokes into filled glyphs
const UNITS_PER_EM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;
const CAP_PX = BASELINE_Y - CAP_HEIGHT_Y; // pixel height of a capital letter

function px2u(px) {
  return (px * UNITS_PER_EM) / CANVAS_SIZE;
}

function capScale() {
  return ASCENDER / Math.max(CAP_PX, 1);
}

/**
 * Normalise stored glyph data into { strokes, contours }.
 * Backward-compat: a plain array is treated as strokes.
 */
function normalizeGlyphData(data) {
  if (Array.isArray(data)) return { strokes: data, contours: [] };
  if (!data) return { strokes: [], contours: [] };
  return {
    strokes: Array.isArray(data.strokes) ? data.strokes : [],
    contours: Array.isArray(data.contours) ? data.contours : [],
  };
}

/**
 * Turn one hand-drawn stroke into a closed, filled contour in font units.
 */
function strokeToContour(stroke) {
  if (!stroke || stroke.length < 2) return null;

  const s = capScale();
  const left = [];
  const right = [];

  for (let i = 0; i < stroke.length; i++) {
    const p = stroke[i];
    const prev = stroke[i - 1] || p;
    const next = stroke[i + 1] || p;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    left.push({
      x: (p.x + (nx * PEN_WIDTH) / 2) * s,
      y: (BASELINE_Y - (p.y + (ny * PEN_WIDTH) / 2)) * s,
    });
    right.push({
      x: (p.x - (nx * PEN_WIDTH) / 2) * s,
      y: (BASELINE_Y - (p.y - (ny * PEN_WIDTH) / 2)) * s,
    });
  }

  const contour = [...left, ...right.reverse()];
  const cleaned = [];
  for (const pt of contour) {
    const last = cleaned[cleaned.length - 1];
    if (!last || Math.abs(pt.x - last.x) > 0.01 || Math.abs(pt.y - last.y) > 0.01) {
      cleaned.push(pt);
    }
  }
  return cleaned.length >= 3 ? cleaned : null;
}

/** Convert an image-traced contour (canvas px) to font units. */
function contourToFontUnits(contour) {
  const s = capScale();
  return contour.map((pt) => ({ x: pt.x * s, y: (BASELINE_Y - pt.y) * s }));
}

function glyphFromData(char, data) {
  const path = new opentype.Path();
  const { strokes, contours } = normalizeGlyphData(data);

  const allContours = [];
  strokes.forEach((stroke) => {
    const c = strokeToContour(stroke);
    if (c) allContours.push(c);
  });
  contours.forEach((c) => {
    if (c && c.length >= 3) allContours.push(contourToFontUnits(c));
  });

  let minX = Infinity;
  let maxX = -Infinity;
  for (const c of allContours) {
    for (const pt of c) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
    }
  }

  allContours.forEach((contour) => {
    contour.forEach((pt, i) => {
      if (i === 0) path.moveTo(pt.x, pt.y);
      else path.lineTo(pt.x, pt.y);
    });
    path.closePath();
  });

  const advance =
    isFinite(minX) && isFinite(maxX)
      ? Math.max(maxX - minX + 120, 300)
      : 520;

  return new opentype.Glyph({
    name: char === " " ? "space" : `glyph_${char.charCodeAt(0)}`,
    unicode: char.charCodeAt(0),
    advanceWidth: advance,
    path,
  });
}

/**
 * Build an OpenType/TrueType font object from a glyphs map.
 * @param {Record<string, {strokes?:Array, contours?:Array}>} glyphs
 * @param {string} fontFamily
 * @returns {opentype.Font}
 */
export function buildFont(glyphs = {}, fontFamily = "MyHandwriting") {
  const glyphArray = [
    new opentype.Glyph({ name: ".notdef", advanceWidth: 500, path: new opentype.Path() }),
    new opentype.Glyph({
      name: "space",
      unicode: 32,
      advanceWidth: 300,
      path: new opentype.Path(),
    }),
  ];

  for (const [char, data] of Object.entries(glyphs)) {
    if (!char) continue;
    const { strokes, contours } = normalizeGlyphData(data);
    if (strokes.length === 0 && contours.length === 0) continue;
    glyphArray.push(glyphFromData(char, data));
  }

  return new opentype.Font({
    familyName: fontFamily,
    styleName: "Regular",
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    glyphs: glyphArray,
  });
}

/** ArrayBuffer -> Blob download */
export function downloadBuffer(buffer, filename, mime) {
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Wrap a raw sfnt (TTF) buffer into a WOFF container.
 */
export function sfntToWoff(sfnt) {
  const view = new DataView(sfnt);
  const signature = view.getUint32(0);
  const isTrueType = signature === 0x00010000 || signature === 0x74727565; // 'true'
  if (!isTrueType) {
    throw new Error("WOFF export currently supports TrueType (.ttf) outlines only.");
  }

  const numTables = view.getUint16(4);
  const tables = [];
  let totalSize = 44 + numTables * 20;

  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16;
    const tag = sfnt.slice(offset, offset + 4);
    const tableOffset = view.getUint32(offset + 8);
    const tableLength = view.getUint32(offset + 12);
    const raw = new Uint8Array(sfnt.slice(tableOffset, tableOffset + tableLength));
    const compressed = pako.deflate(raw);
    const useComp = compressed.length < tableLength;
    const data = useComp ? compressed : raw;
    tables.push({ tag, data, origLength: tableLength, useComp });
    totalSize += data.length;
  }

  const woff = new ArrayBuffer(totalSize);
  const w = new DataView(woff);
  const bytes = new Uint8Array(woff);

  w.setUint32(0, 0x774f4646); // 'wOFF'
  w.setUint32(4, sfnt.byteLength);
  w.setUint16(8, numTables);
  w.setUint16(10, 0);
  w.setUint32(12, 0);
  w.setUint16(16, 1);
  w.setUint16(18, 0);
  w.setUint32(20, 0);
  w.setUint32(24, 0);
  w.setUint32(28, 0);
  w.setUint32(32, 0);
  w.setUint32(36, 0);

  let tableOffset = 44 + numTables * 20;
  for (let i = 0; i < tables.length; i++) {
    const entry = 44 + i * 20;
    const t = tables[i];
    bytes.set(new Uint8Array(t.tag), entry);
    w.setUint32(entry + 4, tableOffset);
    w.setUint32(entry + 8, t.data.length);
    w.setUint32(entry + 12, t.origLength);
    w.setUint32(entry + 16, 0);
    bytes.set(t.data, tableOffset);
    tableOffset += t.data.length;
  }

  return woff;
}