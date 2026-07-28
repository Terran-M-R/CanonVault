import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Tag, Button, InlineLoading } from '@carbon/react';
import api from '../services/api';

const WIP_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236f6f6f'%3ENo cover yet%3C/text%3E%3C/svg%3E";

// ── Feature cards data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '📖',
    title: 'Story Bible',
    desc: 'Keep every character, setting, and plot point organised in one place. Never lose track of your world-building details again.',
  },
  {
    icon: '🤖',
    title: 'IBM Granite AI',
    desc: 'Let IBM\'s Granite AI format your raw writing into polished novel structure, fix grammar, and sharpen your dialogue — instantly.',
  },
  {
    icon: '🔍',
    title: 'Continuity Checker',
    desc: 'AI scans your manuscript against your Story Bible to catch plot holes, contradictions, and inconsistencies before your readers do.',
  },
  {
    icon: '🌐',
    title: 'Public Publishing',
    desc: 'Share your work with a beautiful public profile page, complete with an AI-generated storyboard from your key plot points.',
  },
  {
    icon: '👥',
    title: 'Collaboration',
    desc: 'Invite co-writers and editors by email. Work together on the same story with role-based access control.',
  },
  {
    icon: '🖼',
    title: 'Storyboard Generation',
    desc: 'AI generates scene illustrations from your plot points — giving readers a visual preview of your story\'s most important moments.',
  },
];

// ── Animated feature carousel ─────────────────────────────────────────────────
function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(null);   // card being faded out
  const [fading, setFading] = useState(false);
  const timerRef   = useRef(null);
  const pendingRef = useRef(null);
  // Keep a ref of live state so the interval callback is never stale
  const stateRef = useRef({ active: 0, fading: false });
  stateRef.current = { active, fading };

  function goTo(index) {
    const { active: cur, fading: busy } = stateRef.current;
    if (busy || index === cur) return;
    clearTimeout(pendingRef.current);
    setPrev(cur);
    setActive(index);
    setFading(true);
    pendingRef.current = setTimeout(() => {
      setPrev(null);
      setFading(false);
    }, 450);
  }

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const { active: cur } = stateRef.current;
      goTo((cur + 1) % FEATURES.length);
    }, 7000);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(pendingRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const feature = FEATURES[active];
  const prevFeature = prev !== null ? FEATURES[prev] : null;

  return (
    <div style={styles.carouselWrap}>
      <h2 style={styles.carouselHeading}>What CanonVault Can Do</h2>

      {/* Card stack — outgoing fades out, incoming fades in simultaneously */}
      <div style={styles.cardStack}>

        {/* Outgoing card — fades out */}
        {prevFeature && (
          <div
            key={`prev-${prev}`}
            className="cv-feature-card"
            style={{
              ...styles.featureCard,
              ...styles.cardAbsolute,
              opacity: 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            <span style={styles.featureIcon}>{prevFeature.icon}</span>
            <h3 style={styles.featureTitle}>{prevFeature.title}</h3>
            <p style={styles.featureDesc}>{prevFeature.desc}</p>
          </div>
        )}

        {/* Incoming card — fades in; key change causes remount so @keyframes always fires */}
        <div
          key={`active-${active}`}
          className="cv-feature-card"
          style={{
            ...styles.featureCard,
            ...styles.cardAbsolute,
            animation: 'cv-fadein 0.45s ease forwards',
          }}
        >
          <span style={styles.featureIcon}>{feature.icon}</span>
          <h3 style={styles.featureTitle}>{feature.title}</h3>
          <p style={styles.featureDesc}>{feature.desc}</p>
        </div>

      </div>

      {/* Dot indicators */}
      <div style={styles.dots}>
        {FEATURES.map((_, i) => (
          <button
            key={i}
            style={{ ...styles.dot, ...(i === active ? styles.dotActive : {}) }}
            onClick={() => goTo(i)}
            aria-label={`Feature ${i + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes cv-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Browse() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { fetchBooks(''); }, []);

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

      {/* ── Navbar ── */}
      <nav style={styles.navbar}>
        <div />
        <button className="cv-signin-btn" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </nav>

      {/* ── Hero — full width, two-column layout ── */}
      <div style={styles.hero}>

        {/* Centre divider — inset so it doesn't touch top or bottom */}
        <div style={styles.heroDivider} />

        {/* Left column — logo + search */}
        <div style={styles.heroLeft}>
          <img
            src="/logo-wordmark.png.png"
            alt="CanonVault"
            style={styles.heroLogo}
          />
          <p style={styles.heroSub}>
            Discover published works from writers around the world
          </p>
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
          <button
            className="cv-signin-btn"
            style={styles.heroStartBtn}
            onClick={() => navigate('/login')}
          >
            Start Writing →
          </button>
        </div>

        {/* Right column — animated feature carousel */}
        <div style={styles.heroRight}>
          <FeatureCarousel />
        </div>

      </div>

      {/* ── Book grid ── */}
      <div style={styles.content}>
        <h2 style={styles.gridHeading}>Published Stories</h2>
        {loading ? (
          <InlineLoading description="Loading stories…" style={{ padding: '2rem' }} />
        ) : books.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: '#525252', marginBottom: '1rem' }}>
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
                  <div style={styles.coverWrap}>
                    <img
                      src={book.cover_image || WIP_PLACEHOLDER}
                      alt={`${book.title} cover`}
                      style={styles.cover}
                      onError={e => { e.target.src = WIP_PLACEHOLDER; }}
                    />
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardTopRow}>
                      <h3 style={styles.cardTitle}>{book.title}</h3>
                      <Tag type={book.is_wip ? 'blue' : 'green'} size="sm">
                        {book.is_wip ? 'WIP' : 'Complete'}
                      </Tag>
                    </div>
                    <p style={styles.author}>by {book.author_name}</p>
                    {book.genre_display && <p style={styles.genre}>{book.genre_display}</p>}
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

      {/* ── Footer ── */}
      <footer style={styles.footer}>
        <p>CanonVault · IBM Hackathon July 2026</p>
      </footer>

      {/* Hover card style for book cards */}
      <style>{`
        .browse-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f4f4f4',
  },

  /* Navbar */
  navbar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: '56px',
    background: '#011261',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 2rem',
    zIndex: 1000,
    boxSizing: 'border-box',
  },

  /* Hero — full width, two columns */
  hero: {
    position: 'relative',
    marginTop: '56px',
    background: '#011261',
    color: '#fff',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: '420px',
    width: '100%',
  },

  /* Centre divider */
  heroDivider: {
    position: 'absolute',
    left: '50%',
    top: '10%',
    bottom: '10%',
    width: '1px',
    background: 'rgba(255,255,255,0.15)',
    transform: 'translateX(-50%)',
  },

  /* Left: logo + search */
  heroLeft: {
    flex: '1 1 50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 3rem 3rem 5%',
    gap: '1rem',
  },
  heroLogo: {
    height: '130px',
    width: 'auto',
    maxWidth: '100%',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '1rem',
    margin: 0,
    textAlign: 'center',
  },
  searchWrap: {
    width: '100%',
    maxWidth: '460px',
  },
  heroStartBtn: {
    marginTop: '0.5rem',
    fontSize: '0.9rem',
    padding: '0.5rem 1.5rem',
  },

  /* Right: feature carousel */
  heroRight: {
    flex: '1 1 50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 5% 3rem 3rem',
  },

  /* Carousel */
  carouselWrap: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
  },
  carouselHeading: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: 0,
  },
  cardStack: {
    position: 'relative',
    width: '100%',
    minHeight: '200px',
  },
  cardAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  featureCard: {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '6px',
    padding: '2rem 1.75rem',
    textAlign: 'center',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    boxSizing: 'border-box',
  },
  featureIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  featureTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
  },
  featureDesc: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: '1.6',
    margin: 0,
  },
  dots: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.3)',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.3s ease, transform 0.3s ease',
  },
  dotActive: {
    background: '#ffffff',
    transform: 'scale(1.3)',
  },

  /* Content area */
  gridHeading: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#161616',
    margin: '0 0 1.25rem',
  },
  content: {
    maxWidth: '1200px',
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
  cardBody: { padding: '1rem', flex: 1 },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  cardTitle: { fontSize: '1rem', fontWeight: '600', color: '#161616', margin: 0 },
  author: { fontSize: '0.8rem', color: '#6f6f6f', margin: '0 0 0.3rem' },
  genre: { fontSize: '0.78rem', color: '#0f62fe', margin: '0 0 0.5rem', fontWeight: '500' },
  hook: { fontSize: '0.85rem', color: '#393939', lineHeight: '1.5', margin: 0 },

  footer: {
    textAlign: 'center',
    padding: '1.5rem',
    fontSize: '0.78rem',
    color: '#8d8d8d',
    borderTop: '1px solid #e0e0e0',
    background: '#fff',
  },
};
