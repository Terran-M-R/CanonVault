import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Search,
  Tag,
  Button,
  InlineLoading,
} from '@carbon/react';
import { Login } from '@carbon/icons-react';
import api from '../services/api';

const WIP_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236f6f6f'%3ENo cover yet%3C/text%3E%3C/svg%3E";

export default function Browse() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimer = React.useRef(null);

  useEffect(() => {
    fetchBooks('');
  }, []);

  async function fetchBooks(term) {
    setSearching(true);
    try {
      const params = term.trim() ? `?search=${encodeURIComponent(term.trim())}` : '';
      const res = await api.get(`/books${params}`);
      setBooks(res.data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchBooks(val), 400);
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <Header aria-label="CanonVault">
        <HeaderName prefix="">CanonVault</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Sign in"
            tooltipAlignment="end"
            onClick={() => navigate('/login')}
          >
            <Login size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {/* Hero */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Discover Stories</h1>
        <p style={styles.heroSub}>Browse published works from writers on CanonVault</p>
        <div style={styles.searchWrap}>
          <Search
            id="browse-search"
            labelText=""
            placeholder="Search by title, genre, or description…"
            value={search}
            onChange={handleSearchChange}
            size="lg"
          />
        </div>
      </div>

      {/* Book grid */}
      <div style={styles.content}>
        {loading ? (
          <InlineLoading description="Loading stories…" style={{ padding: '2rem' }} />
        ) : books.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: '#525252' }}>
              {search.trim() ? `No results for "${search}"` : 'No published stories yet. Be the first!'}
            </p>
            <Button kind="ghost" onClick={() => navigate('/login')}>
              Start Writing
            </Button>
          </div>
        ) : (
          <>
            {searching && <InlineLoading description="Searching…" style={{ marginBottom: '1rem' }} />}
            <div style={styles.grid}>
              {books.map(book => (
                <div
                  key={book.id}
                  style={styles.card}
                  onClick={() => navigate(`/book/${book.id}`)}
                >
                  {/* Cover image */}
                  <div style={styles.coverWrap}>
                    <img
                      src={book.cover_image || WIP_PLACEHOLDER}
                      alt={`${book.title} cover`}
                      style={styles.cover}
                      onError={e => { e.target.src = WIP_PLACEHOLDER; }}
                    />
                  </div>

                  {/* Card body */}
                  <div style={styles.cardBody}>
                    <div style={styles.cardTopRow}>
                      <h3 style={styles.cardTitle}>{book.title}</h3>
                      <Tag type={book.is_wip ? 'blue' : 'green'} size="sm">
                        {book.is_wip ? 'WIP' : 'Complete'}
                      </Tag>
                    </div>
                    <p style={styles.author}>by {book.author_name}</p>
                    {book.genre_display && (
                      <p style={styles.genre}>{book.genre_display}</p>
                    )}
                    {book.hook && (
                      <p style={styles.hook}>
                        {book.hook.length > 130 ? book.hook.slice(0, 130) + '…' : book.hook}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>CanonVault · IBM Hackathon July 2025</p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f4f4f4',
  },
  hero: {
    marginTop: '48px',
    background: '#161616',
    color: '#fff',
    padding: '3rem 2rem 2.5rem',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: '600',
    margin: '0 0 0.5rem',
    color: '#fff',
  },
  heroSub: {
    color: '#c6c6c6',
    marginBottom: '1.5rem',
    fontSize: '1rem',
  },
  searchWrap: {
    maxWidth: '560px',
    margin: '0 auto',
  },
  content: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem',
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
  },
  empty: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s',
    display: 'flex',
    flexDirection: 'column',
  },
  coverWrap: {
    width: '100%',
    aspectRatio: '16/9',
    overflow: 'hidden',
    background: '#e0e0e0',
    flexShrink: 0,
  },
  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  cardBody: {
    padding: '1rem',
    flex: 1,
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#161616',
    margin: 0,
  },
  author: {
    fontSize: '0.8rem',
    color: '#6f6f6f',
    margin: '0 0 0.3rem',
  },
  genre: {
    fontSize: '0.78rem',
    color: '#0f62fe',
    margin: '0 0 0.5rem',
    fontWeight: '500',
  },
  hook: {
    fontSize: '0.85rem',
    color: '#393939',
    lineHeight: '1.5',
    margin: 0,
  },
  footer: {
    textAlign: 'center',
    padding: '1.5rem',
    fontSize: '0.78rem',
    color: '#8d8d8d',
    borderTop: '1px solid #e0e0e0',
    background: '#fff',
  },
};
