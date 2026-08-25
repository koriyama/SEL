// src/pages/GoRedirect.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonBySlug } from '../lib/api';

export default function GoRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function redirect() {
      try {
        const lesson = await getLessonBySlug(slug);
        if (lesson) {
          navigate(`/lesson/${slug}`, { replace: true });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Redirect error:', err);
        setError(true);
      }
    }
    redirect();
  }, [slug, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-2">Link not found</h2>
          <p className="text-gray-600">This lesson may have been removed or is not published.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}