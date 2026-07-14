import { useEffect, useMemo, useState } from "react";
import { PenTool, Sparkles } from "lucide-react";
import DrawingCanvas from "@/components/fontmaker/DrawingCanvas";
import GlyphGrid from "@/components/fontmaker/GlyphGrid";
import LivePreview from "@/components/fontmaker/LivePreview";
import ExportPanel from "@/components/fontmaker/ExportPanel";
import ImageUploader from "@/components/fontmaker/ImageUploader";
import { useLiveFont } from "@/lib/fontmaker/useLiveFont";

const STORAGE_KEY = "fontmaker:project:v1";

function normalizeGlyph(data) {
  if (Array.isArray(data)) return { strokes: data, contours: [] };
  if (!data) return null;
  const strokes = Array.isArray(data.strokes) ? data.strokes : [];
  const contours = Array.isArray(data.contours) ? data.contours : [];
  if (strokes.length === 0 && contours.length === 0) return null;
  return { strokes, contours };
}

function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    const glyphs = {};
    for (const [c, data] of Object.entries(parsed.glyphs || {})) {
      const n = normalizeGlyph(data);
      if (n) glyphs[c] = n;
    }
    return { glyphs, fontFamily: parsed.fontFamily || "MyHandwriting" };
  } catch {
    return null;
  }
}

export default function Studio() {
  const saved = useMemo(loadProject, []);
  const [glyphs, setGlyphs] = useState(saved?.glyphs || {});
  const [selected, setSelected] = useState("A");
  const [fontFamily, setFontFamily] = useState(saved?.fontFamily || "MyHandwriting");

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ glyphs, fontFamily }));
    }, 400);
    return () => clearTimeout(id);
  }, [glyphs, fontFamily]);

  const status = useLiveFont(glyphs, fontFamily);

  const drawnCount = Object.values(glyphs).filter((g) => {
    const s = g?.strokes?.length || 0;
    const c = g?.contours?.length || 0;
    return s + c > 0;
  }).length;

  function updateStrokes(newStrokes) {
    setGlyphs((prev) => {
      const next = { ...prev };
      const existing = prev[selected] || { strokes: [], contours: [] };
      const merged = { strokes: newStrokes || [], contours: existing.contours || [] };
      if (merged.strokes.length === 0 && merged.contours.length === 0) {
        delete next[selected];
      } else {
        next[selected] = merged;
      }
      return next;
    });
  }

  function uploadImage(contours) {
    setGlyphs((prev) => ({
      ...prev,
      [selected]: { strokes: [], contours },
    }));
  }

  const glyphData = glyphs[selected] || { strokes: [], contours: [] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-border bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">FontMaker</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">
                Your handwriting, into a font in 5 minutes
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{drawnCount} glyph{drawnCount === 1 ? "" : "s"} drawn</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold">
                    Drawing “{selected === " " ? "space" : selected}”
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Draw by hand or upload an image — green is the baseline.
                  </p>
                </div>
                <ImageUploader onTraced={uploadImage} />
              </div>
              <DrawingCanvas
                char={selected}
                glyphData={glyphData}
                onChange={updateStrokes}
              />
            </div>

            <LivePreview fontFamily={fontFamily} status={status} />
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Character Map</h3>
              <GlyphGrid
                glyphs={glyphs}
                selected={selected}
                onSelect={setSelected}
              />
            </div>

            <ExportPanel
              glyphs={glyphs}
              fontFamily={fontFamily}
              onFamilyChange={setFontFamily}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}