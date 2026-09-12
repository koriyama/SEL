// src/pages/TeacherClassDetail.jsx
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getClassById,
  listClassRoster,
  removeStudentFromClass,
  resetStudentPassword,
} from '../lib/lmsApi';
import PasswordRevealModal from '../components/PasswordRevealModal';

const TeacherClassDetail = () => {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState({
    open: false,
    studentName: '',
    password: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([getClassById(id), listClassRoster(id)]);
      setCls(c);
      setRoster(r);
    } catch (err) {
      console.error(err);
      toast.error('Could not load class.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRemove = async (studentId, displayName) => {
    if (
      !window.confirm(
        `Remove ${displayName} from this class? Their account is kept.`
      )
    ) {
      return;
    }
    try {
      await removeStudentFromClass(id, studentId);
      toast.success('Removed.');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not remove student.');
    }
  };

  const handleReset = async (studentId, displayName) => {
    if (
      !window.confirm(
        `Reset password for ${displayName}? They will be given a temporary password.`
      )
    ) {
      return;
    }
    try {
      const result = await resetStudentPassword(studentId);
      const temp = result?.temp_password;
      if (temp) {
        setReveal({
          open: true,
          studentName: displayName,
          password: temp,
        });
      } else {
        toast.success('Password reset.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not reset password.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="min-h-screen p-8 text-center">
        <p className="text-gray-600">Class not found.</p>
        <Link
          to="/classes"
          className="text-indigo-600 underline mt-4 inline-block"
        >
          Back to classes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              to="/classes"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              ← Back to classes
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{cls.name}</h1>
            {cls.description && (
              <p className="text-sm text-gray-600 mt-1">{cls.description}</p>
            )}
          </div>
          <Link
            to={`/classes/${id}/import`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              color: '#000000',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '6px',
              border: '1px solid #9ca3af',
              textDecoration: 'none',
            }}
          >
            Import students (CSV)
          </Link>
        </div>

        <section className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Roster ({roster.length})
            </h2>
          </div>
          {roster.length === 0 ? (
            <p className="p-6 text-gray-500">
              No students yet. Import a CSV to add them.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {roster.map((row) => {
                const s = row.student;
                if (!s) return null;
                return (
                  <li
                    key={row.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {s.display_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {s.institutional_id}
                        {s.must_change_password
                          ? ' · must change password'
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleReset(s.id, s.display_name)}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(s.id, s.display_name)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <PasswordRevealModal
        open={reveal.open}
        studentName={reveal.studentName}
        password={reveal.password}
        onClose={() =>
          setReveal({ open: false, studentName: '', password: '' })
        }
      />
    </div>
  );
};

export default TeacherClassDetail;