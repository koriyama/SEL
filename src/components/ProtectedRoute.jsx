// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleSatisfies(userRole, required) {
  if (!required) return true;
  if (required === 'admin') return userRole === 'admin';
  if (required === 'teacher') return userRole === 'teacher' || userRole === 'admin';
  if (required === 'student') return userRole === 'student';
  return false;
}

function LoadingScreen() {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Loading your account...</p>
      </div>
    </div>
  );
}

// Requires a logged-in user, no role check and no password check.
// Used for the /change-password page itself.
export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Default export: full protection.
// Pass requiredRole="teacher" | "student" | "admin" to restrict.
export default function ProtectedRoute({ requiredRole }) {
  const { user, role, mustChangePassword, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;

  if (!roleSatisfies(role, requiredRole)) {
    if (role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}