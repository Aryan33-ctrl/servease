import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, LogOut, Map as MapIcon, LayoutDashboard, UserPlus, LogIn, Settings } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-gradient-to-br from-brand-400 to-brand-600 p-2.5 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-brand-500/30 shadow-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl text-gray-900 tracking-tight">
                Serv<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-teal-400">Ease</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  to={user.role === 'worker' ? '/worker-dashboard' : '/dashboard'} 
                  className={`flex items-center gap-2 font-semibold transition-all duration-300 px-3 py-2 rounded-lg ${isActive(user.role === 'worker' ? '/worker-dashboard' : '/dashboard') ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:text-brand-600 hover:bg-gray-50'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                {user.role === 'worker' && (
                  <Link 
                    to="/worker-settings" 
                    className={`flex items-center gap-2 font-semibold transition-all duration-300 px-3 py-2 rounded-lg ${isActive('/worker-settings') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'}`}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                )}
                {user.role !== 'worker' && (
                  <>
                    <Link 
                      to="/map" 
                      className={`flex items-center gap-2 font-semibold transition-all duration-300 px-3 py-2 rounded-lg ${isActive('/map') ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:text-brand-600 hover:bg-gray-50'}`}
                    >
                      <MapIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Live Map</span>
                    </Link>
                    <Link 
                      to="/my-hires" 
                      className={`flex items-center gap-2 font-semibold transition-all duration-300 px-3 py-2 rounded-lg ${isActive('/my-hires') ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:text-brand-600 hover:bg-gray-50'}`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="hidden sm:inline">My Hires</span>
                    </Link>
                  </>
                )}
                
                <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                
                <div className="hidden sm:flex items-center gap-3 bg-gray-50 pl-3 pr-4 py-1.5 rounded-full border border-gray-100">
                  <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-uppercase">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 px-4 py-2 rounded-xl font-semibold transition-all duration-300 group"
                >
                  <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="flex items-center gap-2 text-gray-600 hover:text-brand-600 font-semibold transition-colors px-3 py-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link 
                  to="/login" 
                  className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-6 py-2.5 rounded-xl font-bold shadow-xl shadow-brand-500/25 transition-all hover:-translate-y-1"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
