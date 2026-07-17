export type Theme = "dark" | "light";

const THEME_KEY = "kebo-admin-theme";

export function getTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}
