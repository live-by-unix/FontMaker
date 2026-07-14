export const CANVAS_SIZE = 400;
export const BASELINE_Y = 320;
export const CAP_HEIGHT_Y = 70;
export const XHEIGHT_Y = 190;
export const DESCENDER_Y = 380;

export const CHAR_GROUPS = [
  { label: "Uppercase", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") },
  { label: "Lowercase", chars: "abcdefghijklmnopqrstuvwxyz".split("") },
  { label: "Numbers", chars: "0123456789".split("") },
  { label: "Punctuation", chars: [".", ",", "?", "!", "-", ":", ";", "'", "\"", "(", ")"] },
];

export const ALL_CHARS = CHAR_GROUPS.flatMap((g) => g.chars);