import React, { useEffect, useState } from 'react';
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  InlineLoading,
  Tag,
  IconButton,
} from '@carbon/react';
import { Add, TrashCan, UserAvatar, UserFollow } from '@carbon/icons-react';
import api from '../services/api';

const ROLE_COLORS = {
  editor: 'blue',
  viewer: 'teal',
};

const STATUS_COLORS = {
  accepted: 'green',
  pending:  'gray',
};

export default function CollaboratorsPanel({ storyId, isOwner }) {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', role: 'editor' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOwner) loadCollaborators();
    else setLoading(false);
  }, [storyId, isOwner]);

  async function loadCollaborators() {
    setLoading(true);
    try {
      const res = await api.get(`/stories/${storyId}/collaborators`);
      setCollaborators(res.data);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setAdding(true);
    try {
      const res = await api.post(`/stories/${storyId}/collaborators`, {
        email: form.email.trim().toLowerCase(),
        role: form.role,
      });
      setCollaborators(prev => [...prev, res.data]);
      setForm({ email: '', role: 'editor' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add collaborator');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id) {
    try {
      await api.delete(`/stories/${storyId}/collaborators/${id}`);
      setCollaborators(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    }
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <InlineLoading description="Loading collaborators…" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div style={styles.center}>
        <UserAvatar size={32} style={{ color: '#8d8d8d', marginBottom: '0.5rem' }} />
        <p style={styles.muted}>You are a collaborator on this story.</p>
        <p style={styles.muted}>Only the owner can manage access.</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Header row */}
      <div style={styles.header}>
        <span style={styles.headerLabel}>
          {collaborators.length === 0
            ? 'No collaborators yet'
            : `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''}`}
        </span>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={UserFollow}
          onClick={() => { setShowForm(v => !v); setError(''); }}
        >
          Invite
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={styles.addForm}>
          <TextInput
            id="collab-email"
            labelText="Email address"
            placeholder="collaborator@email.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            invalid={!!error}
            invalidText={error}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Select
            id="collab-role"
            labelText="Role"
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
          >
            <SelectItem value="editor" text="Editor — can view and edit" />
            <SelectItem value="viewer" text="Viewer — can view only" />
          </Select>
          <div style={styles.addActions}>
            <Button
              size="sm"
              renderIcon={adding ? undefined : Add}
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? <InlineLoading description="Adding…" /> : 'Add'}
            </Button>
            <Button
              size="sm"
              kind="ghost"
              onClick={() => { setShowForm(false); setError(''); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Collaborator list */}
      <div style={styles.list}>
        {collaborators.length === 0 ? (
          <p style={styles.empty}>
            Invite editors or viewers by email. They'll gain access the next time they log in.
          </p>
        ) : (
          collaborators.map(c => (
            <div key={c.id} style={styles.card}>
              <div style={styles.cardLeft}>
                <UserAvatar size={20} style={{ color: '#525252', flexShrink: 0 }} />
                <div style={styles.cardInfo}>
                  <span style={styles.cardEmail}>{c.email}</span>
                  <div style={styles.cardTags}>
                    <Tag type={ROLE_COLORS[c.role] || 'gray'} size="sm">
                      {c.role}
                    </Tag>
                    <Tag type={STATUS_COLORS[c.invite_status] || 'gray'} size="sm">
                      {c.invite_status}
                    </Tag>
                  </div>
                </div>
              </div>
              <IconButton
                label="Remove collaborator"
                kind="ghost"
                size="sm"
                onClick={() => handleRemove(c.id)}
              >
                <TrashCan size={16} />
              </IconButton>
            </div>
          ))
        )}
      </div>

      {/* Info note */}
      <div style={styles.note}>
        <p style={styles.noteText}>
          Pending invites are accepted automatically when the person logs into CanonVault with the invited email.
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    textAlign: 'center',
    height: '100%',
    gap: '0.4rem',
  },
  muted: {
    fontSize: '0.85rem',
    color: '#6f6f6f',
    margin: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    background: '#f4f4f4',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
  },
  headerLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#393939',
  },
  addForm: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: '#fff',
    flexShrink: 0,
  },
  addActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  list: {
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
  },
  empty: {
    fontSize: '0.85rem',
    color: '#6f6f6f',
    lineHeight: '1.5',
    margin: 0,
    padding: '0.5rem 0',
  },
  card: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    padding: '0.6rem 0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flex: 1,
    minWidth: 0,
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: 0,
  },
  cardEmail: {
    fontSize: '0.85rem',
    color: '#161616',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardTags: {
    display: 'flex',
    gap: '0.3rem',
    flexWrap: 'wrap',
  },
  note: {
    padding: '0.75rem 1rem',
    borderTop: '1px solid #e0e0e0',
    background: '#f4f4f4',
    flexShrink: 0,
  },
  noteText: {
    fontSize: '0.75rem',
    color: '#6f6f6f',
    margin: 0,
    lineHeight: '1.4',
  },
};
