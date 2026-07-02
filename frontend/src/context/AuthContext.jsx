import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../services/auth';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Firebase user
  const [dbUser, setDbUser] = useState(null);     // PostgreSQL user row
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Register/fetch user in our database
          const res = await api.post('/auth/login');
          setDbUser(res.data.user);
          setOnboardingComplete(res.data.onboardingComplete);
        } catch (err) {
          console.error('Failed to sync user with database:', err);
        }
      } else {
        setUser(null);
        setDbUser(null);
        setOnboardingComplete(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUser, onboardingComplete, setOnboardingComplete, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
