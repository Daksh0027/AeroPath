import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function Navbar() {
  return (
    <View style={styles.navbar}>
      <Text style={styles.navbarTitle}>AeroPath</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 90,
    backgroundColor: "#2c3e50",
    justifyContent: "flex-end",
    paddingBottom: 15,
    alignItems: "center",
  },
  navbarTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
});
