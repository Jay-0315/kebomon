export interface ThemePreset {
  id: string;
  name: string;
  swatch: string;
  light: { primary: string; accent: string };
  dark: { primary: string; accent: string };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "emerald",
    name: "에메랄드",
    swatch: "#73c883",
    light: { primary: "#73c883", accent: "#5ab56e" },
    dark: { primary: "#73c883", accent: "#5ab56e" },
  },
  {
    id: "rose",
    name: "로즈",
    swatch: "#b7607e",
    light: { primary: "#c2185b", accent: "#a0154d" },
    dark: { primary: "#b7607e", accent: "#96526c" },
  },
  {
    id: "ocean",
    name: "오션",
    swatch: "#1a73e8",
    light: { primary: "#1a73e8", accent: "#1558b0" },
    dark: { primary: "#4a9eff", accent: "#3580e8" },
  },
  {
    id: "forest",
    name: "포레스트",
    swatch: "#2e7d32",
    light: { primary: "#2e7d32", accent: "#1b5e20" },
    dark: { primary: "#66bb6a", accent: "#4caf50" },
  },
  {
    id: "berry",
    name: "베리",
    swatch: "#7b1fa2",
    light: { primary: "#7b1fa2", accent: "#6a1b9a" },
    dark: { primary: "#ce93d8", accent: "#ba68c8" },
  },
  {
    id: "flame",
    name: "플레임",
    swatch: "#d32f2f",
    light: { primary: "#d32f2f", accent: "#b71c1c" },
    dark: { primary: "#ef9a9a", accent: "#e57373" },
  },
  {
    id: "slate",
    name: "슬레이트",
    swatch: "#455a64",
    light: { primary: "#455a64", accent: "#37474f" },
    dark: { primary: "#90a4ae", accent: "#78909c" },
  },
  {
    id: "coral",
    name: "코랄",
    swatch: "#f4511e",
    light: { primary: "#f4511e", accent: "#d84315" },
    dark: { primary: "#ffab91", accent: "#ff8a65" },
  },
  {
    id: "sage",
    name: "핑크",
    swatch: "#e91e8c",
    light: { primary: "#e91e8c", accent: "#c2167a" },
    dark: { primary: "#f48fb1", accent: "#f06292" },
  },
  {
    id: "mango",
    name: "망고",
    swatch: "#f57c00",
    light: { primary: "#f57c00", accent: "#e65100" },
    dark: { primary: "#ffb74d", accent: "#ffa726" },
  },
];

export function applyThemePreset(themeId: string, isDark: boolean) {
  const preset = THEME_PRESETS.find((t) => t.id === themeId) ?? THEME_PRESETS[0];
  const colors = isDark ? preset.dark : preset.light;
  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--ring", colors.primary);
  root.style.setProperty("--chart-1", colors.primary);
  root.style.setProperty("--chart-2", colors.primary);
  root.style.setProperty("--chart-3", colors.accent);
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-ring", colors.primary);
}
