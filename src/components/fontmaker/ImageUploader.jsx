import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileToImage, traceImage } from "@/lib/fontmaker/imageTracer";

export default function ImageUploader({ onTraced, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handle(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const img = await fileToImage(file);
      const contours = traceImage(img);
      if (contours.length === 0) {
        alert("No shapes detected. Use a high-contrast image with dark lines on a light background.");
      } else {
        onTraced(contours);
      }
    } catch {
      alert("Could not process that image.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handle}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <ImagePlus className="w-4 h-4 mr-1" />
        )}
        {busy ? "Tracing…" : "Upload Image"}
      </Button>
    </>
  );
}