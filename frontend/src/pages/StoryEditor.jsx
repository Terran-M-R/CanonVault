import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Button,
  TextInput,
  Select,
  SelectItem,
  InlineLoading,
  InlineNotification,
  Tag,
  Modal,
  Toggle,
} from '@carbon/react';
import {
  ArrowLeft,
  Logout,
  Upload,
  Save,
  SettingsAdjust,
  MagicWand,
} from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';
import api from '../services/api';
import StoryBiblePanel from '../components/StoryBiblePanel';
import ContinuityPanel from '../components/ContinuityPanel';
import PublishModal from '../components/PublishModal';
import CollaboratorsPanel from '../components/CollaboratorsPanel';
import { CanonVaultWordmark } from '../components/CanonVaultLogo';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Literary Fiction', 'Historical Fiction', 'Adventure', 'Other',
];

const STATUSES = ['draft', 'wip', 'published'];

const AUTO_SAVE_DELAY = 2500; // ms after last keystroke

// ── AI processing steps shown in the progress popup ────────────────────────
const AI_STEPS = [
  { label: 'Reading your manuscript…',         duration: 2200 },
  { label: 'Analysing characters…',             duration: 2400 },
  { label: 'Assessing the plot…',               duration: 2400 },
  { label: 'Checking settings & world-building…', duration: 2200 },
  { label: 'Formatting prose & dialogue…',      duration: 2400 },
  { label: 'Populating your Story Bible…',      duration: 2000 },
];

export default function StoryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dbUser } = useAuth();

  // Story metadata
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Editor text
  const [rawText, setRawText] = useState('');
  const [saveState, setSaveState] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'

  // Metadata edit modal
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaForm, setMetaForm] = useState({ title: '', synopsis: '', genre: '', status: 'draft' });

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // AI processing
  const [processing, setProcessing] = useState(false);
  const [aiStep, setAiStep] = useState(0);          // index into AI_STEPS while processing
  const [processError, setProcessError] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [showFormatted, setShowFormatted] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState(null);
  const [aiResultModalOpen, setAiResultModalOpen] = useState(false);
  const aiStepTimer = useRef(null);

  // Published book link banner
  const [publishedBookId, setPublishedBookId] = useState(null);
  const [imagesGenerating, setImagesGenerating] = useState(false);

  // Continuity checker
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [sidebarTab, setSidebarTab] = useState('bible'); // 'bible' | 'continuity'
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  // Publishing
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [existingBook, setExistingBook] = useState(null);

  // Auto-save timer
  const saveTimer = useRef(null);

  // ── Load story on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadStory();

    // After a publish/update the page reloads. Pick up the success flag from
    // sessionStorage and show the banner — then clear it so it only shows once.
    const raw = sessionStorage.getItem('publishSuccess');
    if (raw) {
      sessionStorage.removeItem('publishSuccess');
      try {
        const { bookId, generatingImages } = JSON.parse(raw);
        if (bookId) {
          setPublishedBookId(bookId);
          if (generatingImages) setImagesGenerating(true);
        }
      } catch (_) { /* malformed entry — ignore */ }
    }
  }, [id]);

  async function loadStory() {
    try {
      const res = await api.get(`/stories/${id}`);
      setStory(res.data);
      setRawText(res.data.content?.raw_text || '');
      setFormattedText(res.data.content?.formatted_text || '');
      setMetaForm({
        title: res.data.title || '',
        synopsis: res.data.synopsis || '',
        genre: res.data.genre || '',
        status: res.data.status || 'draft',
      });
      // Check if already published
      try {
        const pubRes = await api.get(`/books?storyId=${id}`);
        const match = pubRes.data.find(b => String(b.story_id) === String(id));
        if (match) setExistingBook(match);
      } catch (_) { /* not published yet, that's fine */ }
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      console.error('Failed to load story:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Auto-save logic ──────────────────────────────────────────────────────
  const saveContent = useCallback(async (text) => {
    setSaveState('saving');
    try {
      await api.put(`/stories/${id}/content`, { raw_text: text });
      setSaveState('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveState('error');
    }
  }, [id]);

  function handleTextChange(e) {
    const text = e.target.value;
    setRawText(text);
    setSaveState('unsaved');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveContent(text), AUTO_SAVE_DELAY);
  }

  // Manual save on Ctrl+S / Cmd+S
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        clearTimeout(saveTimer.current);
        saveContent(rawText);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rawText, saveContent]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
    };
  }, []);

  // ── AI: Process with Granite ─────────────────────────────────────────────
  async function handleProcessWithAI() {
    setProcessError('');
    setAiStep(0);
    setProcessing(true);

    // Cycle through the progress steps while the real request runs in parallel
    let stepIndex = 0;
    function scheduleNextStep() {
      const delay = AI_STEPS[stepIndex]?.duration ?? 2000;
      aiStepTimer.current = setTimeout(() => {
        stepIndex += 1;
        if (stepIndex < AI_STEPS.length) {
          setAiStep(stepIndex);
          scheduleNextStep();
        }
        // When all steps shown, stay on last step until API responds
      }, delay);
    }
    scheduleNextStep();

    try {
      const res = await api.post(`/stories/${id}/process-text`);
      clearTimeout(aiStepTimer.current);
      setFormattedText(res.data.formattedText);
      setExtractedSummary(res.data.extracted);
      setShowFormatted(true);
      setAiResultModalOpen(true);
    } catch (err) {
      clearTimeout(aiStepTimer.current);
      setProcessError(err.response?.data?.error || 'AI processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  // ── AI: Check Continuity ─────────────────────────────────────────────────
  async function handleCheckContinuity() {
    setCheckError('');
    setChecking(true);
    setSidebarTab('continuity');
    try {
      const res = await api.post(`/stories/${id}/check-continuity`);
      setUnresolvedCount(res.data.flags.length);
    } catch (err) {
      setCheckError(err.response?.data?.error || 'Continuity check failed. Please try again.');
      setSidebarTab('bible');
    } finally {
      setChecking(false);
    }
  }

  // ── Metadata save ────────────────────────────────────────────────────────
  async function saveMetadata() {
    try {
      const res = await api.put(`/stories/${id}`, metaForm);
      setStory(prev => ({ ...prev, ...res.data }));
      setMetaModalOpen(false);
    } catch (err) {
      console.error('Failed to save metadata:', err);
    }
  }

  // ── File upload ──────────────────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/stories/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Reload the story to get the newly extracted text
      const res = await api.get(`/stories/${id}`);
      setRawText(res.data.content?.raw_text || '');
      setSaveState('saved');
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <InlineLoading description="Loading story…" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#525252', marginBottom: '1rem' }}>Story not found.</p>
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const saveLabel = {
    saved: 'Saved',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    error: 'Save failed',
  }[saveState];

  const saveColor = {
    saved: '#24a148',
    saving: '#0f62fe',
    unsaved: '#f1c21b',
    error: '#da1e28',
  }[saveState];

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <Header aria-label="CanonVault" style={{ backgroundColor: '#011261' }}>
        <HeaderGlobalAction
          aria-label="Back to dashboard"
          tooltipAlignment="start"
          onClick={() => navigate('/dashboard')}
          style={{ color: '#ffffff' }}
        >
          <ArrowLeft size={20} style={{ color: '#ffffff', fill: '#ffffff' }} />
        </HeaderGlobalAction>
        <HeaderName prefix="" style={{ padding: '0 1rem' }}>
          <img src="/logo-wordmark.png.png" alt="CanonVault" style={{ height: '36px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }} />
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Sign out"
            tooltipAlignment="end"
            onClick={handleLogout}
            style={{ color: '#ffffff' }}
          >
            <Logout size={20} style={{ color: '#ffffff', fill: '#ffffff' }} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {/* ── Toolbar ── */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          {story?.genre && <Tag type="blue" size="sm">{story.genre}</Tag>}
          {story?.status && (
            <Tag type={story.status === 'published' ? 'green' : 'gray'} size="sm">
              {story.status}
            </Tag>
          )}
          <Button
            kind="ghost"
            size="sm"
            renderIcon={SettingsAdjust}
            onClick={() => setMetaModalOpen(true)}
          >
            Edit Details
          </Button>
        </div>
        <div style={styles.toolbarRight}>
          <span style={{ fontSize: '0.75rem', color: saveColor, fontWeight: '500' }}>
            {saveLabel}
          </span>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Save}
            onClick={() => { clearTimeout(saveTimer.current); saveContent(rawText); }}
          >
            Save
          </Button>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="cv-upload-btn"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={styles.uploadBtn}
          >
            {uploading
              ? <InlineLoading description="Uploading…" />
              : <><Upload size={16} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />Upload File</>
            }
          </button>

          {/* AI Process button */}
          <Button
            kind="primary"
            size="sm"
            renderIcon={processing ? undefined : MagicWand}
            onClick={handleProcessWithAI}
            disabled={processing || checking}
          >
            {processing ? <InlineLoading description="Processing…" /> : 'Process with AI'}
          </Button>

          {/* Check Continuity button */}
          <Button
            kind="danger--ghost"
            size="sm"
            onClick={handleCheckContinuity}
            disabled={checking || processing}
          >
            {checking ? <InlineLoading description="Checking…" /> : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Check Continuity
                {unresolvedCount > 0 && (
                  <span style={styles.flagBadge}>{unresolvedCount}</span>
                )}
              </span>
            )}
          </Button>

          {/* View public page button — only shown when published */}
          {existingBook?.id && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => window.open(`/book/${existingBook.id}`, '_blank')}
            >
              View Public Page ↗
            </Button>
          )}

          {/* Publish button */}
          <button
            className="cv-publish-btn"
            style={styles.publishBtn}
            onClick={() => setPublishModalOpen(true)}
          >
            {existingBook ? 'Manage Publish' : '🌐 Publish'}
          </button>
        </div>
      </div>

      {/* Published banner */}
      {publishedBookId && (
        <InlineNotification
          kind="success"
          title={imagesGenerating ? 'Published — storyboard images generating…' : 'Story published!'}
          subtitle={
            <span>
              Your story is live.{' '}
              <a
                href={`/book/${publishedBookId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0f62fe', fontWeight: '600' }}
              >
                View Public Page →
              </a>
              {imagesGenerating && (
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#393939', marginTop: '0.4rem', lineHeight: '1.5' }}>
                  🖼 <strong>Storyboard images are being generated in the background.</strong> Click <em>View Public Page</em> above, then wait about 1 minute and refresh to see your storyboard.
                </span>
              )}
            </span>
          }
          onCloseButtonClick={() => { setPublishedBookId(null); setImagesGenerating(false); }}
        />
      )}

      {/* Notifications */}
      {uploadError && (
        <InlineNotification
          kind="error"
          title="Upload failed:"
          subtitle={uploadError}
          onCloseButtonClick={() => setUploadError('')}
        />
      )}
      {processError && (
        <InlineNotification
          kind="error"
          title="AI error:"
          subtitle={processError}
          onCloseButtonClick={() => setProcessError('')}
        />
      )}
      {checkError && (
        <InlineNotification
          kind="error"
          title="Continuity check error:"
          subtitle={checkError}
          onCloseButtonClick={() => setCheckError('')}
        />
      )}

      {/* ── Main layout: editor + bible panel ── */}
      <div style={styles.editorLayout}>
        {/* Text editor pane */}
        <div style={styles.editorPane}>
          <div style={styles.editorMeta}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={styles.wordCount}>
                {rawText.trim() ? rawText.trim().split(/\s+/).length.toLocaleString() : 0} words
              </p>
              {formattedText && (
                <Toggle
                  id="view-toggle"
                  labelText=""
                  labelA="Raw"
                  labelB="AI Formatted"
                  toggled={showFormatted}
                  onToggle={val => setShowFormatted(val)}
                  size="sm"
                />
              )}
            </div>
          </div>

          {showFormatted && formattedText ? (
            /* Read-only formatted view */
            <div style={styles.formattedView}>
              {formattedText.split('\n').map((para, i) =>
                para.trim() ? <p key={i} style={styles.formattedPara}>{para}</p> : <br key={i} />
              )}
            </div>
          ) : (
            <textarea
              style={styles.textarea}
              value={rawText}
              onChange={handleTextChange}
              placeholder="Start writing your story here, or upload a .txt / .docx file above…"
              spellCheck
            />
          )}
        </div>

        {/* Sidebar — tabbed: Story Bible / Continuity / Collaborators */}
        <div style={styles.biblePane}>
          {/* Tab switcher */}
            <div style={styles.sidebarTabs}>
              <button
                className={`cv-sidebar-tab${sidebarTab === 'bible' ? ' cv-sidebar-tab--active' : ''}`}
                style={styles.sidebarTab}
                onClick={() => setSidebarTab('bible')}
              >
                Bible
              </button>
              <button
                className={`cv-sidebar-tab${sidebarTab === 'continuity' ? ' cv-sidebar-tab--active' : ''}`}
                style={styles.sidebarTab}
                onClick={() => setSidebarTab('continuity')}
              >
                Continuity
                {unresolvedCount > 0 && (
                  <span style={styles.tabBadge}>{unresolvedCount}</span>
                )}
              </button>
              <button
                className={`cv-sidebar-tab${sidebarTab === 'collab' ? ' cv-sidebar-tab--active' : ''}`}
                style={styles.sidebarTab}
                onClick={() => setSidebarTab('collab')}
              >
                Collab
              </button>
            </div>

          {/* Tab content */}
          {sidebarTab === 'bible' && <StoryBiblePanel storyId={id} />}
          {sidebarTab === 'continuity' && (
            <ContinuityPanel
              storyId={id}
              checking={checking}
              onCheckComplete={count => setUnresolvedCount(count)}
            />
          )}
          {sidebarTab === 'collab' && (
            <CollaboratorsPanel
              storyId={id}
              isOwner={story?.user_id !== undefined && story?.access_role !== 'collaborator'}
            />
          )}
        </div>
      </div>

      {/* ── Edit Story Details modal ── */}
      <Modal
        open={metaModalOpen}
        modalHeading="Edit Story Details"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestSubmit={saveMetadata}
        onRequestClose={() => setMetaModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <TextInput
            id="meta-title"
            labelText="Title *"
            value={metaForm.title}
            onChange={e => setMetaForm(p => ({ ...p, title: e.target.value }))}
          />
          <Select
            id="meta-genre"
            labelText="Genre"
            value={metaForm.genre}
            onChange={e => setMetaForm(p => ({ ...p, genre: e.target.value }))}
          >
            <SelectItem value="" text="Select a genre" />
            {GENRES.map(g => <SelectItem key={g} value={g} text={g} />)}
          </Select>
          <Select
            id="meta-status"
            labelText="Status"
            value={metaForm.status}
            onChange={e => setMetaForm(p => ({ ...p, status: e.target.value }))}
          >
            {STATUSES.map(s => <SelectItem key={s} value={s} text={s.charAt(0).toUpperCase() + s.slice(1)} />)}
          </Select>
          <TextInput
            id="meta-synopsis"
            labelText="Synopsis"
            value={metaForm.synopsis}
            onChange={e => setMetaForm(p => ({ ...p, synopsis: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ── Publish modal ── */}
      {story && (
        <PublishModal
          open={publishModalOpen}
          story={story}
          existingBook={existingBook}
          onClose={() => setPublishModalOpen(false)}
          onPublished={(book, generatingImages) => {
            if (!book?.id) return;
            setExistingBook(book);
            setStory(prev => ({ ...prev, status: book.is_wip ? 'wip' : 'published' }));
            setPublishedBookId(book.id);
            if (generatingImages) setImagesGenerating(true);
          }}
          onUnpublished={() => {
            setExistingBook(null);
            setStory(prev => ({ ...prev, status: 'draft' }));
          }}
        />
      )}

      {/* ── AI Processing progress overlay ── */}
      {processing && (
        <div style={styles.aiOverlay}>
          <div style={styles.aiPopup}>
            <div style={styles.aiPopupHeader}>
              <MagicWand size={20} style={{ color: '#011261', flexShrink: 0 }} />
              <span style={styles.aiPopupTitle}>Processing with IBM Granite AI</span>
            </div>
            <div style={styles.aiStepsList}>
              {AI_STEPS.map((s, i) => {
                const done    = i < aiStep;
                const current = i === aiStep;
                return (
                  <div key={i} style={{ ...styles.aiStepRow, opacity: i > aiStep ? 0.35 : 1 }}>
                    <span style={styles.aiStepIcon}>
                      {done    ? '✓' : current ? '⟳' : '○'}
                    </span>
                    <span style={{ ...styles.aiStepLabel, fontWeight: current ? '600' : '400', color: current ? '#011261' : done ? '#24a148' : '#525252' }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={styles.aiPopupHint}>This usually takes 20–40 seconds…</p>
          </div>
        </div>
      )}

      {/* ── AI Result Summary modal ── */}
      <Modal
        open={aiResultModalOpen}
        modalHeading="✦ AI Processing Complete"
        primaryButtonText="Done"
        onRequestSubmit={() => setAiResultModalOpen(false)}
        onRequestClose={() => setAiResultModalOpen(false)}
        passiveModal
      >
        <div style={{ padding: '0.5rem 0', fontSize: '0.9rem', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '1rem', color: '#525252' }}>
            Your text has been formatted and your Story Bible has been auto-populated.
            Use the <strong>AI Formatted</strong> toggle above the editor to view the result.
          </p>
          {extractedSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={styles.aiSummaryBlock}>
                <strong>Characters found:</strong>{' '}
                {extractedSummary.characters?.length
                  ? extractedSummary.characters.map(c => c.name).join(', ')
                  : 'None detected'}
              </div>
              <div style={styles.aiSummaryBlock}>
                <strong>Settings found:</strong>{' '}
                {extractedSummary.settings?.length
                  ? extractedSummary.settings.map(s => s.name).join(', ')
                  : 'None detected'}
              </div>
              <div style={styles.aiSummaryBlock}>
                <strong>Plot points found:</strong>{' '}
                {extractedSummary.plotPoints?.length
                  ? extractedSummary.plotPoints.map(p => p.title).join(', ')
                  : 'None detected'}
              </div>
            </div>
          )}
          <p style={{ marginTop: '1rem', color: '#8d8d8d', fontSize: '0.8rem' }}>
            Check the Story Bible panel to review and edit the extracted entries.
          </p>
        </div>
      </Modal>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  toolbar: {
    marginTop: '64px', // Carbon Header height (overridden to 64px)
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    borderBottom: '1px solid #e0e0e0',
    background: '#fff',
    flexWrap: 'wrap',
    gap: '0.5rem',
    flexShrink: 0,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  editorLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  editorPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#fafafa',
  },
  editorMeta: {
    padding: '0.4rem 1.25rem',
    borderBottom: '1px solid #e0e0e0',
    background: '#fff',
    flexShrink: 0,
  },
  wordCount: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#8d8d8d',
  },
  textarea: {
    flex: 1,
    width: '100%',
    padding: '2rem 3rem',
    fontSize: '1rem',
    lineHeight: '1.8',
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: '#161616',
    background: '#fff',
    border: 'none',
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box',
    overflowY: 'auto',
    maxWidth: '800px',
    alignSelf: 'center',
    boxShadow: '0 0 0 1px #e0e0e0',
  },
  biblePane: {
    width: '360px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #e0e0e0',
    overflow: 'hidden',
  },
  bibleHeader: {
    padding: '0.75rem 1rem',
    background: '#161616',
    flexShrink: 0,
  },
  bibleTitle: {
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  formattedView: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem 3rem',
    maxWidth: '800px',
    alignSelf: 'center',
    width: '100%',
    boxSizing: 'border-box',
    background: '#fffef5',
    boxShadow: '0 0 0 1px #e0d9b0',
  },
  formattedPara: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    lineHeight: '1.8',
    color: '#161616',
    margin: '0 0 1rem',
  },
  aiSummaryBlock: {
    background: '#f4f4f4',
    padding: '0.6rem 0.9rem',
    borderRadius: '2px',
    fontSize: '0.875rem',
    color: '#393939',
  },
  uploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 1rem',
    height: '32px',
    fontSize: '0.875rem',
    fontWeight: '400',
    cursor: 'pointer',
    border: '1px solid rgba(1,18,97,0.55)',
    borderRadius: '2px',
    background: 'transparent',
    color: '#011261',
    transition: 'background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
  },
  publishBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 1rem',
    height: '32px',
    fontSize: '0.875rem',
    fontWeight: '400',
    cursor: 'pointer',
    border: '1.5px solid #011261',
    borderRadius: '2px',
    background: 'transparent',
    color: '#011261',
    transition: 'background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
  },
  sidebarTabs: {
    display: 'flex',
    background: '#011261',
    flexShrink: 0,
  },
  sidebarTab: {
    flex: 1,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: '500',
    padding: '0.6rem 0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    transition: 'background 0.25s ease, box-shadow 0.25s ease, color 0.25s ease',
  },
  aiOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPopup: {
    background: '#fff',
    borderRadius: '6px',
    padding: '2rem 2.25rem',
    width: '360px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  aiPopupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  aiPopupTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#011261',
  },
  aiStepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.7rem',
  },
  aiStepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    transition: 'opacity 0.4s ease',
  },
  aiStepIcon: {
    width: '1.1rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  aiStepLabel: {
    fontSize: '0.875rem',
    lineHeight: '1.4',
    transition: 'color 0.3s ease, font-weight 0.3s ease',
  },
  aiPopupHint: {
    fontSize: '0.78rem',
    color: '#8d8d8d',
    margin: 0,
    textAlign: 'center',
  },
  tabBadge: {
    background: '#da1e28',
    color: '#fff',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.05rem 0.4rem',
    minWidth: '1.1rem',
    textAlign: 'center',
  },
  flagBadge: {
    background: '#da1e28',
    color: '#fff',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.05rem 0.4rem',
    minWidth: '1.1rem',
    textAlign: 'center',
  },
};
