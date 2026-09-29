"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ColorTheme = "ocean" | "crimson" | "emerald" | "violet" | "amber";

interface ColorThemeContextType {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

// Module-level: touches only the document, nothing from component state.
function applyThemeToElement(newTheme: ColorTheme) {
  const root = document.documentElement;

  // ocean and amber are light mode themes, others are dark
  if (newTheme === "ocean" || newTheme === "amber") {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>("ocean");

  useEffect(() => {
    let savedTheme = localStorage.getItem("color-theme") as string;
    if (savedTheme === "default") savedTheme = "ocean";

    if (savedTheme && ["ocean", "crimson", "emerald", "violet", "amber"].includes(savedTheme)) {
      setThemeState(savedTheme as ColorTheme);
      applyThemeToElement(savedTheme as ColorTheme);
    } else {
      applyThemeToElement("ocean");
    }
  }, []);

  const setTheme = (newTheme: ColorTheme) => {
    applyThemeToElement(newTheme);
    localStorage.setItem("color-theme", newTheme);
    setThemeState(newTheme);
  };

  return (
    <ColorThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}
