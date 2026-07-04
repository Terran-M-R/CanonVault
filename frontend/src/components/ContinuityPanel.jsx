import React, { useEffect, useState } from 'react';
import {
  Button,
  InlineLoading,
  Tag,
} from '@carbon/react';
import { CheckmarkFilled, WarningAlt, Idea, Search, Information } from '@carbon/icons-react';
import api from '../services/api';

// Maps flag_type to display config
const FLAG_CONFIG = {
  continuity:    { label: 'Continuity',     color: 'red',    Icon: WarningAlt     },
  plot_hole:     { label: 'Plot Hole',       color: 'purple', Icon: Search         },
  show_dont_tell:{ label: "Show Don't Tell", color: 'teal',   Icon: Idea           },
  suggestion:    { label: 'Suggestion',      color: 'blue',   Icon: Information    },
};

function FlagCard({ flag, onResolve }) {
  const config = FLAG_CONFIG[flag.flag_type] || FLAG_CONFIG.continuity;
  const { label, color, Icon } = config;
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    setResolving(true);
    await onResolve(flag.id);
    // parent removes the card; no need to reset
  }

  return (
    <div style={{ ...cardStyles.wrapper, opacity: flag.resolved ? 0.5 : 1 }}>
      <div style={cardStyles.header}>
        <Tag type={color} size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Icon size={12} /> {label}
        </Tag>
        {!flag.resolved && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={resolving ? undefined : CheckmarkFilled}
            onClick={handleResolve}
            disabled={resolving}
            style={{ minHeight: 'unset', padding: '0.25rem 0.5rem' }}
          >
            {resolving ? <InlineLoading /> : 'Resolve'}
          </Button>
        )}
        {flag.resolved && (
          <span style={cardStyles.resolvedBadge}>✓ Resolved</span>
        )}
      </div>
      <p style={cardStyles.description}>{flag.flag_text}</p>
      {flag.suggestion && (
        <div style={cardStyles.suggestion}>
          <span style={cardStyles.suggestionLabel}>Suggestion: </span>
          {flag.suggestion}
        </div>
      )}
    </div>
  );
}

export default function ContinuityPanel({ storyId, checking, onCheckComplete }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadFlags();
  }, [storyId]);

  // When parent triggers a new check, reload flags afterwards
  useEffect(() => {
    if (!checking) {
      loadFlags();
    }
  }, [checking]);

  async function loadFlags() {
    try {
      const res = await api.get(`/stories/${storyId}/continuity-flags`);
      setFlags(res.data);
    } catch (err) {
      console.error('Failed to load flags:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(flagId) {
    try {
      await api.patch(`/stories/${storyId}/continuity-flags/${flagId}/resolve`);
      setFlags(prev => prev.map(f => f.id === flagId ? { ...f, resolved: true } : f));
    } catch (err) {
      console.error('Failed to resolve flag:', err);
    }
  }

  const unresolved = flags.filter(f => !f.resolved);
  const resolved = flags.filter(f => f.resolved);
  const displayed = showResolved ? flags : unresolved;

  if (loading || checking) {
    return (
      <div style={panelStyles.center}>
        <InlineLoading description={checking ? 'Analysing your story…' : 'Loading flags…'} />
      </div>
    );
  }

  return (
    <div style={panelStyles.wrapper}>
      {/* Summary bar */}
      <div style={panelStyles.summary}>
        <span style={panelStyles.summaryText}>
          {unresolved.length === 0
            ? 'No open issues'
            : `${unresolved.length} open issue${unresolved.length !== 1 ? 's' : ''}`}
        </span>
        {resolved.length > 0 && (
          <button
            style={panelStyles.toggleBtn}
            onClick={() => setShowResolved(v => !v)}
          >
            {showResolved ? 'Hide resolved' : `Show ${resolved.length} resolved`}
          </button>
        )}
      </div>

      {/* Flag list */}
      <div style={panelStyles.list}>
        {displayed.length === 0 ? (
          <div style={panelStyles.empty}>
            {unresolved.length === 0
              ? <p style={panelStyles.emptyText}>✓ No issues found. Run a check after writing more of your story.</p>
              : <p style={panelStyles.emptyText}>All issues resolved!</p>
            }
          </div>
        ) : (
          displayed.map(flag => (
            <FlagCard key={flag.id} flag={flag} onResolve={handleResolve} />
          ))
        )}
      </div>
    </div>
  );
}

const panelStyles = {
  wrapper: {
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    height: '100%',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    background: '#f4f4f4',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
  },
  summaryText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#393939',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#0f62fe',
    padding: 0,
    textDecoration: 'underline',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.75rem',
    overflowY: 'auto',
  },
  empty: {
    padding: '2rem 1rem',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6f6f6f',
    fontSize: '0.875rem',
    margin: 0,
    lineHeight: '1.5',
  },
};

const cardStyles = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    padding: '0.75rem',
    borderLeft: '3px solid #e0e0e0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    gap: '0.5rem',
  },
  description: {
    fontSize: '0.85rem',
    color: '#161616',
    margin: '0 0 0.5rem',
    lineHeight: '1.5',
  },
  suggestion: {
    fontSize: '0.8rem',
    color: '#525252',
    background: '#f4f4f4',
    padding: '0.4rem 0.6rem',
    borderRadius: '2px',
    lineHeight: '1.4',
  },
  suggestionLabel: {
    fontWeight: '600',
    color: '#393939',
  },
  resolvedBadge: {
    fontSize: '0.75rem',
    color: '#24a148',
    fontWeight: '600',
  },
};
