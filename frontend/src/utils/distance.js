export const formatDistanceMeters = (meters) => {
  if (meters === null || meters === undefined || Number.isNaN(Number(meters))) {
    return 'N/A';
  }

  const numericMeters = Number(meters);

  if (numericMeters < 1000) {
    return `${Math.round(numericMeters)} m`;
  }

  return `${(numericMeters / 1000).toFixed(1)} km`;
};

export const computeDistanceMeters = (from, to) => {
  if (!from || !to) {
    return null;
  }

  if (typeof window !== 'undefined' && window.google?.maps?.geometry?.spherical) {
    const origin = new window.google.maps.LatLng(from.lat, from.lng);
    const destination = new window.google.maps.LatLng(to.lat, to.lng);
    return window.google.maps.geometry.spherical.computeDistanceBetween(origin, destination);
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const startLat = toRadians(from.lat);
  const endLat = toRadians(to.lat);

  const a = Math.sin(latDelta / 2) ** 2 + Math.sin(lngDelta / 2) ** 2 * Math.cos(startLat) * Math.cos(endLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};