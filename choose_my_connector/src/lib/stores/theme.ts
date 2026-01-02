import { browser } from "$app/environment";
import { writable } from "svelte/store";

export type Theme = "light" | "dark";

const STORAGE_KEY = "cmc-theme";

const getPreferredTheme = (): Theme => {
  if (!browser) return "dark";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

function createThemeStore() {
  const { subscribe, set } = writable<Theme>("dark");
  let current: Theme = "dark";

  subscribe((value) => {
    current = value;
  });

  const apply = (nextTheme: Theme) => {
    if (browser) {
      const root = document.documentElement;
      root.classList.add("disable-theme-transitions");
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem(STORAGE_KEY, nextTheme);
      // Remove the transition blocker on the next frame so hover/focus transitions still work.
      requestAnimationFrame(() => {
        root.classList.remove("disable-theme-transitions");
      });
    }
    set(nextTheme);
  };

  const init = () => {
    if (!browser) return;
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    apply(saved ?? getPreferredTheme());
  };

  const toggle = () => {
    const next = current === "light" ? "dark" : "light";
    apply(next);
  };

  return { subscribe, set: apply, toggle, init };
}

export const theme = createThemeStore();
