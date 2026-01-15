import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Linking,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { useLocation } from "../hooks/useLocation";
import { geocodeLocation, generateTargetPoint } from "../services/geocoding";
import { fetchRoute, processRoutes } from "../services/routing";
import {
  Navbar,
  MapLegend,
  ModeSwitch,
  SearchInput,
  ResultCard,
  Map,
} from "../components";

export default function HomeScreen() {
  const mapRef = useRef(null);
  const { location, region, isLoading, startTracking, stopTracking, refreshLocation } = useLocation();

  const [mode, setMode] = useState("distance");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [bestRoute, setBestRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const startNavigation = async () => {
    setIsNavigating(true);
    if (mapRef.current?.animateCamera && location) {
      mapRef.current.animateCamera({
        center: location,
        pitch: 50,
        heading: 0,
        zoom: 18.5,
        altitude: 200,
      });
    }

    await startTracking((coords, heading) => {
      if (mapRef.current?.animateCamera) {
        mapRef.current.animateCamera({
          center: coords,
          heading: heading || 0,
          pitch: 50,
        });
      }
    });
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    stopTracking();
    if (mapRef.current?.animateCamera && location) {
      mapRef.current.animateCamera({ center: location, pitch: 0, zoom: 15 });
    }
  };

  const resetSearch = () => {
    setShowResults(false);
    setRoutes([]);
    setBestRoute(null);
    setInputValue("");
  };

  const openGoogleMaps = () => {
    if (!location || routes.length === 0) return;
    const dest = routes[0].points[routes[0].points.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${dest.latitude},${dest.longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  const handleFindPath = async () => {
    if (!inputValue.trim()) {
      Alert.alert("Missing Input", "Please enter a distance or destination.");
      return;
    }

    let currentLocation = location;
    if (!currentLocation) {
      currentLocation = await refreshLocation();
      if (!currentLocation) {
        Alert.alert("GPS Error", "Waiting for location...");
        return;
      }
    }

    Keyboard.dismiss();
    setLoading(true);
    setRoutes([]);
    setBestRoute(null);
    handleStopNavigation();

    try {
      if (mode === "path") {
        const targetCoords = await geocodeLocation(inputValue);
        if (!targetCoords) {
          Alert.alert("Not Found", "Location not found.");
          setLoading(false);
          return;
        }

        const data = await fetchRoute(currentLocation, targetCoords, true);
        if (!data?.features) throw new Error("No route");

        await processAndSetRoutes(data.features);
      } else {
        const km = parseFloat(inputValue);
        if (isNaN(km)) {
          Alert.alert("Invalid Input", "Enter a valid number.");
          setLoading(false);
          return;
        }

        const loopCount = 3;
        const loopPromises = Array.from({ length: loopCount }, async () => {
          const targetCoords = generateTargetPoint(currentLocation, km);
          const data1 = await fetchRoute(currentLocation, targetCoords);
          const data2 = await fetchRoute(targetCoords, currentLocation);

          if (!data1?.features || !data2?.features) return null;

          const leg1Coords = data1.features[0].geometry.coordinates;
          const leg2Coords = data2.features[0].geometry.coordinates;
          const fullLoopCoords = [...leg1Coords, ...leg2Coords.slice(1)];

          return { geometry: { coordinates: fullLoopCoords } };
        });

        const loopResults = await Promise.all(loopPromises);
        const validLoops = loopResults.filter((loop) => loop !== null);

        if (validLoops.length === 0) {
          Alert.alert(
            "Route Error",
            "Could not find a path to that distance. Try a different number."
          );
          setLoading(false);
          return;
        }

        console.log(`Generated ${validLoops.length} loop alternatives`);
        await processAndSetRoutes(validLoops);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not connect to routing server.");
    } finally {
      setLoading(false);
    }
  };

  const processAndSetRoutes = async (features) => {
    const processed = await processRoutes(features);
    setRoutes(processed);
    setBestRoute(processed[0]);
    setShowResults(true);

    if (mapRef.current?.fitToCoordinates && processed[0]) {
      mapRef.current.fitToCoordinates(processed[0].points, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d98da" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>📍</Text>
        <Text style={styles.errorText}>Location Unavailable</Text>
        <Text style={styles.errorSubtext}>Please enable location services and restart the app.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshLocation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Navbar />

        <View style={isNavigating ? styles.mapContainerFullscreen : styles.mapContainer}>
          <Map
            ref={mapRef}
            region={region}
            location={location}
            routes={routes}
            bestRoute={bestRoute}
          />

          {isNavigating && (
            <TouchableOpacity style={styles.stopButton} onPress={handleStopNavigation}>
              <Text style={styles.stopButtonText}>Stop Tracking</Text>
            </TouchableOpacity>
          )}

          {routes.length > 0 && !isNavigating && <MapLegend />}
        </View>

        {!isNavigating && (
          <View style={styles.optionsContainer}>
            {!showResults ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <ModeSwitch mode={mode} onModeChange={setMode} />
                <SearchInput
                  mode={mode}
                  value={inputValue}
                  onChangeText={setInputValue}
                  onSubmit={handleFindPath}
                  loading={loading}
                  hasLocation={!!location}
                />
              </ScrollView>
            ) : (
              bestRoute && (
                <ResultCard
                  bestRoute={bestRoute}
                  routes={routes}
                  onNewSearch={resetSearch}
                  onStartNavigation={startNavigation}
                  onOpenGoogleMaps={openGoogleMaps}
                />
              )
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7f8c8d",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#2d98da",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
  },
  mapContainerFullscreen: {
    flex: 1,
  },
  stopButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "#eb4d4b",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
  },
  stopButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  optionsContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
});
