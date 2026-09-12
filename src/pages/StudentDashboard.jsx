// src/pages/StudentDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { listMyClassesAsStudent } from '../lib/lmsApi';

const StudentDashboard = () => {
  const { displayName, institutionalId, logout, user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyClassesAsStudent();
        if (!cancelled) setClasses(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error('Could not load your classes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/student-login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My courses</h1>
            <p className="text-sm text-gray-500">
              Signed in as {displayName}
              {institutionalId ? ` (${institutionalId})` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loading ? (
          <p className="text-gray-500">Loading your classes…</p>
        ) : classes.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-gray-600">
            You are not yet enrolled in any class. Please ask your teacher.
          </div>
        ) : (
          <ul className="space-y-3">
            {classes.map((c) => (
              <li key={c.id} className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900">{c.name}</h2>
                {c.description && (
                  <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {c.start_date ? `Starts ${c.start_date}` : ''}
                  {c.start_date && c.end_date ? ' · ' : ''}
                  {c.end_date ? `Ends ${c.end_date}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;