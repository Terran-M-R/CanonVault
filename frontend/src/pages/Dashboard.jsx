import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Button,
  Modal,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Tag,
  InlineLoading,
  Tile,
} from '@carbon/react';
import { Logout, Add, Book } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';
import api from '../services/api';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Literary Fiction', 'Historical Fiction', 'Adventure', 'Other',
];

const STATUS_COLORS = {
  draft: 'gray',
  wip: 'blue',
  published: 'green',
};

export default function Dashboard() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', synopsis: '', genre: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchStories();
  }, []);

  async function fetchStories() {
    try {
      const res = await api.get('/stories');
      setStories(res.data);
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStory() {
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      const res = await api.post('/stories', form);
      setStories(prev => [res.data, ...prev]);
      setModalOpen(false);
      setForm({ title: '', synopsis: '', genre: '' });
      navigate(`/stories/${res.data.id}`);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create story');
    } finally {
      setCreating(false);
    }
  }

  function openModal() {
    setForm({ title: '', synopsis: '', genre: '' });
    setFormError('');
    setModalOpen(true);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div>
      {/* Top navigation */}
      <Header aria-label="CanonVault">
        <HeaderName prefix="">CanonVault</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Sign out"
            tooltipAlignment="end"
            onClick={handleLogout}
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {/* Main content */}
      <div style={styles.content}>
        <div style={styles.topRow}>
          <div>
            <h2 style={styles.heading}>
              Welcome back{dbUser?.display_name ? `, ${dbUser.display_name.split(' ')[0]}` : ''}!
            </h2>
            <p style={styles.sub}>Your stories are listed below. Click one to open the editor.</p>
          </div>
          <Button renderIcon={Add} onClick={openModal}>
            New Story
          </Button>
        </div>

        {/* Story grid */}
        {loading ? (
          <InlineLoading description="Loading your stories…" />
        ) : stories.length === 0 ? (
          <div style={styles.empty}>
            <Book size={48} style={{ color: '#8d8d8d', marginBottom: '1rem' }} />
            <p style={{ color: '#525252' }}>No stories yet. Create your first one!</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {stories.map(story => (
              <Tile
                key={story.id}
                style={styles.card}
                onClick={() => navigate(`/stories/${story.id}`)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{story.title}</h3>
                  <Tag type={STATUS_COLORS[story.status] || 'gray'} size="sm">
                    {story.status}
                  </Tag>
                </div>
                {story.genre && (
                  <p style={styles.genre}>{story.genre}</p>
                )}
                {story.synopsis && (
                  <p style={styles.synopsis}>
                    {story.synopsis.length > 120
                      ? story.synopsis.slice(0, 120) + '…'
                      : story.synopsis}
                  </p>
                )}
                <p style={styles.date}>
                  Updated {new Date(story.updated_at).toLocaleDateString()}
                </p>
              </Tile>
            ))}
          </div>
        )}
      </div>

      {/* New Story modal */}
      <Modal
        open={modalOpen}
        modalHeading="Create New Story"
        primaryButtonText={creating ? 'Creating…' : 'Create'}
        secondaryButtonText="Cancel"
        onRequestSubmit={handleCreateStory}
        onRequestClose={() => setModalOpen(false)}
        primaryButtonDisabled={creating}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <TextInput
            id="story-title"
            labelText="Title *"
            placeholder="Enter story title"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            invalid={!!formError && !form.title.trim()}
            invalidText={formError}
          />
          <Select
            id="story-genre"
            labelText="Genre"
            value={form.genre}
            onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
          >
            <SelectItem value="" text="Select a genre (optional)" />
            {GENRES.map(g => <SelectItem key={g} value={g} text={g} />)}
          </Select>
          <TextArea
            id="story-synopsis"
            labelText="Synopsis"
            placeholder="A brief description of your story (optional)"
            rows={4}
            value={form.synopsis}
            onChange={e => setForm(p => ({ ...p, synopsis: e.target.value }))}
          />
          {formError && form.title.trim() && (
            <p style={{ color: '#da1e28', fontSize: '0.875rem' }}>{formError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

const styles = {
  content: {
    padding: '6rem 2rem 2rem',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#161616',
    marginBottom: '0.25rem',
  },
  sub: {
    color: '#525252',
    margin: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    border: '2px dashed #e0e0e0',
    borderRadius: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    cursor: 'pointer',
    padding: '1.25rem',
    transition: 'background 0.15s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
    gap: '0.5rem',
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#161616',
    margin: 0,
  },
  genre: {
    fontSize: '0.8rem',
    color: '#6f6f6f',
    marginBottom: '0.5rem',
    margin: '0 0 0.5rem',
  },
  synopsis: {
    fontSize: '0.875rem',
    color: '#393939',
    margin: '0 0 0.75rem',
    lineHeight: '1.5',
  },
  date: {
    fontSize: '0.75rem',
    color: '#8d8d8d',
    margin: 0,
  },
};
