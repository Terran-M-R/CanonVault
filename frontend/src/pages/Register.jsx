import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Form,
  TextInput,
  Button,
  InlineNotification,
  Stack,
} from '@carbon/react';
import { registerWithEmail, loginWithGoogle } from '../services/auth';
import { CanonVaultWordmark } from '../components/CanonVaultLogo';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, password);
      navigate('/onboarding');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError('Registration failed. Please try again.');
      }
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
      <div style={styles.card} className="cv-auth-card">
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src="/logo-wordmark.png.png" alt="CanonVault" style={{ height: '80px', width: 'auto', display: 'block', margin: '0 auto' }} />
          </div>
          <p style={styles.subtitle}>Create your account</p>
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

        <Form onSubmit={handleRegister} className="cv-dark-form">
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
            <TextInput
              id="confirm"
              type="password"
              labelText="Confirm password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creating account...' : 'Create account'}
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
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
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
