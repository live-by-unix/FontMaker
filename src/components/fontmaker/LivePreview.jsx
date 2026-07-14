import { useState } from "react";
import { Type } from "lucide-react";

export default function LivePreview({ fontFamily, status }) {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog 0123");

  const ready = status === "ready";

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Live Preview</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {ready ? "Your font is live" : status === "building" ? "Generating…" : "Draw a glyph to begin"}
        </span>
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something to preview…"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring mb-4"
      />

      <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 min-h-[120px] flex items-center">
        <p
          className="break-words text-slate-900 leading-snug"
          style={{
            fontFamily: ready ? `"${fontFamily}", serif` : "ui-sans-serif, system-ui, sans-serif",
            fontSize: ready ? "2rem" : "1rem",
            opacity: ready ? 1 : 0.5,
          }}
        >
          {text || "Type above to see your handwriting…"}
        </p>
      </div>
    </div>
  );
}