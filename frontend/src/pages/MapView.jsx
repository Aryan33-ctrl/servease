import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import api, { getApiBaseUrl, isRealtimeEnabled } from '../utils/api';
import { computeDistanceMeters, formatDistanceMeters } from '../utils/distance';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, MapPin, Briefcase, Star, Phone, AlertCircle, MapPinOff } from 'lucide-react';
import Toast from '../components/Toast';

/**
 * REAL-TIME SERVICE AVAILABILITY MAP
 * 
 * What This Component Does:
 * 1. Displays all available service providers on a Google Map
 * 2. Shows provider locations with color-coded markers (Green = Available, Red = Busy)
 * 3. Updates marker positions in real-time using WebSocket
 * 4. Shows provider details in popup when clicking a marker
 * 5. Allows users to hire providers directly from the map
 */

// Map styling
const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 80px)',
  borderRadius: '0px'
};

// Default center location (San Francisco)
const defaultCenter = { lat: 37.7749, lng: -122.4194 };

const buildRecommendationScore = (worker, distanceMeters) => {
  const availabilityBonus = worker.available ? 1000 : -1000;
  const ratingScore = (worker.rating || 0) * 20;
  const affordabilityScore = worker.pricePerHour ? 1000 / worker.pricePerHour : 1000;
  const distancePenalty = distanceMeters ? distanceMeters * 0.002 : 0;

  return availabilityBonus + ratingScore + affordabilityScore - distancePenalty;
};

const decorateWorker = (worker, clientLocation) => {
  const workerLocation = worker.location?.coordinates
    ? { lat: worker.location.coordinates[1], lng: worker.location.coordinates[0] }
    : worker.location;

  const distanceMeters = computeDistanceMeters(clientLocation, workerLocation);

  return {
    _id: worker._id || worker.id,
    name: worker.name,
    skills: worker.skills || [],
    rating: worker.rating || 0,
    pricePerHour: worker.pricePerHour || 0,
    available: worker.available !== false,
    location: workerLocation || defaultCenter,
    phone: worker.phone || 'Not provided',
    reviews: worker.reviews || 0,
    distanceMeters,
    distanceLabel: formatDistanceMeters(distanceMeters),
    recommendationScore: worker.recommendationScore ?? buildRecommendationScore(worker, distanceMeters),
    aiScore: worker.aiScore ?? worker.recommendationScore ?? buildRecommendationScore(worker, distanceMeters)
  };
};

const sortRecommendedWorkers = (left, right) => {
  const availabilityLeft = left.available ? 1 : 0;
  const availabilityRight = right.available ? 1 : 0;

  if (availabilityLeft !== availabilityRight) {
    return availabilityRight - availabilityLeft;
  }

  if ((right.recommendationScore || 0) !== (left.recommendationScore || 0)) {
    return (right.recommendationScore || 0) - (left.recommendationScore || 0);
  }

  if ((left.distanceMeters || Infinity) !== (right.distanceMeters || Infinity)) {
    return (left.distanceMeters || Infinity) - (right.distanceMeters || Infinity);
  }

  return (right.rating || 0) - (left.rating || 0);
};

const prioritizeTrackedWorker = (workersList, trackedWorkerId) => {
  if (!trackedWorkerId) {
    return workersList.slice(0, 3);
  }

  const trackedIndex = workersList.findIndex(worker => worker._id === trackedWorkerId);
  if (trackedIndex === -1) {
    return workersList.slice(0, 3);
  }

  const trackedWorker = workersList[trackedIndex];
  const remainingWorkers = workersList.filter((_, index) => index !== trackedIndex);

  return [trackedWorker, ...remainingWorkers].slice(0, 3);
};

const MapView = () => {
  // ========== GOOGLE MAPS SETUP ==========
  // Loads Google Maps API key from environment variables
  // loadError: Any error loading the API (e.g., invalid key)
  // isLoaded: Whether the API has finished loading
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'REPLACE_WITH_VITE_GOOGLE_MAPS_API_KEY',
    libraries: ['places', 'geometry'] // Additional Google Maps libraries
  });

  // ========== STATE MANAGEMENT ==========
  const [map, setMap] = useState(null); // Google Map instance
  const [workers, setWorkers] = useState([]); // Array of worker/provider objects
  const [selectedWorker, setSelectedWorker] = useState(null); // Currently selected worker (for popup)
  const [toast, setToast] = useState(null); // Toast notification
  const [userLocation, setUserLocation] = useState(null); // User's current location
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(true); // Loading state
  const [recommendedWorkers, setRecommendedWorkers] = useState([]);
  const [trackedWorkerId, setTrackedWorkerId] = useState(null);
  const socketRef = useRef(null); // WebSocket reference
  const locationWatchRef = useRef(null);
  const loadWorkersWithLocationRef = useRef(null);
  const routeLocation = useLocation();
  const realtimeEnabled = isRealtimeEnabled();

  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const workerId = params.get('workerId');
    setTrackedWorkerId(workerId);
  }, [routeLocation.search]);

  // ========== FETCH INITIAL WORKER DATA ==========
  useEffect(() => {
    if (!trackedWorkerId || !workers.length) {
      return;
    }

    const trackedWorker = workers.find(worker => worker._id === trackedWorkerId);
    if (trackedWorker) {
      setSelectedWorker(trackedWorker);
      if (map) {
        map.panTo(trackedWorker.location);
        map.setZoom(15);
      }
    }
  }, [trackedWorkerId, workers, map]);

  useEffect(() => {
    if (!trackedWorkerId || !selectedWorker) {
      return;
    }

    if (selectedWorker._id !== trackedWorkerId) {
      return;
    }

    if (map) {
      map.panTo(selectedWorker.location);
    }
  }, [selectedWorker, trackedWorkerId, map]);

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);

      const loadWorkersWithLocation = async (lat, lng, showLoading = true) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          const response = await api.get('/api/workers', {
            params: {
              lat,
              lng,
              sortBy: 'aiScore',
              sortOrder: 'desc'
            }
          });

          const clientLocation = { lat, lng };
          const workerData = (response.data.data || response.data)
            .map(worker => decorateWorker(worker, clientLocation))
            .sort(sortRecommendedWorkers);

          setWorkers(workerData);
          setRecommendedWorkers(prioritizeTrackedWorker(workerData, trackedWorkerId));
        } catch (error) {
          console.error('Error fetching workers:', error);
          if (showLoading) {
            const demoWorkers = getDemoWorkers().map(worker => decorateWorker(worker, { lat, lng }));
            setWorkers(demoWorkers);
            setRecommendedWorkers(prioritizeTrackedWorker(demoWorkers, trackedWorkerId));
            setToast({ message: 'Showing demo providers', type: 'info' });
          }
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      };

      loadWorkersWithLocationRef.current = loadWorkersWithLocation;

      try {
        // Get user's current location for proximity search
        if (navigator.geolocation) {
          locationWatchRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              const liveLocation = { lat: userLat, lng: userLng };

              setHasUserLocation(true);
              setLocationError('');
              setUserLocation(liveLocation);

              // Fetch workers near user's current live location
              loadWorkersWithLocation(userLat, userLng);

              if (map && !trackedWorkerId) {
                map.panTo(liveLocation);
              }
            },
            (error) => {
              console.warn('Could not get user location:', error);
              setHasUserLocation(false);
              setLocationError('Location access is off. Showing a default search area instead.');
              // Fallback to default location
              setUserLocation(defaultCenter);
              loadWorkersWithLocation(defaultCenter.lat, defaultCenter.lng);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        }

        // Geolocation not available, use default
        setHasUserLocation(false);
        setUserLocation(defaultCenter);
        loadWorkersWithLocation(defaultCenter.lat, defaultCenter.lng);
      } catch (error) {
        console.error('Error in fetchWorkers:', error);
        setToast({ message: 'Failed to load map', type: 'error' });
      }
    };

    fetchWorkers();

    if (trackedWorkerId && workers.length) {
      setRecommendedWorkers(prioritizeTrackedWorker(workers, trackedWorkerId));
    }

    if (realtimeEnabled) {
      // ========== WEBSOCKET CONNECTION ==========
      // Connects to backend WebSocket for real-time updates
      const token = localStorage.getItem('token');
      socketRef.current = io(getApiBaseUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      socketRef.current.on('connect', () => {
        console.log('[MapView] ✅ Socket connected');
      });

      socketRef.current.on('disconnect', () => {
        console.log('[MapView] ❌ Socket disconnected');
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('[MapView] 🔴 Socket connection error:', err.message);
      });

      // Event: Worker location updated in real-time
      socketRef.current.on('worker-location-updated', (data) => {
        console.log('[MapView] 📍 Worker location updated:', data);
        setWorkers(prevWorkers =>
          prevWorkers
            .map(w => {
              if (w._id !== data.workerId) {
                return w;
              }

              const updatedLocation = {
                lat: data.location.lat || data.location.coordinates?.[1],
                lng: data.location.lng || data.location.coordinates?.[0]
              };

              return decorateWorker(
                {
                  ...w,
                  location: updatedLocation
                },
                userLocation || defaultCenter
              );
            })
            .sort(sortRecommendedWorkers)
        );
        if (trackedWorkerId === data.workerId) {
          const updatedLocation = {
            lat: data.location.lat || data.location.coordinates?.[1],
            lng: data.location.lng || data.location.coordinates?.[0]
          };

          setSelectedWorker(prev => prev ? decorateWorker(
            {
              ...prev,
              location: updatedLocation
            },
            userLocation || defaultCenter
          ) : prev);
        }
        setRecommendedWorkers(prev => prioritizeTrackedWorker(prev.map(worker => worker._id === data.workerId
          ? decorateWorker(
            {
              ...worker,
              location: {
                lat: data.location.lat || data.location.coordinates?.[1],
                lng: data.location.lng || data.location.coordinates?.[0]
              }
            },
            userLocation || defaultCenter
          )
          : worker).sort(sortRecommendedWorkers), trackedWorkerId));
      });

      // Event: Worker availability status changed
      socketRef.current.on('worker-availability-changed', (data) => {
        console.log('[MapView] 🔄 Worker availability changed:', data);
        setWorkers(prevWorkers =>
          prevWorkers
            .map(w => {
              if (w._id !== data.workerId) {
                return w;
              }

              return decorateWorker(
                {
                  ...w,
                  available: data.available,
                  location: data.location?.coordinates
                    ? {
                      lat: data.location.coordinates[1],
                      lng: data.location.coordinates[0]
                    }
                    : w.location
                },
                userLocation || defaultCenter
              );
            })
            .sort(sortRecommendedWorkers)
        );
        if (trackedWorkerId === data.workerId) {
          setSelectedWorker(prev => prev ? decorateWorker(
            {
              ...prev,
              available: data.available,
              location: data.location?.coordinates
                ? {
                  lat: data.location.coordinates[1],
                  lng: data.location.coordinates[0]
                }
                : prev.location
            },
            userLocation || defaultCenter
          ) : prev);
        }
        setRecommendedWorkers(prev => prioritizeTrackedWorker(prev.map(worker => worker._id === data.workerId
          ? decorateWorker(
            {
              ...worker,
              available: data.available,
              location: data.location?.coordinates
                ? {
                  lat: data.location.coordinates[1],
                  lng: data.location.coordinates[0]
                }
                : worker.location
            },
            userLocation || defaultCenter
          )
          : worker).sort(sortRecommendedWorkers), trackedWorkerId));
      });
    } else {
      socketRef.current = null;
    }

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (realtimeEnabled || !userLocation || !loadWorkersWithLocationRef.current) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadWorkersWithLocationRef.current(userLocation.lat, userLocation.lng, false);
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, [realtimeEnabled, userLocation]);

  // ========== DEMO DATA (when API fails or for testing) ==========
  const getDemoWorkers = () => [
    {
      _id: '1',
      name: 'John Smith',
      skills: ['Plumbing', 'Installation'],
      rating: 4.8,
      pricePerHour: 45,
      available: true,
      location: { lat: 37.7749, lng: -122.4194 },
      phone: '+1-555-0101',
      reviews: 128
    },
    {
      _id: '2',
      name: 'Maria Garcia',
      skills: ['Electrical', 'Wiring'],
      rating: 4.9,
      pricePerHour: 50,
      available: false,
      location: { lat: 37.7849, lng: -122.4094 },
      phone: '+1-555-0102',
      reviews: 95
    },
    {
      _id: '3',
      name: 'Robert Chen',
      skills: ['Carpentry', 'Repairs'],
      rating: 4.7,
      pricePerHour: 40,
      available: true,
      location: { lat: 37.7649, lng: -122.4294 },
      phone: '+1-555-0103',
      reviews: 156
    }
  ];

  // ========== MAP CALLBACKS ==========
  // Called when map is loaded
  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    console.log('Map loaded successfully');
  }, []);

  // Called when map is unmounted
  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // ========== HANDLE PROVIDER HIRE ==========
  const handleHire = async (worker) => {
    try {
      // TODO: Implement hire API call
      const response = await api.post('/api/workers/hire', {
        workerId: worker._id
      });
      
      setToast({
        message: `Booking request sent to ${worker.name}!`,
        type: 'success'
      });
      setSelectedWorker(null);
    } catch (error) {
      setToast({
        message: 'Failed to send booking request',
        type: 'error'
      });
    }
  };

  // ========== MARKER COLOR BASED ON STATUS ==========
  // Returns marker color based on worker availability
  const getMarkerColor = (available) => {
    return available ? '#22c55e' : '#ef4444'; // Green for available, red for busy
  };

  const recommendationBadge = (score) => {
    if (score >= 1000) {
      return 'Top Match';
    }

    if (score >= 500) {
      return 'Strong Match';
    }

    return 'Nearby Option';
  };

  // ========== ERROR HANDLING ==========
  if (loadError) {
    return (
      <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg text-center border border-red-100">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Map Loading Error</h2>
          <p className="text-gray-600 mb-4">
            {loadError.message || 'Failed to load Google Maps. Please check your API key.'}
          </p>
          <p className="text-sm text-gray-500">
            Set <code className="bg-gray-100 px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your frontend environment before deployment.
          </p>
        </div>
      </div>
    );
  }

  // ========== LOADING STATE ==========
  if (!isLoaded || loading) {
    return (
      <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600 mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading map and providers...</p>
        </div>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return isLoaded ? (
    <div className="relative w-full h-[calc(100vh-80px)]">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Google Map Container */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={selectedWorker?.location || trackedWorkerId ? (workers.find(w => w._id === trackedWorkerId)?.location || userLocation || defaultCenter) : (userLocation || defaultCenter)}
        zoom={selectedWorker || trackedWorkerId ? 16 : 14}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry.fill',
              stylers: [{ color: '#d3e5fc' }]
            },
            {
              featureType: 'transit',
              elementType: 'geometry.fill',
              stylers: [{ color: '#e0e0e0' }]
            }
          ]
        }}
      >
        {/* Render Markers - Filtered to selected worker or all workers */}
        {(selectedWorker || trackedWorkerId ? 
          workers.filter(w => w._id === (selectedWorker?._id || trackedWorkerId)) 
          : workers
        ).map((worker) => (
          <Marker
            key={worker._id}
            position={worker.location}
            onClick={() => setSelectedWorker(worker)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: selectedWorker?._id === worker._id || trackedWorkerId === worker._id ? 16 : 12,
              fillColor: getMarkerColor(worker.available),
              fillOpacity: 0.9,
              strokeColor: selectedWorker?._id === worker._id || trackedWorkerId === worker._id ? '#fbbf24' : '#fff',
              strokeWeight: selectedWorker?._id === worker._id || trackedWorkerId === worker._id ? 3 : 2
            }}
            title={`${worker.name} - ${worker.available ? 'Available' : 'Busy'}`}
          />
        ))}

        {hasUserLocation && userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }}
            title="Your location"
          />
        )}

        {/* Info Window - Shows When Provider Marker is Clicked */}
        {selectedWorker && (
          <InfoWindow
            position={selectedWorker.location}
            onCloseClick={() => setSelectedWorker(null)}
            options={{
              maxWidth: 350,
              pixelOffset: new google.maps.Size(0, -40)
            }}
          >
            <div className="p-4 bg-white rounded-lg shadow-lg border-0">
              {/* Provider Info */}
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900">{selectedWorker.name}</h3>
                
                {/* Skills */}
                <div className="flex gap-1 flex-wrap mt-1">
                  {selectedWorker.skills.slice(0, 2).map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">{selectedWorker.rating}</span>
                  <span className="text-sm text-gray-500">({selectedWorker.reviews} reviews)</span>
                </div>

                {/* Distance & Recommendation */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Distance</p>
                    <p className="text-sm font-bold text-gray-900">{selectedWorker.distanceLabel}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">AI Match</p>
                    <p className="text-sm font-bold text-gray-900">{recommendationBadge(selectedWorker.recommendationScore)}</p>
                  </div>
                </div>

                {/* Status & Price */}
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      selectedWorker.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedWorker.available ? '🟢 Available' : '🔴 Busy'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rate</span>
                    <span className="font-bold text-gray-900">${selectedWorker.pricePerHour}/hr</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Phone</span>
                    <span className="text-sm font-mono text-brand-600">{selectedWorker.phone}</span>
                  </div>
                </div>
              </div>

              {/* Hire Button */}
              <button
                onClick={() => handleHire(selectedWorker)}
                disabled={!selectedWorker.available}
                className={`w-full mt-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedWorker.available
                    ? 'bg-brand-600 text-white hover:bg-brand-700 cursor-pointer'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {selectedWorker.available ? '📞 Book Now' : 'Currently Busy'}
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-8 left-6 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 max-w-xs z-10">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-600" />
          Map Legend
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white"></div>
            <span className="text-sm text-gray-700">Available Provider</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white"></div>
            <span className="text-sm text-gray-700">Busy Provider</span>
          </div>
          {hasUserLocation ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white"></div>
              <span className="text-sm text-gray-700">Your Location</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-blue-500 bg-blue-50"></div>
              <span className="text-sm text-gray-700">Default search area</span>
            </div>
          )}
        </div>
        {locationError && (
          <p className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            {locationError}
          </p>
        )}
      </div>

      {/* Provider Count */}
      <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-10">
        <p className="text-sm font-semibold text-gray-700">
          {workers.filter(w => w.available).length} of {workers.length} Available
        </p>
      </div>

      {/* Top Recommendations */}
      <div className="absolute top-6 left-6 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-10 w-[320px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-100px)] overflow-y-auto">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-brand-600" />
          {selectedWorker || trackedWorkerId ? 'Selected Worker' : 'Top AI Recommendations'}
        </h3>
        {selectedWorker && !trackedWorkerId && (
          <p className="mb-3 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
            ✨ Viewing this worker's live location on the map
          </p>
        )}
        {trackedWorkerId && (
          <p className="mb-3 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            📍 Tracking your hired worker's live location
          </p>
        )}
        <div className="space-y-3">
          {recommendedWorkers.map((worker, index) => {
            const isSelected = selectedWorker?._id === worker._id || trackedWorkerId === worker._id;
            return (
              <div 
                key={worker._id} 
                onClick={() => setSelectedWorker(worker)}
                className={`rounded-xl border-2 px-3 py-3 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-amber-400 bg-amber-50 shadow-md' 
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{worker.name}</p>
                    <p className="text-xs text-gray-500">{worker.distanceLabel} away</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${worker.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {worker.available ? 'Available' : 'Busy'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>⭐ {worker.rating.toFixed(1)}</span>
                  <span>${worker.pricePerHour}/hr</span>
                </div>
                {isSelected && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHire(worker);
                    }}
                    disabled={!worker.available}
                    className={`w-full mt-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                      worker.available
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    📞 Book Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {trackedWorkerId && selectedWorker && (
        <div className="absolute top-6 left-[352px] bg-blue-600 text-white rounded-2xl shadow-xl px-4 py-3 z-10 max-w-[calc(100vw-24rem)] hidden xl:block">
          <p className="text-sm font-bold">Tracking live location</p>
          <p className="text-xs text-blue-100">{selectedWorker.name} is highlighted on the map and updates in real time.</p>
        </div>
      )}

      {/* No Providers Message */}
      {workers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="bg-white p-8 rounded-2xl text-center">
            <MapPinOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No providers found</h3>
            <p className="text-sm text-gray-600 mt-2">Try adjusting your filters</p>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div>Loading map...</div>
  );
};

export default MapView;
