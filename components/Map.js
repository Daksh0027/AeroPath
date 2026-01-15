import React, { forwardRef } from "react";
import { Platform, View, Text, StyleSheet } from "react-native";

function WebMapFallback({ location }) {
  return (
    <View style={styles.webFallback}>
      <Text style={styles.webFallbackTitle}>Map View</Text>
      <Text style={styles.webFallbackText}>
        Maps are only available on iOS/Android devices.
      </Text>
      {location && (
        <Text style={styles.webFallbackCoords}>
          📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
}

let MapView = null;
let UrlTile = null;
let Polyline = null;
let Marker = null;

if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  UrlTile = Maps.UrlTile;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
}

export const Map = forwardRef(({ region, location, routes, bestRoute }, ref) => {
  if (Platform.OS === "web") {
    return <WebMapFallback location={location} />;
  }

  if (!MapView || !UrlTile || !Polyline || !Marker) {
    return <WebMapFallback location={location} />;
  }

  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={region}
      showsUserLocation={false}
    >
      <UrlTile
        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
      />

      {location && (
        <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.userDot}>
            <View style={styles.userDotInner} />
          </View>
        </Marker>
      )}

      {routes.map((route) => (
        <Polyline
          key={route.id}
          coordinates={route.points}
          strokeColor={route.color}
          strokeWidth={route.id === bestRoute?.id ? 6 : 4}
          zIndex={route.id === bestRoute?.id ? 10 : 1}
        />
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 122, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    borderWidth: 2,
    borderColor: "white",
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f2f6",
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  webFallbackCoords: {
    marginTop: 16,
    fontSize: 14,
    color: "#2d98da",
    fontWeight: "600",
  },
});
