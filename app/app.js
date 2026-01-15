import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Linking, ScrollView 
} from 'react-native';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// ---------------------------------------------------------
// CONFIGURATION & API KEYS
// ---------------------------------------------------------
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiZWQzZGViZGVhOTQ3NTRiMmU3ZTVmMGQ5YmFkMmIzIiwiaCI6Im11cm11cjY0In0="; 
const OWM_API_KEY = "268229c579a16948745591681f518d8a";

export default function App() {
  const mapRef = useRef(null); 
  const locationSubscription = useRef(null); 

  // --- STATE ---
  const [location, setLocation] = useState(null);
  const [mode, setMode] = useState('distance'); 
  const [inputValue, setInputValue] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  // Data
  const [routes, setRoutes] = useState([]); 
  const [bestRoute, setBestRoute] = useState(null);
  
  // UI Flags
  const [isNavigating, setIsNavigating] = useState(false); 
  const [showResults, setShowResults] = useState(false); 

  const [region, setRegion] = useState({
    latitude: 28.6139, longitude: 77.2090,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  // ---------------------------------------------------------
  // 1. INITIAL GPS FETCH
  // ---------------------------------------------------------
  useEffect(() => {(async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Allow location access to use AeroPath.");
        return;
      }
      
      // Get initial location
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setRegion({
        ...region,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();

    return () => { if (locationSubscription.current) locationSubscription.current.remove(); };
  }, []);

  // ---------------------------------------------------------
  // 2. HELPER FUNCTIONS
  // ---------------------------------------------------------
  const geocodeLocation = async (query) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'AeroPathApp/1.0' } });
      const data = await response.json();
      return data.length > 0 ? { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) } : null;
    } catch (e) { return null; }
  };

  const generateTargetPoint = (startLoc, kmDistance) => {
    const distInDegrees = (kmDistance / 2) / 111;
    const angle = Math.random() * Math.PI * 2;
    return {
      latitude: startLoc.latitude + (distInDegrees * Math.cos(angle)),
      longitude: startLoc.longitude + (distInDegrees * Math.sin(angle))
    };
  };

  const getRouteAQI = async (points) => {
    if (!points || points.length === 0) return 3;
    const samples = [0, Math.floor(points.length / 2), points.length - 1];
    const promises = samples.map(async (idx) => {
      const pt = points[idx];
      if (!pt) return 3;
      const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${pt.latitude}&lon=${pt.longitude}&appid=${OWM_API_KEY}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        return data.list ? data.list[0].main.aqi : 3; 
      } catch (e) { return 3; }
    });
    const scores = await Promise.all(promises);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  // ---------------------------------------------------------
  // 3. NAVIGATION CONTROLS
  // ---------------------------------------------------------
  const startNavigation = async () => {
    setIsNavigating(true);
    // Tilt camera for "Driving Mode"
    if(mapRef.current && location) {
      mapRef.current.animateCamera({ center: location, pitch: 50, heading: 0, zoom: 18.5, altitude: 200 });
    }
    
    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
      (newLoc) => {
        const { latitude, longitude, heading } = newLoc.coords;
        setLocation({ latitude, longitude });
        if(mapRef.current) {
          mapRef.current.animateCamera({ center: { latitude, longitude }, heading: heading || 0, pitch: 50 });
        }
      }
    );
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    if (locationSubscription.current) locationSubscription.current.remove();
    if(mapRef.current && location) {
      mapRef.current.animateCamera({ center: location, pitch: 0, zoom: 15 });
    }
  };

  const resetSearch = () => {
    setShowResults(false);
    setRoutes([]);
    setBestRoute(null);
    setInputValue('');
  };

  const openGoogleMaps = () => {
    if (!location || routes.length === 0) return;
    const dest = routes[0].points[routes[0].points.length - 1];
const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${dest.latitude},${dest.longitude}&travelmode=driving`;    Linking.openURL(url);
  };

// ---------------------------------------------------------
  // 4. MAIN LOGIC: ROBUST "STITCHED" LOOP
  // ---------------------------------------------------------
  const handleFindPath = async () => {
    // A. Validate Input
    if (!inputValue || inputValue.trim() === "") { 
      Alert.alert("Missing Input", "Please enter a distance or destination."); 
      return; 
    }

    // B. Validate Location
    if (!location) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if(status === 'granted') {
         let loc = await Location.getCurrentPositionAsync({});
         if(loc) setLocation(loc.coords);
         else { Alert.alert("GPS Error", "Waiting for location..."); return; }
      } else {
         Alert.alert("Permission Error", "Location access needed."); return;
      }
    }
    
    Keyboard.dismiss();
    setLoading(true);
    setRoutes([]);
    setBestRoute(null);
    stopNavigation();

    try {
      let startCoords = location; 
      
      // --- MODE 1: PATH (Simple A -> B) ---
      if (mode === 'path') {
        const targetCoords = await geocodeLocation(inputValue);
        if (!targetCoords) { Alert.alert("Not Found", "Location not found."); setLoading(false); return; }
        
        // Just one standard call for Path
        const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
          method: 'POST',
          headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coordinates: [[startCoords.longitude, startCoords.latitude], [targetCoords.longitude, targetCoords.latitude]],
            alternative_routes: { target_count: 3, weight_factor: 1.5, share_factor: 0.6 }
          })
        });
        
        const data = await response.json();
        if (!data.features) throw new Error("No route");
        
        await processAndSetRoutes(data.features);

      } else {
        // --- MODE 2: LOOP (The "Two-Leg" Stitch Fix) ---
        const km = parseFloat(inputValue);
        if (isNaN(km)) { Alert.alert("Invalid Input", "Enter a valid number."); setLoading(false); return; }

        // 1. Pick a random target roughly half the distance away
        const targetCoords = generateTargetPoint(startCoords, km);
        
        // 2. FETCH LEG 1: Start -> Target
        const req1 = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
          method: 'POST',
          headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coordinates: [[startCoords.longitude, startCoords.latitude], [targetCoords.longitude, targetCoords.latitude]]
          })
        });
        const json1 = await req1.json();

        // 3. FETCH LEG 2: Target -> Start (Return trip)
        const req2 = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
          method: 'POST',
          headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coordinates: [[targetCoords.longitude, targetCoords.latitude], [startCoords.longitude, startCoords.latitude]]
          })
        });
        const json2 = await req2.json();

        // 4. Validate both legs exist
        if (!json1.features || !json2.features) {
           Alert.alert("Route Error", "Could not find a path to that distance. Try a different number.");
           setLoading(false);
           return;
        }

        // 5. STITCH THEM TOGETHER
        // We take the coordinates of Leg 1 and add coordinates of Leg 2 to the end
        const leg1Coords = json1.features[0].geometry.coordinates; // [[lon, lat], ...]
        const leg2Coords = json2.features[0].geometry.coordinates;
        
        // Combine arrays (removing the first point of leg 2 because it's same as last of leg 1)
        const fullLoopCoords = [...leg1Coords, ...leg2Coords.slice(1)];
        
        // Create a "Fake" Feature to pass to our processor
        const stitchedFeature = {
          geometry: { coordinates: fullLoopCoords }
        };

        // Process this single stitched loop
        await processAndSetRoutes([stitchedFeature]);
      }

    } catch (error) { 
      console.log(error);
      Alert.alert("Error", "Could not connect to routing server."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- HELPER: Process Raw Data into State ---
  const processAndSetRoutes = async (features) => {
    const processedRoutes = await Promise.all(features.map(async (feature, index) => {
      const rawPoints = feature.geometry.coordinates;
      const points = rawPoints.map(p => ({ latitude: p[1], longitude: p[0] }));
      const score = await getRouteAQI(points);
      return { id: index, points, aqiScore: score };
    }));

    // Sort & Color
    processedRoutes.sort((a, b) => a.aqiScore - b.aqiScore);
    processedRoutes.forEach((r, idx) => {
      if (idx === 0) r.color = "#20bf6b"; 
      else if (idx === processedRoutes.length - 1) r.color = "#eb4d4b"; 
      else r.color = "#f7b731"; 
    });

    setRoutes(processedRoutes);
    setBestRoute(processedRoutes[0]);
    setShowResults(true);

    if(mapRef.current) {
      mapRef.current.fitToCoordinates(processedRoutes[0].points, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };
  // ---------------------------------------------------------
  // 5. RENDER UI
  // ---------------------------------------------------------
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Navbar */}
        <View style={styles.navbar}><Text style={styles.navbarTitle}>AeroPath</Text></View>

        {/* Map Area */}
        <View style={isNavigating ? styles.mapContainerFullscreen : styles.mapContainer}>
          <MapView 
            ref={mapRef}
            style={styles.map} 
            initialRegion={region}
            showsUserLocation={false} 
          >
            <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
            
            {location && (
              <Marker coordinate={location} anchor={{x: 0.5, y: 0.5}}>
                <View style={styles.userDot}><View style={styles.userDotInner} /></View>
              </Marker>
            )}
            
            {routes.map((route) => (
              <Polyline 
                key={route.id} coordinates={route.points} strokeColor={route.color}
                strokeWidth={route.id === bestRoute?.id ? 6 : 4} zIndex={route.id === bestRoute?.id ? 10 : 1}
              />
            ))}
          </MapView>
          
          {isNavigating && (
            <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
              <Text style={styles.stopButtonText}>Stop Tracking</Text>
            </TouchableOpacity>
          )}

          {routes.length > 0 && !isNavigating && (
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#20bf6b'}]}/><Text style={styles.legendText}>Clean</Text></View>
              <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#eb4d4b'}]}/><Text style={styles.legendText}>Polluted</Text></View>
            </View>
          )}
        </View>

        {/* OPTIONS PANEL */}
        {!isNavigating && (
          <View style={styles.optionsContainer}>
            
            {/* MODE A: SEARCH INPUTS */}
            {!showResults ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.switchContainer}>
                  <TouchableOpacity style={[styles.switchButton, mode === 'distance' && styles.activeSwitch]} onPress={() => setMode('distance')}>
                    <Text style={[styles.switchText, mode === 'distance' && styles.activeSwitchText]}>Loop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.switchButton, mode === 'path' && styles.activeSwitch]} onPress={() => setMode('path')}>
                    <Text style={[styles.switchText, mode === 'path' && styles.activeSwitchText]}>Path</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputArea}>
                  <Text style={styles.label}>{mode === 'distance' ? "Distance (km)" : "Destination"}</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder={mode === 'distance' ? "e.g., 5" : "e.g., Central Park"}
                    value={inputValue}
                    onChangeText={setInputValue}
                    keyboardType={mode === 'distance' ? 'numeric' : 'default'}
                  />
                  
                  {/* Button Logic: Grey out if no GPS */}
                  <TouchableOpacity 
                    style={[styles.actionButton, !location && { backgroundColor: '#95a5a6' }]} 
                    onPress={handleFindPath} 
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : 
                      <Text style={styles.actionButtonText}>{!location ? "Waiting for GPS..." : "Find Routes"}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              
              // MODE B: RESULT BOX (Inputs Hidden)
              <View style={styles.resultContainerFull}>
                {bestRoute && (
                  <>
                    <View style={styles.headerRow}>
                      <TouchableOpacity onPress={resetSearch}>
                        <Text style={styles.backLink}>← New Search</Text>
                      </TouchableOpacity>
                      <Text style={styles.resultTitle}>Route Ready</Text>
                    </View>

                    <Text style={styles.resultMainText}>
                      We found a <Text style={{color: '#20bf6b', fontWeight:'bold'}}>GREEN</Text> path that is 
                      <Text style={{fontWeight:'bold'}}> {
                        routes.length > 1 && routes[routes.length-1].aqiScore > 0 
                        ? (((routes[routes.length-1].aqiScore - bestRoute.aqiScore)/routes[routes.length-1].aqiScore)*100).toFixed(0) 
                        : 0
                      }% </Text> 
                      cleaner.
                    </Text>

                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                         <Text style={styles.statLabel}>AQI</Text>
                         <Text style={[styles.statValue, {color: bestRoute.aqiScore <= 2 ? '#20bf6b' : '#f7b731'}]}>
                           {bestRoute.aqiScore.toFixed(1)}
                         </Text>
                      </View>
                      <View style={styles.statItem}>
                         <Text style={styles.statLabel}>Quality</Text>
                         <Text style={styles.statValue}>{bestRoute.aqiScore <= 2 ? 'Good' : 'Moderate'}</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity style={styles.navButtonPrimary} onPress={startNavigation}>
                      <Text style={styles.navButtonText}>Start Journey</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.navButtonSecondary} onPress={openGoogleMaps}>
                      <Text style={styles.navButtonTextSec}>Open in Google Maps</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // Navbar
  navbar: { height: 90, backgroundColor: '#2c3e50', justifyContent: 'flex-end', paddingBottom: 15, alignItems: 'center' },
  navbarTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  // Map
  mapContainer: { flex: 1 }, 
  mapContainerFullscreen: { flex: 1 },
  map: { width: '100%', height: '100%' },
  userDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0, 122, 255, 0.4)', justifyContent: 'center', alignItems: 'center' },
  userDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007AFF', borderWidth: 2, borderColor: 'white' },
  legend: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: '600' },
  stopButton: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#eb4d4b', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  stopButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  // Options Card
  optionsContainer: { 
    position: 'absolute', bottom: 0, width: '100%', 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 25, borderTopRightRadius: 25, 
    padding: 25, 
    shadowColor: "#000", shadowOffset: { height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10
  },
  switchContainer: { flexDirection: 'row', backgroundColor: '#f1f2f6', borderRadius: 12, padding: 4, marginBottom: 20 },
  switchButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeSwitch: { backgroundColor: '#fff', elevation: 2 },
  switchText: { fontWeight: '600', color: '#7f8c8d' },
  activeSwitchText: { color: '#2c3e50' },
  inputArea: { marginTop: 5 },
  label: { fontSize: 16, fontWeight: '700', color: '#2f3542', marginBottom: 8 },
  input: { backgroundColor: '#f1f2f6', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, color: '#2d3436' },
  actionButton: { backgroundColor: '#2d98da', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  // RESULT MODE STYLES
  resultContainerFull: { alignItems: 'stretch' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, justifyContent: 'space-between' },
  backLink: { color: '#3498db', fontSize: 14, fontWeight: '600' },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  resultMainText: { fontSize: 16, color: '#57606f', marginBottom: 20, lineHeight: 22 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, backgroundColor: '#f1f2f6', padding: 10, borderRadius: 12 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#a4b0be', fontWeight: 'bold' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#2f3542', marginTop: 4 },
  navButtonPrimary: { backgroundColor: '#20bf6b', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  navButtonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe4ea', padding: 16, borderRadius: 12, alignItems: 'center' },
  navButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  navButtonTextSec: { color: '#7f8c8d', fontSize: 16, fontWeight: '600' },
});