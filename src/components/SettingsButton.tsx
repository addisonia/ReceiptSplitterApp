// src/components/SettingsButton.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Switch,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  StatusBar,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";

type SettingsButtonProps = {
  splitTaxEvenly: boolean;
  setSplitTaxEvenly: (val: boolean) => void;
  colors: any; // You might not need this anymore if all colors come from ThemeContext
};

const SettingsButton: React.FC<SettingsButtonProps> = ({
  splitTaxEvenly,
  setSplitTaxEvenly,
  colors,
}) => {
  const { theme, mode, setThemeMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  // Load initial theme setting (optional, since ThemeContext handles defaults)
  useEffect(() => {
    const loadThemeSetting = async () => {
      try {
        const themeChanged = await AsyncStorage.getItem("themeChanged");
        if (!themeChanged) {
          setThemeMode("yuck"); // Default to yuck mode if no theme has been set
          await AsyncStorage.setItem("themeChanged", "true");
        }
      } catch (error) {
        console.error("Error loading theme setting:", error);
      }
    };

    loadThemeSetting();
  }, [setThemeMode]);

  // Update StatusBar based on modal visibility and theme mode
  useEffect(() => {
    if (showSettings) {
      StatusBar.setBarStyle("light-content");
    } else {
      const barStyle =
        mode === "dark" || mode === "yuck" || mode === "random"
          ? "light-content"
          : "dark-content";
      StatusBar.setBarStyle(barStyle);
      StatusBar.setBackgroundColor(theme.offWhite2);
    }
  }, [showSettings, mode, theme.offWhite2]);

  // Determine modal colors based on theme mode
  let modalBackgroundColor = "#ffffff";
  let modalTextColor = "#000000";

  switch (mode) {
    case "random":
      modalBackgroundColor = theme.offWhite;
      modalTextColor = theme.textDefault;
      break;
    case "dark":
      modalBackgroundColor = theme.offWhite2;
      modalTextColor = theme.textDefault;
      break;
    case "offWhite":
      modalBackgroundColor = theme.offWhite2;
      modalTextColor = theme.black;
      break;
    case "yuck":
      modalBackgroundColor = theme.yuckLight;
      modalTextColor = theme.black;
      break;
    default:
      modalBackgroundColor = colors.offWhite;
      modalTextColor = colors.black;
  }

  // Theme toggle handlers
  const toggleDarkMode = (value: boolean) => {
    if (value) {
      setThemeMode("dark");
    } else if (mode === "dark") {
      setThemeMode("default");
    }
  };

  const toggleOffWhiteMode = (value: boolean) => {
    if (value) {
      setThemeMode("offWhite");
    } else if (mode === "offWhite") {
      setThemeMode("default");
    }
  };

  const toggleYuckMode = (value: boolean) => {
    if (value) {
      setThemeMode("yuck");
    } else if (mode === "yuck") {
      setThemeMode("default");
    }
  };

  const toggleRandomMode = (value: boolean) => {
    if (value) {
      setThemeMode("random");
    } else if (mode === "random") {
      setThemeMode("default");
    }
  };

  return (
    <>
      <Pressable style={{ padding: 5 }} onPress={() => setShowSettings(true)}>
        {({ pressed }) => (
          <FontAwesome5
            name="cog"
            size={24}
            color={pressed ? theme.green : theme.yellow}
          />
        )}
      </Pressable>

      <Modal visible={showSettings} animationType="none" transparent>
        <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.settingsModal,
                  { backgroundColor: modalBackgroundColor },
                ]}
              >
                <Text style={[styles.modalTitle, { color: modalTextColor }]}>
                  Settings
                </Text>

                {/* Color toggles */}
                <View style={styles.settingRow}>
                  <Text
                    style={[styles.settingLabel, { color: modalTextColor }]}
                  >
                    Dark Theme
                  </Text>
                  <Switch
                    value={mode === "dark"}
                    trackColor={{ false: modalTextColor, true: theme.green }}
                    thumbColor={mode === "dark" ? theme.textDefault : "#f4f3f4"}
                    onValueChange={toggleDarkMode}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text
                    style={[styles.settingLabel, { color: modalTextColor }]}
                  >
                    Off White Theme
                  </Text>
                  <Switch
                    value={mode === "offWhite"}
                    trackColor={{ false: modalTextColor, true: theme.green }}
                    thumbColor={
                      mode === "offWhite" ? theme.textDefault : "#f4f3f4"
                    }
                    onValueChange={toggleOffWhiteMode}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text
                    style={[styles.settingLabel, { color: modalTextColor }]}
                  >
                    Yuck Theme
                  </Text>
                  <Switch
                    value={mode === "yuck"}
                    trackColor={{ false: modalTextColor, true: theme.green }}
                    thumbColor={mode === "yuck" ? theme.black : "#f4f3f4"}
                    onValueChange={toggleYuckMode}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text
                    style={[styles.settingLabel, { color: modalTextColor }]}
                  >
                    Random Colors
                  </Text>
                  <Switch
                    value={mode === "random"}
                    trackColor={{ false: modalTextColor, true: theme.green }}
                    thumbColor={
                      mode === "random" ? theme.textDefault : "#f4f3f4"
                    }
                    onValueChange={toggleRandomMode}
                  />
                </View>

                {/* Divider */}
                <View
                  style={[styles.divider, { backgroundColor: modalTextColor }]}
                />

                <View style={styles.settingRow}>
                  <Text
                    style={[styles.settingLabel, { color: modalTextColor }]}
                  >
                    Split Tax Evenly
                  </Text>
                  <Switch
                    value={splitTaxEvenly}
                    trackColor={{ false: modalTextColor, true: theme.green }}
                    thumbColor={splitTaxEvenly ? theme.textDefault : "#f4f3f4"}
                    onValueChange={setSplitTaxEvenly}
                  />
                </View>

                <Pressable
                  onPress={() => setShowSettings(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    {
                      backgroundColor: pressed ? theme.green : theme.yellow,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: mode === "dark" ? "#000000" : modalTextColor,
                      fontWeight: "bold",
                    }}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default SettingsButton;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsModal: {
    width: "80%",
    padding: 30,
    borderRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  closeButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
});
