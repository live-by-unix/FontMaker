import { useEffect, useState } from "react";
import { buildFont } from "./fontBuilder";

/**
 * Builds an OpenType font from the current glyphs map and registers it as a
 * live @font-face so the preview text renders with the user's real handwriting.
 */
export function useLiveFont(glyphs, fontFamily) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'building' | 'ready'

  useEffect(() => {
    const hasGlyphs = Object.values(glyphs || {}).some((s) => s && s.length > 0);
    if (!hasGlyphs) {
      setStatus("idle");
      return;
    }

    setStatus("building");
    const id = setTimeout(() => {
      try {
        const font = buildFont(glyphs, fontFamily);
        const buffer = font.toArrayBuffer();

        const face = new FontFace(fontFamily, buffer);
        face.load().then(() => {
          document.fonts.add(face);
          setStatus("ready");
        }).catch(() => setStatus("idle"));
      } catch {
        setStatus("idle");
      }
    }, 300);

    return () => clearTimeout(id);
  }, [glyphs, fontFamily]);

  return status;
}