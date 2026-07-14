import { useEffect, useRef, useState } from "react";
import { Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  CANVAS_SIZE,
  BASELINE_Y,
  CAP_HEIGHT_Y,
  XHEIGHT_Y,
  DESCENDER_Y,
} from "@/lib/fontmaker/charset";

const GUIDES = [
  { y: CAP_HEIGHT_Y, label: "Cap height", color: "rgba(99,102,241,0.35)" },
  { y: XHEIGHT_Y, label: "x-height", color: "rgba(168,85,247,0.30)" },
  { y: BASELINE_Y, label: "Baseline", color: "rgba(34,197,94,0.55)" },
  { y: DESCENDER_Y, label: "Descender", color: "rgba(148,163,184,0.30)" },
];

export default function DrawingCanvas({ char, glyphData, onChange, onUploadImage }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const [localWidth, setLocalWidth] = useState(6);

  const drawWidth = localWidth;
  const strokes = glyphData?.strokes || [];
  const contours = glyphData?.contours || [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, strokes, contours]);

  function redraw() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    GUIDES.forEach((g) => {
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, g.y);
      ctx.lineTo(CANVAS_SIZE, g.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    if (char) {
      ctx.fillStyle = "rgba(15,23,42,0.05)";
      ctx.font = "bold 260px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30);
    }

    // traced image contours (filled)
    ctx.fillStyle = "#0f172a";
    contours.forEach((contour) => {
      if (!contour || contour.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(contour[0].x, contour[0].y);
      for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i].x, contour[i].y);
      ctx.closePath();
      ctx.fill();
    });

    // hand-drawn strokes
    const all = [...strokes];
    if (currentStrokeRef.current) all.push(currentStrokeRef.current);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = drawWidth;
    all.forEach((stroke) => {
      if (!stroke || stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    });
  }

  function getPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  }

  function start(e) {
    e.preventDefault();
    drawingRef.current = true;
    currentStrokeRef.current = [getPoint(e)];
    redraw();
  }

  function move(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    currentStrokeRef.current.push(getPoint(e));
    redraw();
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (stroke && stroke.length >= 2) {
      onChange([...strokes, stroke]);
    } else {
      redraw();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl border border-border bg-white shadow-sm overflow-hidden aspect-square w-full max-w-[560px] mx-auto">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        <div className="pointer-events-none absolute top-3 left-4 flex flex-col gap-1">
          {GUIDES.map((g) => (
            <span
              key={g.label}
              className="text-[10px] font-medium uppercase tracking-wide"
              style={{ color: g.color.replace(/[\d.]+\)$/, "0.9)") }}
            >
              {g.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-1 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-[220px] min-w-[140px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Pen</span>
          <Slider
            value={[localWidth]}
            onValueChange={(v) => setLocalWidth(v[0])}
            min={2}
            max={20}
            step={1}
          />
          <span className="text-xs text-muted-foreground w-6 text-right">{localWidth}</span>
        </div>
        <div className="flex items-center gap-2">
          {onUploadImage && (
            <Button variant="outline" size="sm" onClick={onUploadImage}>
              Upload Image
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(strokes.slice(0, -1))}
            disabled={strokes.length === 0}
          >
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange([])}
            disabled={strokes.length === 0 && contours.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
}