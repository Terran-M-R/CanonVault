import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import StoryEditor from './pages/StoryEditor';
import Browse from './pages/Browse';
import BookProfile from './pages/BookProfile';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes — no login required */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/book/:id" element={<BookProfile />} />

        {/* Onboarding — accessible when logged in but survey not done */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Protected routes — require login + onboarding */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stories/:id"
          element={
            <ProtectedRoute>
              <StoryEditor />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/browse" replace />} />
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
