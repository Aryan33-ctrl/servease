import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import EmailVerification from './pages/EmailVerification';
import SetPassword from './pages/SetPassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerSettings from './pages/WorkerSettings';
import UserHires from './pages/UserHires';
import MapView from './pages/MapView';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} requiredRole="client" />} />
            <Route path="/my-hires" element={<ProtectedRoute element={<UserHires />} requiredRole="client" />} />
            <Route path="/map" element={<ProtectedRoute element={<MapView />} />} />
            
            {/* Worker Protected Routes */}
            <Route path="/worker-dashboard" element={<ProtectedRoute element={<WorkerDashboard />} requiredRole="worker" />} />
            <Route path="/worker-settings" element={<ProtectedRoute element={<WorkerSettings />} requiredRole="worker" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
