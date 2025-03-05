// src/context/ThemeContext.tsx
import React, { createContext, useState, useContext, ReactNode } from "react";
import {
  colors,
  offWhiteTheme,
  yuckTheme,
  darkTheme,
  getRandomHexColor,
} from "../components/ColorThemes";

type Theme = typeof colors;
type ThemeMode = "default" | "dark" | "offWhite" | "yuck" | "random";

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("yuck"); // Default to yuck per your app
  const [randomTheme, setRandomTheme] = useState<Theme>(colors);

  // Compute the current theme based on mode
  const theme = (() => {
    switch (mode) {
      case "dark":
        return darkTheme;
      case "offWhite":
        return offWhiteTheme;
      case "yuck":
        return yuckTheme;
      case "random":
        return randomTheme;
      default:
        return colors;
    }
  })();

  // Handle theme mode changes
  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    if (newMode === "random") {
      // Generate a new random theme immediately
      setRandomTheme({
        white: getRandomHexColor(),
        offWhite: getRandomHexColor(),
        offWhite2: getRandomHexColor(),
        lightGray: getRandomHexColor(),
        lightGray2: getRandomHexColor(),
        yellow: getRandomHexColor(),
        green: getRandomHexColor(),
        yuck: getRandomHexColor(),
        yuckLight: getRandomHexColor(),
        blood: getRandomHexColor(),
        orange: getRandomHexColor(),
        gray1: getRandomHexColor(),
        black: getRandomHexColor(),
        textDefault: getRandomHexColor(),
        extraYuckLight: getRandomHexColor(),
      });
    }
  };

  // Handle random theme updates
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (mode === "random") {
      intervalId = setInterval(() => {
        setRandomTheme({
          white: getRandomHexColor(),
          offWhite: getRandomHexColor(),
          offWhite2: getRandomHexColor(),
          lightGray: getRandomHexColor(),
          lightGray2: getRandomHexColor(),
          yellow: getRandomHexColor(),
          green: getRandomHexColor(),
          yuck: getRandomHexColor(),
          yuckLight: getRandomHexColor(),
          blood: getRandomHexColor(),
          orange: getRandomHexColor(),
          gray1: getRandomHexColor(),
          black: getRandomHexColor(),
          textDefault: getRandomHexColor(),
          extraYuckLight: getRandomHexColor(),
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
