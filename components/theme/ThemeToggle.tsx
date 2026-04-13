"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const STORAGE_KEY = "intuivortex-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function updateTheme(nextTheme: Theme) {
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => updateTheme("dark")}
        aria-pressed={theme === "dark"}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
          theme === "dark" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
        }`}
        aria-label="Use dark theme"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => updateTheme("light")}
        aria-pressed={theme === "light"}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
          theme === "light" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
        }`}
        aria-label="Use light theme"
      >
        <Sun className="h-4 w-4" />
      </button>
    </div>
  );
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
