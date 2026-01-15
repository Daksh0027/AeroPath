import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export function ResultCard({
  bestRoute,
  routes,
  onNewSearch,
  onStartNavigation,
  onOpenGoogleMaps,
}) {
  const cleanerPercentage =
    routes.length > 1 && routes[routes.length - 1].aqiScore > 0
      ? (
          ((routes[routes.length - 1].aqiScore - bestRoute.aqiScore) /
            routes[routes.length - 1].aqiScore) *
          100
        ).toFixed(0)
      : "0";

  return (
    <View style={styles.resultContainer}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onNewSearch}>
          <Text style={styles.backLink}>← New Search</Text>
        </TouchableOpacity>
        <Text style={styles.resultTitle}>Route Ready</Text>
      </View>

      <Text style={styles.resultMainText}>
        We found a <Text style={styles.greenText}>GREEN</Text> path that is
        <Text style={styles.boldText}> {cleanerPercentage}% </Text>
        cleaner.
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>AQI</Text>
          <Text
            style={[
              styles.statValue,
              { color: bestRoute.aqiScore <= 2 ? "#20bf6b" : "#f7b731" },
            ]}
          >
            {bestRoute.aqiScore.toFixed(1)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Quality</Text>
          <Text style={styles.statValue}>
            {bestRoute.aqiScore <= 2 ? "Good" : "Moderate"}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.navButtonPrimary} onPress={onStartNavigation}>
        <Text style={styles.navButtonText}>Start Journey</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButtonSecondary} onPress={onOpenGoogleMaps}>
        <Text style={styles.navButtonTextSec}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    alignItems: "stretch",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    justifyContent: "space-between",
  },
  backLink: {
    color: "#3498db",
    fontSize: 14,
    fontWeight: "600",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  resultMainText: {
    fontSize: 16,
    color: "#57606f",
    marginBottom: 20,
    lineHeight: 22,
  },
  greenText: {
    color: "#20bf6b",
    fontWeight: "bold",
  },
  boldText: {
    fontWeight: "bold",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    backgroundColor: "#f1f2f6",
    padding: 10,
    borderRadius: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#a4b0be",
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2f3542",
    marginTop: 4,
  },
  navButtonPrimary: {
    backgroundColor: "#20bf6b",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  navButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dfe4ea",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  navButtonTextSec: {
    color: "#7f8c8d",
    fontSize: 16,
    fontWeight: "600",
  },
});
