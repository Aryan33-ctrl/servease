import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { ShieldCheck, MapPin, Search } from 'lucide-react';
import Toast from '../components/Toast';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 80px)',
  borderRadius: '0px'
};

const defaultCenter = { lat: 37.7749, lng: -122.4194 };

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY" // Needs replacement
  });

  const [map, setMap] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [toast, setToast] = useState(null);
  const socketRef = useRef();

  useEffect(() => {
    // 1. Fetch initial workers using interceptor
    api.get(`/api/workers?lat=${defaultCenter.lat}&lng=${defaultCenter.lng}`)
      .then(res => setWorkers(res.data.data || res.data))
      .catch(err => {
        console.error(err);
        setToast({ message: "Failed to fetch map data", type: "error" });
      });

    // 2. Connect WebSockets for Real-time location
    const token = localStorage.getItem('token');
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'] 
    });
    
    socketRef.current.on('worker-location-updated', (data) => {
      setWorkers(prevWorkers => 
        prevWorkers.map(w => 
          w._id === data.workerId 
            ? { ...w, location: data.location } 
            : w
        )
      );
    });

    return () => socketRef.current.disconnect();
  }, []);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const handleHire = (name) => {
    setToast({ message: `Sent immediate booking request to ${name}!`, type: 'success' });
    setSelectedWorker(null);
  };

  // If map fails to load (e.g. invalid API key), display a gorgeous premium fallback
  if (loadError || (!isLoaded && workers.length >= 0)) {
    return (
      <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center bg-gray-50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-200 rounded-full blur-[120px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-xl shadow-brand-500/5 max-w-lg text-center border border-white z-10 mx-4">
          <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-brand-600 animate-bounce" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Interactive Map Active</h2>
          <p className="text-gray-600 font-medium leading-relaxed mb-8">
            The Google Maps module requires a valid API key. We have {workers.length} professionals waiting near you right now.
          </p>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-2">
            <code className="text-sm font-bold text-gray-500 break-all px-2">YOUR_GOOGLE_MAPS_API_KEY</code>
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Update key in MapView.jsx</p>
        </div>
      </div>
    );
  }

  return isLoaded ? (
    <div className="relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { "featureType": "poi", "stylers": [{ "visibility": "off" }] }
          ]
        }}
      >
        {workers.map((worker) => (
          <Marker
            key={worker._id}
            position={{
              lat: worker.location.coordinates[1],
              lng: worker.location.coordinates[0]
            }}
            onClick={() => setSelectedWorker(worker)}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" color="%2314b8a6" fill="%2314b8a6"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        ))}

        {selectedWorker && (
          <InfoWindow
            position={{
              lat: selectedWorker.location.coordinates[1],
              lng: selectedWorker.location.coordinates[0]
            }}
            onCloseClick={() => setSelectedWorker(null)}
          >
            <div className="p-3 min-w-[220px]">
              <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                {selectedWorker.name}
                <ShieldCheck className="w-4 h-4 text-brand-500" />
              </h3>
              <p className="text-brand-600 font-extrabold text-sm mb-3 mt-1">${selectedWorker.pricePerHour} / hour</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {selectedWorker.skills.slice(0, 2).map((skill, i) => (
                  <span key={i} className="text-[11px] font-bold bg-gray-100 text-gray-700 rounded-md px-2 py-1 uppercase">{skill}</span>
                ))}
              </div>
              <button 
                className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2.5 text-sm font-bold transition-all shadow-md hover:-translate-y-0.5"
                onClick={() => handleHire(selectedWorker.name)}
              >
                Hire Instantly
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl shadow-brand-500/10 border border-white flex items-center gap-4 z-10 max-w-md w-max">
        <div className="h-3 w-3 rounded-full bg-brand-500 animate-pulse shadow-lg shadow-brand-500/50"></div>
        <span className="font-extrabold text-gray-900 tracking-tight">Live Dispatch Map</span>
        <div className="h-4 w-px bg-gray-200 mx-1"></div>
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
          <Search className="w-3.5 h-3.5" />
          {workers.length} nearby
        </div>
      </div>
    </div>
  ) : null;
};

export default React.memo(MapView);
