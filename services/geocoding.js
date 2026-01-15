export async function geocodeLocation(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "AeroPathApp/1.0" },
    });
    const data = await response.json();
    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function generateTargetPoint(startLoc, kmDistance) {
  const distInDegrees = kmDistance / 2 / 111;
  const angle = Math.random() * Math.PI * 2;
  return {
    latitude: startLoc.latitude + distInDegrees * Math.cos(angle),
    longitude: startLoc.longitude + distInDegrees * Math.sin(angle),
  };
}
