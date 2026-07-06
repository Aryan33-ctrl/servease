import React, { useEffect, useState, useContext, useRef } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MapPin, Zap, Clock, Navigation, Power } from 'lucide-react';
import Toast from '../components/Toast';
import io from 'socket.io-client';
import { getApiBaseUrl, isRealtimeEnabled } from '../utils/api';

const WorkerSettings = () => {
  const [available, setAvailable] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [socket, setSocket] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const realtimeEnabled = isRealtimeEnabled();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'worker') {
      navigate('/dashboard');
      return;
    }

    // Setup socket connection
    const token = localStorage.getItem('token');
    let newSocket = null;

    if (realtimeEnabled) {
      newSocket = io(getApiBaseUrl(), {
        auth: { token }
      });

      // Socket connection status logging
      newSocket.on('connect', () => {
        console.log('[Worker] ✅ Socket connected. Worker ID:', user.id);
        setSocketConnected(true);
        setToast({ message: '✅ Connected to live tracking server', type: 'success' });
      });

      newSocket.on('disconnect', () => {
        console.log('[Worker] ❌ Socket disconnected');
        setSocketConnected(false);
        setIsLiveTracking(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('[Worker] 🔴 Socket connection error:', err.message);
        setToast({ message: `Connection error: ${err.message}`, type: 'error' });
      });

      setSocket(newSocket);
    } else {
      setSocketConnected(false);
      setSocket(null);
    }

    // Get user's current location once, then auto-start live tracking
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('[Worker] 📍 Initial location:', coords);
          setLocation(coords);
          // Auto-start live tracking after getting initial location
          setTimeout(() => startLiveTracking(newSocket, coords), 500);
        },
        (error) => {
          console.error('[Worker] ❌ Geolocation error:', error.code, error.message);
          setLocationError('Location access denied. Please enable location services.');
          setToast({ message: 'Please enable location access to use live tracking', type: 'error' });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log('[Worker] Cleared geolocation watch');
      }
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user, navigate]);

  const handleAvailabilityToggle = async () => {
    setLoading(true);
    try {
      const payload = { available: !available };
      if (location) {
        payload.lat = location.lat;
        payload.lng = location.lng;
      }

      await api.put('/api/workers/availability', payload);
      setAvailable(!available);
      setLastUpdate(new Date());
      
      // Broadcast availability change via socket
      if (socket) {
        socket.emit('worker-status-changed', {
          available: !available,
          lat: location?.lat,
          lng: location?.lng
        });
      }

      setToast({
        message: `You are now ${!available ? 'available' : 'unavailable'} for bookings`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to update availability', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleShareLocation = async () => {
    setLoading(true);
    try {
      if (!location) {
        setLocationError('Please enable location access');
        return;
      }

      // Update location on server
      await api.put('/api/workers/availability', {
        available,
        lat: location.lat,
        lng: location.lng
      });

      // Broadcast via socket
      if (socket) {
        socket.emit('update-location', {
          lat: location.lat,
          lng: location.lng
        });
      }

      setLastUpdate(new Date());
      setToast({
        message: 'Location shared with all clients!',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to share location', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const startLiveTracking = (socketInstance, initialLocation) => {
    if (watchIdRef.current) {
      console.log('[Worker] Live tracking already running');
      return;
    }

    console.log('[Worker] 🚀 Starting live tracking from', initialLocation);
    setIsLiveTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('[Worker] 📍 Location update:', newLocation, '| Accuracy:', position.coords.accuracy.toFixed(0) + 'm');
        setLocation(newLocation);
        setLastUpdate(new Date());

        // Emit location update to server via socket
        await api.put('/api/workers/availability', {
          available,
          lat: newLocation.lat,
          lng: newLocation.lng
        });

        if (socketInstance && socketInstance.connected) {
          console.log('[Worker] 📡 Emitting update-location to server');
          socketInstance.emit('update-location', {
            lat: newLocation.lat,
            lng: newLocation.lng
          });
        } else {
          console.warn('[Worker] ⚠️ Socket not connected, cannot emit location');
        }
      },
      (error) => {
        console.error('[Worker] ❌ Geolocation watch error:', error.code, error.message);
        setLocationError('Live tracking paused. Ensure location access is enabled.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleStartLiveTracking = () => {
    if (!location) {
      setToast({ message: 'Please enable location access first', type: 'error' });
      return;
    }
    startLiveTracking(socket, location);
    setToast({ message: '🟢 Live tracking started! Your location updates in real-time.', type: 'success' });
  };

  const handleStopLiveTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLiveTracking(false);
      console.log('[Worker] ⏹️ Live tracking stopped');
      setToast({ message: 'Live tracking stopped', type: 'info' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50/50 p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200 rounded-full blur-[120px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="bg-white px-6 py-5 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
            Availability & Map Settings
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Control your availability and real-time location visibility.
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Power className="w-6 h-6 text-purple-600" />
                Availability Status
              </h2>
              <p className="text-gray-500 mt-1">Show or hide yourself from the live map</p>
            </div>
            <button
              onClick={handleAvailabilityToggle}
              disabled={loading}
              className={`px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 ${
                available
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
            >
              {available ? '🟢 Available' : '⚪ Unavailable'}
            </button>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <p className="text-sm text-purple-900 font-medium">
              {available
                ? '✓ You are visible to clients on the live map'
                : '✗ You are hidden from the live map. Clients cannot see you or book you.'}
            </p>
          </div>
        </div>

        {/* Location Sharing */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-blue-600" />
            Location Sharing
          </h2>

          {/* Socket Status */}
          <div className={`mb-6 p-4 rounded-2xl border ${socketConnected ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <p className={`text-sm font-medium ${socketConnected ? 'text-green-900' : 'text-red-900'}`}>
              {socketConnected ? '✅ Server Connection: Active' : '❌ Server Connection: Offline'}
            </p>
          </div>

          {/* Live Tracking Status */}
          {isLiveTracking && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 animate-pulse">
              <p className="text-sm text-green-900 font-bold">
                🟢 Live Tracking: ACTIVE - Your location updates every 5 seconds
              </p>
            </div>
          )}

          {locationError && (
            <div className="mb-6 p-4 bg-orange-50 text-orange-700 rounded-2xl text-sm font-medium border border-orange-100">
              ⚠️ {locationError}
            </div>
          )}

          {location && (
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-sm text-blue-900">
                <strong>Current Location:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
              {lastUpdate && (
                <p className="text-xs text-blue-700 mt-2">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleShareLocation}
              disabled={loading || !location}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Share Current Location (One-Time)
            </button>

            {!isLiveTracking ? (
              <button
                onClick={handleStartLiveTracking}
                disabled={loading || !location}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5" />
                Start Live Tracking
              </button>
            ) : (
              <button
                onClick={handleStopLiveTracking}
                className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Power className="w-5 h-5" />
                Stop Live Tracking
              </button>
            )}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-sm text-gray-600">
              <strong>💡 Tip:</strong> Enable live tracking to continuously update your location as you move. Clients on the map will see you in real-time.
            </p>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl border border-purple-100 shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Status Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Current Status</p>
              <p className="text-xl font-bold text-gray-900">
                {available ? '🟢 Online' : '⚪ Offline'}
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Map Visibility</p>
              <p className="text-xl font-bold text-gray-900">
                {available && location ? '📍 Visible' : '🚫 Hidden'}
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Live Tracking</p>
              <p className="text-xl font-bold text-gray-900">
                {isLiveTracking ? '🟢 Active' : '⚪ Inactive'}
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Server</p>
              <p className="text-xl font-bold text-gray-900">
                {socketConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerSettings;