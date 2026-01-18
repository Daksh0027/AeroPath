const ORS_API_KEY = process.env.ORS_API_KEY;
const OWM_API_KEY = process.env.OWM_API_KEY;

export async function getRouteAQI(points) {
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
    } catch {
      return 3;
    }
  });

  const scores = await Promise.all(promises);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export async function fetchRoute(start, end, alternatives = false) {
  try {
    const body = {
      coordinates: [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude],
      ],
    };

    if (alternatives) {
      body.alternative_routes = {
        target_count: 3,
        weight_factor: 1.5,
        share_factor: 0.6,
      };
    }

    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    return await response.json();
  } catch {
    return null;
  }
}

export async function processRoutes(features) {
  const processedRoutes = await Promise.all(
    features.map(async (feature, index) => {
      const rawPoints = feature.geometry.coordinates;
      const points = rawPoints.map((p) => ({ latitude: p[1], longitude: p[0] }));
      const score = await getRouteAQI(points);
      return { id: index, points, aqiScore: score, color: "" };
    })
  );

  processedRoutes.sort((a, b) => a.aqiScore - b.aqiScore);
  console.log("Route AQI scores:", processedRoutes.map(r => r.aqiScore));
  processedRoutes.forEach((r, idx) => {
    if (idx === 0) r.color = "#20bf6b";
    else if (idx === processedRoutes.length - 1) r.color = "#eb4d4b";
    else r.color = "#f7b731";
  });

  return processedRoutes;
}
