// src/context/ThemeContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const THEME_STORAGE_KEY = "@theme_mode"; // Key for storing theme mode in AsyncStorage

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("yuck"); // Default to yuck as fallback
  const [randomTheme, setRandomTheme] = useState<Theme>(colors);

  // Load the saved theme mode from AsyncStorage when the app starts
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setMode(savedMode as ThemeMode); // Cast to ThemeMode since we know the possible values
        }
      } catch (error) {
        console.error("Failed to load theme mode from storage:", error);
      }
    };
    loadThemeMode();
  }, []); // Runs once on mount

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

  // Handle theme mode changes and save to AsyncStorage
  const setThemeMode = async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
      console.log(`Theme mode saved: ${newMode}`);
    } catch (error) {
      console.error("Failed to save theme mode to storage:", error);
    }

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
  useEffect(() => {
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
