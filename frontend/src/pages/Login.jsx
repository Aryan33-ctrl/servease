import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        // Login flow
        const res = await api.post('/api/auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        login(res.data.data.user, res.data.data.token);
        navigate('/dashboard');
      } else {
        // Signup flow - send OTP first
        const res = await api.post('/api/auth/send-otp', {
          name: formData.name,
          email: formData.email,
          role: formData.role === 'user' ? 'client' : 'worker'
        });
        // Redirect to email verification page
        navigate('/verify-email', { 
          state: { 
            email: formData.email,
            name: formData.name,
            role: formData.role
          } 
        });
      }
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.errors) {
        setError(responseData.errors.map((e) => e.msg).join(', '));
      } else if (typeof responseData === 'string') {
        setError(responseData);
      } else if (responseData?.message) {
        setError(responseData.message);
      } else if (err.request) {
        setError('Cannot reach server. Please make sure the backend is running.');
      } else {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col md:flex-row bg-gray-50/50">
      
      {/* Left side Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative z-10 w-full">
        <div className="max-w-md w-full">
          <div className="text-left mb-10">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="mt-3 text-lg text-gray-600 font-medium">
              {isLogin ? "Enter your details to access your dashboard." : "Join our network of professionals today."}
            </p>
          </div>

          {error && (
             <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-semibold border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2">
               <div className="min-w-fit mt-0.5">⚠️</div>
               {error}
             </div>
          )}

          {success && (
            <div className="mb-8 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-100 flex items-start gap-3 animate-in slide-in-from-top-2">
              <div className="min-w-fit mt-0.5">✅</div>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                    </div>
                    <input name="name" type="text" required className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-gray-900 shadow-sm" placeholder="John Doe" value={formData.name} onChange={handleInputChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">I am a</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.role === 'user' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="user"
                        checked={formData.role === 'user'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Client</div>
                        <div className="text-sm text-gray-500">I need services</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.role === 'worker' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="worker"
                        checked={formData.role === 'worker'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Worker</div>
                        <div className="text-sm text-gray-500">I provide services</div>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                </div>
                <input name="email" type="email" required className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-gray-900 shadow-sm" placeholder="you@example.com" value={formData.email} onChange={handleInputChange} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Password</label>
                {isLogin && <Link to="/forgot-password" className="text-sm font-bold text-brand-600 hover:text-brand-700">Forgot password?</Link>}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                </div>
                <input name="password" type="password" required className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-gray-900 shadow-sm" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-4 px-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 mt-8">
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>{isLogin ? 'Sign In to Account' : 'Create Free Account'} <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </form>
          
          <div className="mt-10 pt-8 border-t border-gray-100 text-center text-gray-600 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); setFormData({name:'', email:'', password:'', role:'user'}) }} className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
              {isLogin ? 'Sign up for free' : 'Log in entirely'}
            </button>
          </div>
        </div>
      </div>

      {/* Right side Graphic */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gray-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-teal-900 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay z-0"></div>
        <div className="absolute w-[800px] h-[800px] bg-brand-400 rounded-full blur-[120px] opacity-20 -right-1/4 top-1/4 mix-blend-screen pointer-events-none"></div>

        <div className="z-10 text-center text-white px-12 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl inline-block mb-8 border border-white/10 shadow-2xl">
            <ShieldCheck className="h-16 w-16 text-brand-300" />
          </div>
          <h3 className="text-4xl font-extrabold mb-6 leading-tight">Secure & Reliable Worker Connections</h3>
          <p className="text-lg text-brand-100 font-medium leading-relaxed">
            Join thousands of professionals and clients building the future of local, instantaneous service coordination. High-performance matching engine inside.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
