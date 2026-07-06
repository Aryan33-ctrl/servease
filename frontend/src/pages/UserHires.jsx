import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Star, MessageSquare, CheckCircle2, Clock, User, DollarSign, MapPin } from 'lucide-react';
import Toast from '../components/Toast';

const UserHires = () => {
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [ratingModal, setRatingModal] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'worker') {
      navigate('/worker-dashboard');
      return;
    }

    fetchUserHires();
  }, [user, navigate]);

  const fetchUserHires = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/workers/user-hires');
      setHires(res.data.data);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to load hire history", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRateWorker = async (hireId, rating, review) => {
    try {
      await api.post('/api/workers/rate', { hireId, rating, review });
      setToast({ message: 'Rating submitted successfully!', type: 'success' });
      setRatingModal(null);
      fetchUserHires(); // Refresh the list
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to submit rating', type: 'error' });
    }
  };

  const RatingModal = ({ hire, onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Rate Your Experience</h3>
          <div className="mb-4">
            <p className="text-gray-600 mb-2">How would you rate {hire.worker?.name}?</p>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="text-2xl"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Leave a review (optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell others about your experience..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(hire._id, rating, review)}
              className="flex-1 px-4 py-3 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50/50 p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200 rounded-full blur-[120px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {ratingModal && (
        <RatingModal
          hire={ratingModal}
          onClose={() => setRatingModal(null)}
          onSubmit={handleRateWorker}
        />
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-white px-6 py-5 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
            My Hire History
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Track your service requests and rate completed work.
          </p>
        </div>

        <div className="space-y-6">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-xl w-20"></div>
                </div>
              </div>
            ))
          ) : hires.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No hire requests yet</h3>
              <p className="text-gray-500 font-medium">Your hire history will appear here once you book services.</p>
            </div>
          ) : (
            hires.map((hire) => (
              <div key={hire._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{hire.worker?.name}</h3>
                      <p className="text-gray-500 text-sm">{hire.worker?.skills?.join(', ')}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(hire.status)}`}>
                      {hire.status.charAt(0).toUpperCase() + hire.status.slice(1)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(hire.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {hire.message && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">"{hire.message}"</p>
                  </div>
                )}

                {hire.status === 'accepted' && (
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                    <button
                      onClick={() => navigate(`/map?workerId=${hire.worker?._id}&hireId=${hire._id}`)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
                    >
                      <MapPin className="h-4 w-4" />
                      Track Live Location
                    </button>
                    <button
                      onClick={() => setRatingModal(hire)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
                    >
                      <Star className="h-4 w-4" />
                      Rate & Complete
                    </button>
                  </div>
                )}

                {hire.status === 'completed' && hire.userRating && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-green-800">Completed & Rated</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= hire.userRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">{hire.userRating}/5 stars</span>
                    </div>
                    {hire.userReview && (
                      <p className="text-sm text-gray-600 italic">"{hire.userReview}"</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHires;