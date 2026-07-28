import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Form,
  TextInput,
  Button,
  InlineNotification,
  Stack,
} from '@carbon/react';
import { loginWithEmail, loginWithGoogle } from '../services/auth';
import { CanonVaultWordmark } from '../components/CanonVaultLogo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* cv-auth-card enables the hover glow via index.css */}
      <div style={styles.card} className="cv-auth-card">
        {/* Logo */}
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src="/logo-wordmark.png.png" alt="CanonVault" style={{ height: '80px', width: 'auto', display: 'block', margin: '0 auto' }} />
          </div>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            lowContrast
            style={{ marginBottom: '1rem' }}
          />
        )}

        {/* cv-dark-form turns Carbon label text white */}
        <Form onSubmit={handleEmailLogin} className="cv-dark-form">
          <Stack gap={5}>
            <TextInput
              id="email"
              type="email"
              labelText="Email address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextInput
              id="password"
              type="password"
              labelText="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Stack>
        </Form>

        <div style={styles.divider}>
          <span>or</span>
        </div>

        <Button
          kind="tertiary"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%' }}
        >
          Continue with Google
        </Button>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#011261',
  },
  card: {
    backgroundColor: '#011261',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.875rem',
  },
  divider: {
    textAlign: 'center',
    margin: '1.25rem 0',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.875rem',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.7)',
  },
  link: {
    color: '#7eb3ff',
    textDecoration: 'none',
  },
};
