import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
} from '@carbon/react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STEPS = [
  {
    label: 'Writing Type',
    question: 'What are you primarily writing?',
    field: 'writing_type',
    options: [
      { value: 'creative', label: 'Creative Writing' },
      { value: 'academic', label: 'Academic Writing' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    label: 'Book Form',
    question: 'What form best describes your work?',
    field: 'book_form',
    options: [
      { value: 'novel', label: 'Novel' },
      { value: 'short_story', label: 'Short Story / Novella' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    label: 'Target Audience',
    question: 'Who is your target audience?',
    field: 'target_audience',
    options: [
      { value: 'adult', label: 'Adult' },
      { value: 'young_adult', label: 'Young Adult' },
      { value: 'middle_grade', label: 'Middle Grade' },
      { value: 'children', label: 'Children' },
    ],
  },
  {
    label: 'AI Feedback Level',
    question: 'How much AI feedback would you like?',
    field: 'ai_criticism_level',
    options: [
      { value: 'light', label: 'Light — Minor suggestions only' },
      { value: 'moderate', label: 'Moderate — Balanced feedback' },
      { value: 'detailed', label: 'Detailed — In-depth analysis' },
    ],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setOnboardingComplete } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    writing_type: 'creative',
    book_form: 'novel',
    target_audience: 'adult',
    ai_criticism_level: 'moderate',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const current = STEPS[step];

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/preferences', answers);
      setOnboardingComplete(true);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome to CanonVault</h1>
          <p style={styles.subtitle}>Let's set up your writing profile</p>
        </div>

        {/* Progress indicator */}
        <ProgressIndicator currentIndex={step} style={{ marginBottom: '2rem' }}>
          {STEPS.map((s) => (
            <ProgressStep key={s.field} label={s.label} />
          ))}
        </ProgressIndicator>

        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            lowContrast
            style={{ marginBottom: '1rem' }}
          />
        )}

        {/* Current step question */}
        <div style={styles.question}>
          <p style={styles.questionText}>{current.question}</p>
          <RadioButtonGroup
            legendText=""
            name={current.field}
            valueSelected={answers[current.field]}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, [current.field]: value }))
            }
            orientation="vertical"
          >
            {current.options.map((opt) => (
              <RadioButton
                key={opt.value}
                labelText={opt.label}
                value={opt.value}
                id={`${current.field}-${opt.value}`}
              />
            ))}
          </RadioButtonGroup>
        </div>

        {/* Navigation buttons */}
        <div style={styles.buttons}>
          {step > 0 && (
            <Button kind="secondary" onClick={handleBack} disabled={loading}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} style={{ marginLeft: 'auto' }}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginLeft: 'auto' }}
            >
              {loading ? 'Saving...' : 'Get Started'}
            </Button>
          )}
        </div>
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
    backgroundColor: '#f4f4f4',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#161616',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: '#525252',
    fontSize: '0.875rem',
  },
  question: {
    marginBottom: '2rem',
  },
  questionText: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#161616',
    marginBottom: '1rem',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};
