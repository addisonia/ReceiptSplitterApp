// src/components/SettingsButton.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Switch,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

type SettingsButtonProps = {
  currentTheme: any;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  offWhiteMode: boolean;
  setOffWhiteMode: (val: boolean) => void;
  yuckMode: boolean;
  setYuckMode: (val: boolean) => void;
  randomMode: boolean;
  setRandomMode: (val: boolean) => void;
  splitTaxEvenly: boolean;
  setSplitTaxEvenly: (val: boolean) => void;
  colors: any;
};

const SettingsButton: React.FC<SettingsButtonProps> = ({
  currentTheme,
  darkMode,
  setDarkMode,
  offWhiteMode,
  setOffWhiteMode,
  yuckMode,
  setYuckMode,
  randomMode,
  setRandomMode,
  splitTaxEvenly,
  setSplitTaxEvenly,
  colors,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  let modalBackgroundColor = "#ffffff";
  let modalTextColor = "#000000";

  if (randomMode) {
    modalBackgroundColor = currentTheme.offWhite;
    modalTextColor = currentTheme.textDefault;
  } else if (darkMode) {
    // dark grey background, off-white text
    modalBackgroundColor = currentTheme.offWhite2; 
    modalTextColor = currentTheme.textDefault; 
  } else if (offWhiteMode) {
    modalBackgroundColor = currentTheme.offWhite2; 
    modalTextColor = currentTheme.black; 
  } else if (yuckMode) {
    modalBackgroundColor = currentTheme.yuckLight; 
    modalTextColor = currentTheme.black;
  }

  return (
    <>
      <Pressable style={{ padding: 5 }} onPress={() => setShowSettings(true)}>
        {({ pressed }) => (
          <FontAwesome5
            name="cog"
            size={24}
            color={pressed ? currentTheme.green : currentTheme.yellow}
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
                  <Text style={[styles.settingLabel, { color: modalTextColor }]}>
                    Dark Theme
                  </Text>
                  {/* set trackColor, thumbColor for dark mode toggles to show offwhite instead of pure white */}
                  <Switch
                    value={darkMode}
                    trackColor={{
                      false: modalTextColor,
                      true: currentTheme.green,
                    }}
                    thumbColor={darkMode ? currentTheme.textDefault : "#f4f3f4"}
                    onValueChange={(value: boolean) => {
                      if (value) {
                        setDarkMode(true);
                        setOffWhiteMode(false);
                        setYuckMode(false);
                        setRandomMode(false);
                      } else {
                        setDarkMode(false);
                      }
                    }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: modalTextColor }]}>
                    Off White Theme
                  </Text>
                  <Switch
                    value={offWhiteMode}
                    trackColor={{
                      false: modalTextColor,
                      true: currentTheme.green,
                    }}
                    thumbColor={offWhiteMode ? currentTheme.textDefault : "#f4f3f4"}
                    onValueChange={(value: boolean) => {
                      if (value) {
                        setOffWhiteMode(true);
                        setDarkMode(false);
                        setYuckMode(false);
                        setRandomMode(false);
                      } else {
                        setOffWhiteMode(false);
                      }
                    }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: modalTextColor }]}>
                    Yuck Theme
                  </Text>
                  <Switch
                    value={yuckMode}
                    trackColor={{
                      false: modalTextColor,
                      true: currentTheme.green,
                    }}
                    thumbColor={yuckMode ? currentTheme.black : "#f4f3f4"}
                    onValueChange={(value: boolean) => {
                      if (value) {
                        setYuckMode(true);
                        setDarkMode(false);
                        setOffWhiteMode(false);
                        setRandomMode(false);
                      } else {
                        setYuckMode(false);
                      }
                    }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: modalTextColor }]}>
                    Random Colors
                  </Text>
                  <Switch
                    value={randomMode}
                    trackColor={{
                      false: modalTextColor,
                      true: currentTheme.green,
                    }}
                    thumbColor={randomMode ? currentTheme.textDefault : "#f4f3f4"}
                    onValueChange={(value: boolean) => {
                      if (value) {
                        setRandomMode(true);
                        setDarkMode(false);
                        setOffWhiteMode(false);
                        setYuckMode(false);
                      } else {
                        setRandomMode(false);
                      }
                    }}
                  />
                </View>

                {/* Divider */}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: modalTextColor },
                  ]}
                />

                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: modalTextColor }]}>
                    Split Tax Evenly
                  </Text>
                  <Switch
                    value={splitTaxEvenly}
                    trackColor={{
                      false: modalTextColor,
                      true: currentTheme.green,
                    }}
                    thumbColor={splitTaxEvenly ? currentTheme.textDefault : "#f4f3f4"}
                    onValueChange={(value: boolean) =>
                      setSplitTaxEvenly(value)
                    }
                  />
                </View>

                <Pressable
                  onPress={() => setShowSettings(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    {
                      backgroundColor: pressed
                        ? currentTheme.green
                        : currentTheme.yellow,
                    },
                  ]}
                >
                  {/* for dark mode => black text */}
                  <Text style={{ color: darkMode ? "#000000" : modalTextColor, fontWeight: "bold" }}>
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
