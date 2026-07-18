import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadZenKakuGothicNew } from "@remotion/google-fonts/ZenKakuGothicNew";

// Palette and texture mirror the app's src/styles/global.css field-notes look.
export const palette = {
  paper: "#f4f7f9",
  surface: "#ffffff",
  ink: "#173447",
  inkSoft: "#4c6574",
  cyan: "#087e9b",
  cyanDark: "#05657d",
  cyanPale: "#dff1f5",
  grid: "#d7e4ea",
  gridStrong: "#b5cbd5",
  amber: "#a85b18",
  amberPale: "#fff0df",
  green: "#287158",
  danger: "#a63f35",
} as const;

const barlow = loadBarlowCondensed("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const zen = loadZenKakuGothicNew("normal", {
  weights: ["400", "700", "900"],
  subsets: ["japanese", "latin"],
});

export const displayFont = `"${barlow.fontFamily}", "${zen.fontFamily}", sans-serif`;
export const bodyFont = `"${zen.fontFamily}", sans-serif`;
export const monoFont = `"SFMono-Regular", Consolas, "Liberation Mono", monospace`;

export const gridBackground = {
  backgroundColor: palette.paper,
  backgroundImage:
    "linear-gradient(rgb(23 52 71 / 5%) 2px, transparent 2px)," +
    "linear-gradient(90deg, rgb(23 52 71 / 5%) 2px, transparent 2px)",
  backgroundSize: "56px 56px",
} as const;
