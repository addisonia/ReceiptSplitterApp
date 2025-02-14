// src/components/ColorThemes.tsx

import React from "react";
import { StyleSheet } from "react-native";

export const colors = {
  white: "#ffffff",
  offWhite: "#ede7d8",
  offWhite2: "rgba(255, 255, 255, 0.78)",
  lightGray: "#f0f0f0",
  lightGray2: "#dfdfdf",
  // default theme's yellow/green/blood/orange remain bright
  // but are overshadowed if dark mode is used
  yellow: "#e3d400",
  green: "#08f800",
  yuck: "#5c540b",
  yuckLight: "#9e9b7b",
  blood: "rgb(182,57,11)",
  orange: "#de910d",
  gray1: "#a4a4a4",
  black: "#000000",
  textDefault: "#000000",
  extraYuckLight: "#9e9b7b",
};

export const offWhiteTheme = {
  white: "#ffffff",
  offWhite: "#ece7d0",
  offWhite2: "#ece7d0",
  lightGray: "#f8f4ec",
  lightGray2: "#f0e8d0",
  yellow: "#e3d400",
  green: "#08f800",
  yuck: "#5c540b",
  yuckLight: "#9e9b7b",
  blood: "rgb(182,57,11)",
  orange: "#de910d",
  gray1: "#a4a4a4",
  black: "#000000",
  textDefault: "#000000",
  extraYuckLight: "#9e9b7b",
};

export const yuckTheme = {
  white: "#ffffff",
  offWhite: "#5c540b",
  offWhite2: "#5c540b",
  lightGray: "#7d7a55",
  lightGray2: "#7d7a55",
  // keep yuck color to #5c540b
  yellow: "#e3d400",
  green: "#08f800",
  yuck: "#5c540b",
  yuckLight: "#9e9b7b", // settings modal color
  blood: "rgb(182,57,11)",
  orange: "#de910d",
  gray1: "#a4a4a4",
  black: "#000000",
  textDefault: "#000000",
  extraYuckLight: "#d7d4b5",
};

export const darkTheme = {
  white: "#ffffff",
  offWhite: "#1e1e1e",
  offWhite2: "#121212",
  lightGray: "#333333",
  lightGray2: "#444444",
  // updated colors: less bright versions for dark mode
  yellow: "#c8ba00", // less bright yellow
  green: "#07d700", // less bright green
  yuck: "#5c540b",
  yuckLight: "#9e9b7b",
  // less bright red
  blood: "#cc2222",
  orange: "#de910d",
  gray1: "#555555",
  black: "#000000",
  textDefault: "#ede7d8",
  extraYuckLight: "#9e9b7b",
};

export function getRandomHexColor(): string {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;
}

const styles = StyleSheet.create({});
