import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Map, Star, DollarSign, Zap, Clock, ShieldCheck, CheckCircle2, User, Bell, Check, X, MessageSquare, Settings } from 'lucide-react';
import Toast from '../components/Toast';
import io from 'socket.io-client';
import { getApiBaseUrl, isRealtimeEnabled } from '../utils/api';

const WorkerDashboard = () => {
  const [hireRequests, setHireRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [socket, setSocket] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
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

    fetchHireRequests();

    let newSocket = null;

    if (realtimeEnabled) {
      // Set up socket connection
      const token = localStorage.getItem('token');
      newSocket = io(getApiBaseUrl(), {
        auth: { token }
      });
      setSocket(newSocket);

      newSocket.on('hireRequest', (data) => {
        setToast({ message: `New hire request from ${data.user.name}!`, type: 'info' });
        fetchHireRequests(); // Refresh the list
      });
    }

    const refreshTimer = setInterval(() => {
      fetchHireRequests();
    }, 20000);

    return () => {
      clearInterval(refreshTimer);
      if (newSocket) newSocket.disconnect();
    };
  }, [user, navigate]);

  const fetchHireRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/workers/hires');
      setHireRequests(res.data.data);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load hire requests", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleHireResponse = async (hireId, status) => {
    try {
      if (socket) {
        socket.emit('hireResponse', { hireId, status });
      }
      setToast({ message: `Hire request ${status}!`, type: 'success' });
      fetchHireRequests(); // Refresh the list
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to respond to hire request', type: 'error' });
    }
  };

  const SkeletonRequest = () => (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-200"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded-xl w-20"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-20"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50/50 p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-200 rounded-full blur-[120px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-white px-6 py-5 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
              Welcome back, <span className="text-green-600">{user?.name?.split(' ')[0] || 'Worker'}</span>! 👷‍♂️
            </h1>
            <p className="text-gray-500 mt-2 font-medium text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-500" />
              Manage your hire requests and stay connected with clients.
            </p>
          </div>
          <Link 
            to="/worker-settings" 
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50/80 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Hire Requests</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Real-time notifications enabled
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              [...Array(3)].map((_, i) => <SkeletonRequest key={i} />)
            ) : hireRequests.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No hire requests yet</h3>
                <p className="text-gray-500 font-medium">When clients hire you, requests will appear here.</p>
              </div>
            ) : (
              hireRequests.map((hire) => (
                <div key={hire._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{hire.user.name}</h3>
                        <p className="text-gray-500 text-sm">{hire.user.email}</p>
                        <p className="text-gray-600 text-sm mt-1">{hire.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(hire.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        hire.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        hire.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {hire.status.charAt(0).toUpperCase() + hire.status.slice(1)}
                      </span>

                      {hire.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleHireResponse(hire._id, 'accepted')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleHireResponse(hire._id, 'rejected')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;