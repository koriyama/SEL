// src/pages/ChangePassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { markPasswordChanged } from '../lib/lmsApi';

const ChangePassword = () => {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const {
    updatePassword,
    refreshProfile,
    role,
    mustChangePassword,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password1.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password1 !== password2) {
      setError('The two passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password1);
      try {
        await markPasswordChanged();
      } catch (err) {
        console.warn('mark_password_changed failed:', err);
      }
      await refreshProfile();
      if (role === 'student') {
        navigate('/student', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {mustChangePassword ? 'Set a new password' : 'Change password'}
          </h2>
          {mustChangePassword && (
            <p className="mt-2 text-center text-sm text-gray-600">
              This is your first login. Please choose a new password that you
              will remember.
            </p>
          )}
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save new password'}
          </button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;