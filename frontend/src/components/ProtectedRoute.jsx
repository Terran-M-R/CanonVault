import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from '@carbon/react';

/**
 * Wraps a route so only logged-in users can access it.
 * Redirects to /login if not authenticated.
 * Redirects to /onboarding if authenticated but onboarding not done.
 */
export default function ProtectedRoute({ children }) {
  const { user, onboardingComplete, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <Loading description="Loading CanonVault..." withOverlay={false} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;

  return children;
}
