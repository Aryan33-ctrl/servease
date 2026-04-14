import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Map, Star, DollarSign, Zap, Clock, ShieldCheck, CheckCircle2, Search, Filter, RefreshCw, X } from 'lucide-react';
import Toast from '../components/Toast';
import io from 'socket.io-client';

const SkeletonWorker = () => (
  <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
    <div className="flex items-center gap-4 w-full md:w-auto">
      <div className="h-16 w-16 rounded-full bg-gray-200 shrink-0"></div>
      <div className="space-y-3 w-full">
        <div className="h-5 bg-gray-200 rounded-md w-32"></div>
        <div className="flex gap-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
      <div className="h-10 bg-gray-200 rounded-md w-16"></div>
      <div className="h-10 bg-gray-200 rounded-md w-16"></div>
      <div className="h-10 bg-gray-900/10 rounded-xl w-32 hidden md:block"></div>
    </div>
  </div>
);

const Dashboard = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('aiScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [location, setLocation] = useState({ lat: 37.7749, lng: -122.4194 });
  const [locationError, setLocationError] = useState('');
  const [socket, setSocket] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Redirect workers to their dashboard
    if (user.role === 'worker') {
      navigate('/worker-dashboard');
      return;
    }

    fetchWorkers();

    // Set up socket connection
    const token = localStorage.getItem('token');
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('hireUpdate', (data) => {
      setToast({ message: `Hire request ${data.status} by ${data.workerName}!`, type: data.status === 'accepted' ? 'success' : 'info' });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocation(coords);
          fetchWorkers(searchQuery, coords);
        },
        () => setLocationError('Location permission denied. Using default search area.'),
        { timeout: 10000 }
      );
    }

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [user, navigate]);

  const fetchWorkers = async (query = searchQuery, coords = location) => {
    setLoading(true);
    try {
      const params = {
        lat: coords.lat,
        lng: coords.lng,
        search: query?.trim() || undefined,
        minRating: minRating || undefined,
        maxPrice: maxPrice || undefined,
        available: onlyAvailable ? true : undefined,
        sortBy,
        sortOrder
      };

      const res = await api.get('/api/workers', { params });
      setWorkers(res.data.data);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load dynamic worker data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    fetchWorkers(searchQuery);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setMinRating('');
    setMaxPrice('');
    setOnlyAvailable(false);
    setSortBy('aiScore');
    setSortOrder('desc');
    fetchWorkers('', location);
  };

  const handleHire = async (workerId, workerName) => {
    try {
      await api.post('/api/workers/hire', { workerId, message: 'Hiring request from dashboard' });
      setToast({ message: `Hiring request sent successfully to ${workerName}!`, type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to send hire request', type: 'error' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50/50 p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-200 rounded-full blur-[120px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div className="bg-white px-6 py-5 rounded-3xl shadow-sm border border-gray-100 flex-1 w-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                Welcome back, <span className="text-brand-600">{user?.name?.split(' ')[0] || 'User'}</span>! 👋
              </h1>
              <p className="text-gray-500 mt-2 font-medium text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" />
                Here's your real-time overview of available professionals.
              </p>

              <form onSubmit={handleSearchSubmit} className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by skill, job type, or worker name"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition"
                  >
                    <Filter className="h-4 w-4" />
                    Search
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Rating</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={minRating}
                      onChange={(e) => setMinRating(e.target.value)}
                      placeholder="4.0"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                    />
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Price</label>
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="75"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                    />
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col justify-between">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sort by</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                    >
                      <option value="aiScore">Best match</option>
                      <option value="distance">Closest</option>
                      <option value="rating">Top rated</option>
                      <option value="pricePerHour">Cheapest</option>
                    </select>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col justify-between">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Availability</label>
                    <label className="inline-flex items-center gap-2 mt-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={onlyAvailable}
                        onChange={(e) => setOnlyAvailable(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      Only available
                    </label>
                    <label className="inline-flex items-center gap-2 mt-4 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={sortOrder === 'asc'}
                        onChange={(e) => setSortOrder(e.target.checked ? 'asc' : 'desc')}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      Ascending prices/score
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition"
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </button>
                  {locationError ? (
                    <p className="text-sm text-orange-600 font-medium flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {locationError}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Showing results near your location.</p>
                  )}
                </div>
              </form>
            </div>
          </div>
          
          <Link to="/map" className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 w-full md:w-auto justify-center group flex-shrink-0">
            <Map className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            Open Live Map
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50/80 gap-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-brand-100 rounded-lg text-brand-600">
                  <Zap className="h-5 w-5" />
               </div>
               <h2 className="text-xl font-bold text-gray-900">AI Recommended Matches</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-brand-500" />
              Ranked dynamically by Distance & Rating
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {loading ? (
              [...Array(3)].map((_, i) => <SkeletonWorker key={i} />)
            ) : workers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <ShieldCheck className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No professionals nearby</h3>
                <p className="text-gray-500 font-medium">Try expanding your search or check back later.</p>
              </div>
            ) : (
              workers.map((worker) => (
                <div key={worker._id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-brand-50/50 transition-colors duration-300 group">
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 flex items-center justify-center font-extrabold text-2xl uppercase shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        {worker.name}
                        <ShieldCheck className="w-4 h-4 text-brand-500" />
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {worker.skills?.map((skill, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-bold border border-gray-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-gray-900 font-extrabold text-lg">
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                        {worker.rating?.toFixed(1) || 'N/A'}
                      </div>
                      <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">Rating</span>
                    </div>
                    
                    <div className="w-px h-10 bg-gray-200 hidden sm:block"></div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center text-gray-900 font-extrabold text-lg">
                        <DollarSign className="h-5 w-5 text-brand-500" />
                        {worker.pricePerHour}
                      </div>
                      <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">Hourly</span>
                    </div>

                    <div className="w-px h-10 bg-gray-200 hidden sm:block"></div>

                    <div className="flex flex-col items-end min-w-[70px]">
                      <span className="font-extrabold text-gray-900 text-lg">{Math.round(worker.distance || 0)}m</span>
                      <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">Distance</span>
                    </div>
                    
                    <button 
                      onClick={() => handleHire(worker._id, worker.name)}
                      className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 hover:shadow-xl hover:-translate-y-0.5 hidden md:block"
                    >
                      Hire Now
                    </button>
                  </div>
                  <button 
                    onClick={() => handleHire(worker._id, worker.name)}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold md:hidden shadow-lg shadow-brand-500/20"
                  >
                    Hire Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
