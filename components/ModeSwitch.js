import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export function ModeSwitch({ mode, onModeChange }) {
  return (
    <View style={styles.switchContainer}>
      <TouchableOpacity
        style={[styles.switchButton, mode === "distance" && styles.activeSwitch]}
        onPress={() => onModeChange("distance")}
      >
        <Text style={[styles.switchText, mode === "distance" && styles.activeSwitchText]}>
          Loop
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.switchButton, mode === "path" && styles.activeSwitch]}
        onPress={() => onModeChange("path")}
      >
        <Text style={[styles.switchText, mode === "path" && styles.activeSwitchText]}>
          Path
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  switchContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f2f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeSwitch: {
    backgroundColor: "#fff",
    elevation: 2,
  },
  switchText: {
    fontWeight: "600",
    color: "#7f8c8d",
  },
  activeSwitchText: {
    color: "#2c3e50",
  },
});
