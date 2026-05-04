import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "hisaab-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read saved preference, default to "system" (follows OS setting).
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? "system";
  });

  // Apply the theme to <html> so Tailwind's dark: variants activate.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      // Match the OS preference and listen for changes.
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystem = () => {
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      };
      applySystem();
      mediaQuery.addEventListener("change", applySystem);
      return () => mediaQuery.removeEventListener("change", applySystem);
    }

    root.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}