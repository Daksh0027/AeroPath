import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function MapLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: "#20bf6b" }]} />
        <Text style={styles.legendText}>Clean</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: "#eb4d4b" }]} />
        <Text style={styles.legendText}>Polluted</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 8,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
