import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

const DEFAULT_ZOOM = {
  latitudeDelta: parseFloat(process.env.DEFAULT_ZOOM_LATITUDE_DELTA),
  longitudeDelta: parseFloat(process.env.DEFAULT_ZOOM_LONGITUDE_DELTA),
};

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const locationSubscription = useRef(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Allow location access to use AeroPath.");
          setIsLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (!loc) {
          const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
          if (lastKnown && isMounted) {
            const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
            setLocation(coords);
            setRegion({ ...coords, ...DEFAULT_ZOOM });
          }
          setIsLoading(false);
          return;
        }

        if (isMounted) {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLocation(coords);
          setRegion({ ...coords, ...DEFAULT_ZOOM });
          setIsLoading(false);
        }
      } catch (error) {
        console.log("Location error:", error);
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const startTracking = async (onUpdate) => {
    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
      (newLoc) => {
        const { latitude, longitude, heading } = newLoc.coords;
        const coords = { latitude, longitude };
        setLocation(coords);
        setRegion((prev) =>
          prev ? { ...prev, latitude, longitude } : { latitude, longitude, ...DEFAULT_ZOOM }
        );
        onUpdate(coords, heading);
      }
    );
  };

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const refreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (loc) {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLocation(coords);
          setRegion({ ...coords, ...DEFAULT_ZOOM });
          return coords;
        }

        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastKnown) {
          const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
          setLocation(coords);
          setRegion({ ...coords, ...DEFAULT_ZOOM });
          return coords;
        }
      }
    } catch (error) {
      console.log("Refresh location error:", error);
    }
    return null;
  };

  return {
    location,
    region,
    isLoading,
    startTracking,
    stopTracking,
    refreshLocation,
  };
}
