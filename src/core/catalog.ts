import type { BouquetConfig, FlowerId, FlowerSpec, OccasionId, OccasionSpec, WrapId, WrapSpec } from "./types";

const GOLD_CENTER = ["#875f00", "#af8700", "#d7af00", "#ffaf00", "#ffd700"];
const DARK_CENTER = ["#5f0000", "#5f5f00", "#875f00", "#af5f00", "#af8700"];

export const FLOWERS: Record<FlowerId, FlowerSpec> = {
  rose: { name: "Rose", meaning: "love", glyph: "@", code: "r", kind: "disc", petals: 6, palette: ["#5f0000", "#870000", "#af0000", "#d70000", "#ff0000", "#ff5f5f"], center: DARK_CENTER },
  daisy: { name: "Daisy", meaning: "innocence", glyph: "*", code: "d", kind: "disc", petals: 13, palette: ["#808080", "#a8a8a8", "#c6c6c6", "#e4e4e4", "#eeeeee", "#ffffff"], center: GOLD_CENTER },
  tulip: { name: "Tulip", meaning: "perfect love", glyph: "♠", code: "t", kind: "tulip", petals: 3, palette: ["#87005f", "#af005f", "#d7005f", "#ff5f87", "#ff87af", "#ffafd7"], center: GOLD_CENTER },
  sunflower: { name: "Sunflower", meaning: "adoration", glyph: "o", code: "s", kind: "disc", petals: 12, palette: ["#af8700", "#d7af00", "#ffd700", "#ffff00", "#ffff5f", "#ffffaf"], center: DARK_CENTER },
  lavender: { name: "Lavender", meaning: "devotion", glyph: "¦", code: "l", kind: "spike", petals: 0, palette: ["#5f0087", "#5f00af", "#875faf", "#af87d7", "#d7afff", "#eeddff"], center: GOLD_CENTER },
  lily: { name: "Lily", meaning: "renewal", glyph: "%", code: "i", kind: "lily", petals: 6, palette: ["#875f87", "#af87af", "#d7afd7", "#ffd7ff", "#ffeeff", "#ffffff"], center: ["#875f00", "#af5f00", "#d75f00", "#ff8700", "#ffaf5f"] },
  babysbreath: { name: "Baby's breath", meaning: "forever", glyph: "·", code: "b", kind: "cloud", petals: 0, palette: ["#bcbcbc", "#d0d0d0", "#e4e4e4", "#eeeeee", "#ffffff", "#ffffff"], center: GOLD_CENTER },
};

export const WRAPS: Record<WrapId, WrapSpec> = {
  pink: { label: "pink ribbon", swatch: "#ff87af", paper: ["#875f5f", "#af8787", "#d7afaf", "#ffd7d7", "#ffeeee"], ribbon: ["#af005f", "#d7005f", "#ff5f87", "#ff87af", "#ffafd7"] },
  red: { label: "red ribbon", swatch: "#ff5f5f", paper: ["#5f3737", "#875f5f", "#af8787", "#d7afaf", "#eed7d7"], ribbon: ["#870000", "#af0000", "#d70000", "#ff0000", "#ff5f5f"] },
  lilac: { label: "lilac ribbon", swatch: "#d7afff", paper: ["#5f5f87", "#8787af", "#afafd7", "#d7d7ff", "#eeeeff"], ribbon: ["#5f00af", "#875faf", "#af87d7", "#d7afff", "#eeddff"] },
  gold: { label: "kraft & gold", swatch: "#ffd700", paper: ["#5f3700", "#875f00", "#af875f", "#d7af87", "#ffd7af"], ribbon: ["#875f00", "#af8700", "#d7af00", "#ffd700", "#ffff87"] },
  sage: { label: "sage ribbon", swatch: "#87d787", paper: ["#3a4a3a", "#5f875f", "#87af87", "#afd7af", "#d7ffd7"], ribbon: ["#005f00", "#008700", "#00af00", "#5faf5f", "#87d787"] },
  white: { label: "white paper", swatch: "#f4eff8", paper: ["#808080", "#a8a8a8", "#c6c6c6", "#e4e4e4", "#ffffff"], ribbon: ["#af005f", "#d7005f", "#ff5f87", "#ff87af", "#ffafd7"] },
};

export const OCCASIONS: Record<OccasionId, OccasionSpec> = {
  love: { label: "Love", icon: "♥", defaultMessage: "Every day with you blooms." },
  birthday: { label: "Birthday", icon: "✦", defaultMessage: "Happy birthday! Here's to another year in bloom." },
  sorry: { label: "Sorry", icon: "☁", defaultMessage: "I'm sorry. These are for you." },
  thanks: { label: "Thank you", icon: "✿", defaultMessage: "Thank you, truly." },
  justbecause: { label: "Just because", icon: "~", defaultMessage: "No reason. Just thinking of you." },
};

export const LIMITS = { name: 24, message: 120, maxTotal: 8 } as const;

export const DEFAULT_CONFIG: BouquetConfig = {
  flowers: [
    { id: "rose", count: 2 },
    { id: "daisy", count: 1 },
    { id: "sunflower", count: 1 },
  ],
  wrap: "pink",
  occasion: "love",
  to: "",
  from: "",
  message: OCCASIONS.love.defaultMessage,
};
