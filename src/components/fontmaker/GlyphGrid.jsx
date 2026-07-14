import { CHAR_GROUPS } from "@/lib/fontmaker/charset";
import { cn } from "@/lib/utils";

function hasGlyph(glyphs, c) {
  const g = glyphs[c];
  if (!g) return false;
  if (Array.isArray(g)) return g.length > 0;
  return (g.strokes?.length || 0) > 0 || (g.contours?.length || 0) > 0;
}

export default function GlyphGrid({ glyphs, selected, onSelect }) {
  return (
    <div className="flex flex-col gap-4">
      {CHAR_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {group.label}
          </p>
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
            {group.chars.map((c) => {
              const has = hasGlyph(glyphs, c);
              const isSel = selected === c;
              return (
                <button
                  key={c}
                  onClick={() => onSelect(c)}
                  className={cn(
                    "relative h-9 rounded-lg border text-sm font-medium transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  <span className={cn(isSel && "opacity-90")}>{c === " " ? "␣" : c}</span>
                  {has && !isSel && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}