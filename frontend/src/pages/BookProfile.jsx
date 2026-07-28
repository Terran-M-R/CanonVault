import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Button,
  Tag,
  InlineLoading,
} from '@carbon/react';
import { ArrowLeft, Launch, Login, Close } from '@carbon/icons-react';
import api from '../services/api';
import { CanonVaultWordmark } from '../components/CanonVaultLogo';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236f6f6f'%3EGenerating image…%3C/text%3E%3C/svg%3E";

// ── Lightbox overlay shown when an image is clicked/hovered ──────────────────
function Lightbox({ img, index, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const label = img.plot_point_title || `Scene ${index + 1}`;
  const desc  = img.plot_point_description || null;

  return (
    <div style={lbStyles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div style={lbStyles.card} onClick={e => e.stopPropagation()}>
        <button style={lbStyles.closeBtn} onClick={onClose} aria-label="Close">
          <Close size={20} />
        </button>
        <img
          src={img.image_url || PLACEHOLDER}
          alt={label}
          style={lbStyles.img}
          onError={e => { e.target.src = PLACEHOLDER; }}
        />
        <div style={lbStyles.caption}>
          <strong style={lbStyles.captionTitle}>{label}</strong>
          {desc && <p style={lbStyles.captionDesc}>{desc}</p>}
        </div>
      </div>
    </div>
  );
}

export default function BookProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null); // { img, index }

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/books/${id}`);
        setBook(res.data);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        console.error('Failed to load book:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.center}>
        <InlineLoading description="Loading book profile…" />
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#525252', marginBottom: '1rem' }}>Book not found.</p>
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate('/browse')}>
          Back to Browse
        </Button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <Header aria-label="CanonVault" style={{ backgroundColor: '#001261' }}>
        <HeaderGlobalAction
          aria-label="Back to browse"
          tooltipAlignment="start"
          onClick={() => navigate('/browse')}
        >
          <ArrowLeft size={20} />
        </HeaderGlobalAction>
        <HeaderName prefix="" style={{ padding: '0 1rem' }}>
          <img src="/logo-wordmark.png.png" alt="CanonVault" style={{ height: '36px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }} />
        </HeaderName>
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

      <div style={styles.content}>
        {/* ── Book header ── */}
        <div style={styles.bookHeader}>
          <div style={styles.bookMeta}>
            <div style={styles.tags}>
              <Tag type={book.is_wip ? 'blue' : 'green'} size="sm">
                {book.is_wip ? 'Work in Progress' : 'Complete'}
              </Tag>
              {book.genre_display && (
                <Tag type="cool-gray" size="sm">{book.genre_display}</Tag>
              )}
              {book.audience_display && (
                <Tag type="teal" size="sm">{book.audience_display}</Tag>
              )}
            </div>

            <h1 style={styles.title}>{book.title}</h1>
            <p style={styles.author}>by {book.author_name}</p>

            {book.hook && (
              <p style={styles.hook}>{book.hook}</p>
            )}

            {book.external_link && (
              <a
                href={book.external_link}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.externalLink}
              >
                Read it here <Launch size={14} style={{ verticalAlign: 'middle' }} />
              </a>
            )}

            <p style={styles.publishDate}>
              Published {new Date(book.published_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* ── Synopsis ── */}
        {book.synopsis && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Synopsis</h2>
            <p style={styles.synopsis}>{book.synopsis}</p>
          </div>
        )}

        {/* ── Storyboard ── */}
        {book.storyboard && book.storyboard.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Storyboard</h2>
            <p style={styles.sectionSub}>
              AI-generated scenes from key moments in the story — hover to enlarge
            </p>
            <div style={styles.storyboard}>
              {book.storyboard.map((img, i) => {
                const label = img.plot_point_title || `Scene ${i + 1}`;
                const desc  = img.plot_point_description || null;
                return (
                  <div
                    key={img.id}
                    style={styles.storyboardItem}
                    onClick={() => setLightboxImg({ img, index: i })}
                    title="Click to enlarge"
                    className="storyboard-card"
                  >
                    <div style={styles.imgWrapper}>
                      <img
                        src={img.image_url || PLACEHOLDER}
                        alt={label}
                        style={styles.storyboardImg}
                        onError={e => { e.target.src = PLACEHOLDER; }}
                      />
                      <div style={styles.imgOverlay}>
                        <span style={styles.overlayZoom}>🔍 Click to enlarge</span>
                      </div>
                    </div>
                    <div style={styles.imgCaption}>
                      <strong style={styles.imgCaptionTitle}>{label}</strong>
                      {desc && (
                        <p style={styles.imgCaptionDesc}>{desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Call to action ── */}
        <div style={styles.cta}>
          <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate('/browse')}>
            Back to Browse
          </Button>
          <Button onClick={() => navigate('/login')}>
            Write Your Own Story
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>CanonVault · IBM Hackathon July 2026</p>
      </footer>

      {/* Lightbox */}
      {lightboxImg && (
        <Lightbox
          img={lightboxImg.img}
          index={lightboxImg.index}
          onClose={() => setLightboxImg(null)}
        />
      )}

      {/* Hover styles injected globally */}
      <style>{`
        .storyboard-card { cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .storyboard-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .storyboard-card:hover .img-overlay { opacity: 1; }
      `}</style>
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
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  content: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '4.5rem 2rem 2rem',
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
  },
  bookHeader: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    padding: '2rem',
    marginBottom: '1.5rem',
  },
  bookMeta: {},
  tags: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#161616',
    margin: '0 0 0.25rem',
    lineHeight: '1.25',
  },
  author: {
    fontSize: '1rem',
    color: '#525252',
    margin: '0 0 1rem',
  },
  hook: {
    fontSize: '1.05rem',
    color: '#393939',
    lineHeight: '1.65',
    margin: '0 0 1.25rem',
    fontStyle: 'italic',
    borderLeft: '3px solid #0f62fe',
    paddingLeft: '1rem',
  },
  externalLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: '#0f62fe',
    fontSize: '0.9rem',
    textDecoration: 'none',
    fontWeight: '500',
    marginBottom: '1rem',
  },
  publishDate: {
    fontSize: '0.8rem',
    color: '#8d8d8d',
    margin: 0,
  },
  section: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    padding: '1.5rem 2rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#161616',
    margin: '0 0 0.5rem',
  },
  sectionSub: {
    fontSize: '0.85rem',
    color: '#6f6f6f',
    margin: '0 0 1rem',
  },
  synopsis: {
    fontSize: '0.95rem',
    color: '#393939',
    lineHeight: '1.7',
    margin: 0,
  },
  storyboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem',
  },
  storyboardItem: {
    borderRadius: '4px',
    overflow: 'hidden',
    background: '#e0e0e0',
    border: '1px solid #e0e0e0',
  },
  imgWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  storyboardImg: {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.2s ease',
  },
  imgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    className: 'img-overlay',
  },
  overlayZoom: {
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: '500',
    letterSpacing: '0.02em',
  },
  imgCaption: {
    padding: '0.5rem 0.65rem 0.6rem',
    background: '#f4f4f4',
    borderTop: '1px solid #e0e0e0',
  },
  imgCaptionTitle: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#161616',
    marginBottom: '0.2rem',
  },
  imgCaptionDesc: {
    fontSize: '0.75rem',
    color: '#525252',
    margin: 0,
    lineHeight: '1.45',
    // Clamp to 2 lines so it doesn't take over the card
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 0',
    flexWrap: 'wrap',
    gap: '1rem',
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

// ── Lightbox styles ───────────────────────────────────────────────────────────
const lbStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    padding: '1.5rem',
  },
  card: {
    position: 'relative',
    background: '#fff',
    borderRadius: '4px',
    maxWidth: '780px',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    background: 'rgba(0,0,0,0.55)',
    border: 'none',
    borderRadius: '50%',
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    zIndex: 1,
  },
  img: {
    width: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    display: 'block',
    background: '#161616',
  },
  caption: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid #e0e0e0',
  },
  captionTitle: {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#161616',
    marginBottom: '0.35rem',
  },
  captionDesc: {
    fontSize: '0.875rem',
    color: '#393939',
    margin: 0,
    lineHeight: '1.6',
  },
};
