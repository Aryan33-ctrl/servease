import axios from 'axios';

export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5001';
  }

  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001';
};

export const isRealtimeEnabled = () => import.meta.env.DEV || import.meta.env.VITE_ENABLE_SOCKETS === 'true';

const DEFAULT_BASE_URL = getApiBaseUrl();
let activeBaseURL = DEFAULT_BASE_URL;

const isLocalDev = import.meta.env.DEV && typeof window !== 'undefined';

const getLocalBackendCandidates = () => {
  try {
    const parsed = new URL(DEFAULT_BASE_URL);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (!isLocalHost) {
      return [];
    }

    const startPort = Number(parsed.port) || 5001;
    const maxAttempts = 6;
    const candidates = [];

    for (let i = 0; i < maxAttempts; i += 1) {
      candidates.push(`${parsed.protocol}//${parsed.hostname}:${startPort + i}`);
    }

    return candidates;
  } catch {
    return [];
  }
};

const findReachableLocalBackend = async () => {
  const candidates = getLocalBackendCandidates();

  for (const candidate of candidates) {
    try {
      await axios.get(`${candidate}/`, { timeout: 1200 });
      return candidate;
    } catch {
      // Try the next candidate port.
    }
  }

  return null;
};

// Create a configured axios instance
const api = axios.create({
  baseURL: activeBaseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // For cookie-based auth if needed in future
});

// Request Interceptor: Automatically attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Globally handle 401 Unauthorized errors (expired token, etc)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If local backend moved from default port (e.g. 5001 -> 5002), discover and retry once.
    if (isLocalDev && !error.response && error.config && !error.config._localPortRetry) {
      const discoveredBaseURL = await findReachableLocalBackend();

      if (discoveredBaseURL && discoveredBaseURL !== activeBaseURL) {
        activeBaseURL = discoveredBaseURL;
        api.defaults.baseURL = activeBaseURL;

        return api.request({
          ...error.config,
          baseURL: activeBaseURL,
          _localPortRetry: true
        });
      }
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Check if we're not already on auth routes to avoid infinite redirects
      const authRoutes = ['/login', '/verify-email', '/set-password', '/forgot-password', '/reset-password'];
      const isAuthRoute = authRoutes.some(route => window.location.pathname.includes(route));
      
      if (!isAuthRoute) {
        console.warn('Token expired or unauthorized, logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login with a message
        window.location.href = '/login?expired=true';
      }
    }
    
    // Handle 403 Forbidden - insufficient permissions
    if (error.response?.status === 403) {
      console.warn('Access forbidden - insufficient permissions');
    }
    
    // Handle 500 Server errors
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
