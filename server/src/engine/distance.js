/**
 * Haversine formula for calculating great-circle distance between two coordinate pairs on Earth.
 * Zero external API dependencies, 100% free and deterministic.
 */
export function calculateHaversineDistanceKm(coord1, coord2) {
  if (!coord1 || !coord2) return Infinity;

  // Supports [longitude, latitude] array or { lat, lng } / { latitude, longitude } objects
  const lon1 = Array.isArray(coord1) ? coord1[0] : (coord1.lng ?? coord1.longitude);
  const lat1 = Array.isArray(coord1) ? coord1[1] : (coord1.lat ?? coord1.latitude);
  const lon2 = Array.isArray(coord2) ? coord2[0] : (coord2.lng ?? coord2.longitude);
  const lat2 = Array.isArray(coord2) ? coord2[1] : (coord2.lat ?? coord2.latitude);

  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return Infinity;
  }

  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return Math.round(distanceKm * 100) / 100; // 2 decimal places
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimates urban transit time in minutes using straight-line distance and a conservative average speed.
 * Note: Clearly labeled in UI as an estimate based on direct distance; traffic conditions may vary.
 */
export function estimateTransitMinutes(distanceKm, averageUrbanSpeedKmh = 22) {
  if (!isFinite(distanceKm) || distanceKm <= 0) return 5;
  const transitHours = distanceKm / averageUrbanSpeedKmh;
  const transitMinutes = Math.ceil(transitHours * 60) + 5; // 5 min buffer for pickup/parking
  return transitMinutes;
}
