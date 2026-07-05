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

const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Literary Fiction', 'Historical Fiction', 'Adventure', 'Other',
];

const STATUSES = ['draft', 'wip', 'published'];

const AUTO_SAVE_DELAY = 2500; // ms after last keystroke

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
  const [processError, setProcessError] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [showFormatted, setShowFormatted] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState(null);
  const [aiResultModalOpen, setAiResultModalOpen] = useState(false);

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
    setProcessing(true);
    try {
      const res = await api.post(`/stories/${id}/process-text`);
      setFormattedText(res.data.formattedText);
      setExtractedSummary(res.data.extracted);
      setShowFormatted(true);
      setAiResultModalOpen(true);
    } catch (err) {
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
      <Header aria-label="CanonVault">
        <HeaderGlobalAction
          aria-label="Back to dashboard"
          tooltipAlignment="start"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={20} />
        </HeaderGlobalAction>
        <HeaderName prefix="">
          {story?.title || 'Story Editor'}
        </HeaderName>
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
          <Button
            kind="secondary"
            size="sm"
            renderIcon={uploading ? undefined : Upload}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <InlineLoading description="Uploading…" /> : 'Upload File'}
          </Button>

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

          {/* Publish button */}
          <Button
            kind="tertiary"
            size="sm"
            onClick={() => setPublishModalOpen(true)}
          >
            {existingBook ? 'Manage Publish' : '🌐 Publish'}
          </Button>
        </div>
      </div>

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
              style={{ ...styles.sidebarTab, ...(sidebarTab === 'bible' ? styles.sidebarTabActive : {}) }}
              onClick={() => setSidebarTab('bible')}
            >
              Bible
            </button>
            <button
              style={{ ...styles.sidebarTab, ...(sidebarTab === 'continuity' ? styles.sidebarTabActive : {}) }}
              onClick={() => setSidebarTab('continuity')}
            >
              Continuity
              {unresolvedCount > 0 && (
                <span style={styles.tabBadge}>{unresolvedCount}</span>
              )}
            </button>
            <button
              style={{ ...styles.sidebarTab, ...(sidebarTab === 'collab' ? styles.sidebarTabActive : {}) }}
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
          onPublished={(book) => {
            setExistingBook(book);
            setStory(prev => ({ ...prev, status: book?.is_wip ? 'wip' : 'published' }));
          }}
          onUnpublished={() => {
            setExistingBook(null);
            setStory(prev => ({ ...prev, status: 'draft' }));
          }}
        />
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
    marginTop: '48px', // Carbon Header height
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
  sidebarTabs: {
    display: 'flex',
    background: '#161616',
    flexShrink: 0,
  },
  sidebarTab: {
    flex: 1,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#c6c6c6',
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
  },
  sidebarTabActive: {
    color: '#fff',
    borderBottom: '2px solid #0f62fe',
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
