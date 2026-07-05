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
import { ArrowLeft, Launch, Login } from '@carbon/icons-react';
import api from '../services/api';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236f6f6f'%3EGenerating image…%3C/text%3E%3C/svg%3E";

export default function BookProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      <Header aria-label="CanonVault">
        <HeaderGlobalAction
          aria-label="Back to browse"
          tooltipAlignment="start"
          onClick={() => navigate('/browse')}
        >
          <ArrowLeft size={20} />
        </HeaderGlobalAction>
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
              AI-generated scenes from key moments in the story
            </p>
            <div style={styles.storyboard}>
              {book.storyboard.map((img, i) => (
                <div key={img.id} style={styles.storyboardItem}>
                  <img
                    src={img.image_url || PLACEHOLDER}
                    alt={`Scene ${i + 1}`}
                    style={styles.storyboardImg}
                    onError={e => { e.target.src = PLACEHOLDER; }}
                  />
                  {img.prompt_used && (
                    <p style={styles.imgPrompt}>Scene {i + 1}</p>
                  )}
                </div>
              ))}
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
    padding: '5rem 2rem 2rem',
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
    borderRadius: '2px',
    overflow: 'hidden',
    background: '#e0e0e0',
  },
  storyboardImg: {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover',
    display: 'block',
  },
  imgPrompt: {
    fontSize: '0.75rem',
    color: '#6f6f6f',
    padding: '0.4rem 0.6rem',
    margin: 0,
    background: '#f4f4f4',
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
