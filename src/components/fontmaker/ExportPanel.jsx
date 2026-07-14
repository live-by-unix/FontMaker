import { useState } from "react";
import { Download, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFont, downloadBuffer, sfntToWoff } from "@/lib/fontmaker/fontBuilder";

const FORMATS = [
  { id: "ttf", label: "TrueType (.ttf)", hint: "Universal font format" },
  { id: "otf", label: "OpenType (.otf)", hint: "OpenType font" },
  { id: "woff", label: "WOFF (.woff)", hint: "Web-optimized" },
];

export default function ExportPanel({ glyphs, fontFamily, onFamilyChange }) {
  const [busy, setBusy] = useState(null);

  const hasGlyphs = Object.values(glyphs || {}).some((s) => s && s.length > 0);

  async function handleExport(format) {
    if (!hasGlyphs) return;
    setBusy(format);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const font = buildFont(glyphs, fontFamily);
      const sfnt = font.toArrayBuffer();
      const safeName = (fontFamily || "MyHandwriting").replace(/\s+/g, "");

      if (format === "ttf") {
        downloadBuffer(sfnt, `${safeName}.ttf`, "font/ttf");
      } else if (format === "otf") {
        downloadBuffer(sfnt, `${safeName}.otf`, "font/otf");
      } else if (format === "woff") {
        const woff = sfntToWoff(sfnt);
        downloadBuffer(woff, `${safeName}.woff`, "font/woff");
      }
    } catch (err) {
      alert(err.message || "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <FileDown className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Export Your Font</h3>
      </div>

      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Font family name
      </label>
      <Input
        value={fontFamily}
        onChange={(e) => onFamilyChange(e.target.value)}
        className="mt-1 mb-4"
        placeholder="MyHandwriting"
      />

      <div className="grid grid-cols-1 gap-2">
        {FORMATS.map((f) => (
          <Button
            key={f.id}
            variant="outline"
            disabled={!hasGlyphs || busy !== null}
            onClick={() => handleExport(f.id)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              {busy === f.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {f.label}
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">{f.hint}</span>
          </Button>
        ))}
      </div>

      {!hasGlyphs && (
        <p className="text-[11px] text-muted-foreground mt-3">
          Draw at least one letter to enable export.
        </p>
      )}
    </div>
  );
}