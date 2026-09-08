// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentLesson from './pages/StudentLesson';
import GoRedirect from './pages/GoRedirect';

// Protected pages
import TeacherDashboard from './pages/TeacherDashboard';
import LessonBuilder from './pages/LessonBuilder';
import LessonResults from './pages/LessonResults';
import LessonLibrary from './pages/LessonLibrary';
import PublicLessonLibrary from './pages/PublicLessonLibrary';

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/lesson/:slug" element={<StudentLesson />} />
          <Route path="/go/:slug" element={<GoRedirect />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TeacherDashboard />} />
            <Route path="/builder" element={<LessonBuilder />} />
            <Route path="/builder/:id" element={<LessonBuilder />} />
            <Route path="/results/:lessonId" element={<LessonResults />} />
            <Route path="/library" element={<LessonLibrary />} />
            <Route path="/public-library" element={<PublicLessonLibrary />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<div className="p-8 text-center text-gray-500">Page not found</div>} />
        </Routes>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;