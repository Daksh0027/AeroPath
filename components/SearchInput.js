import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

export function SearchInput({
  mode,
  value,
  onChangeText,
  onSubmit,
  loading,
  hasLocation,
}) {
  return (
    <View style={styles.inputArea}>
      <Text style={styles.label}>
        {mode === "distance" ? "Distance (km)" : "Destination"}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={mode === "distance" ? "e.g., 5" : "e.g., Central Park"}
        value={value}
        onChangeText={onChangeText}
        keyboardType={mode === "distance" ? "numeric" : "default"}
      />
      <TouchableOpacity
        style={[styles.actionButton, !hasLocation && { backgroundColor: "#95a5a6" }]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionButtonText}>
            {!hasLocation ? "Waiting for GPS..." : "Find Routes"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputArea: {
    marginTop: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f3542",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f1f2f6",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
    color: "#2d3436",
  },
  actionButton: {
    backgroundColor: "#2d98da",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
