import React, { useState, useRef } from 'react';
import {
  Modal,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Toggle,
  Checkbox,
  InlineNotification,
} from '@carbon/react';
import api from '../services/api';

const AUDIENCES = ['Adult', 'Young Adult', 'Middle Grade', 'Children', 'All Ages'];

export default function PublishModal({ open, story, onClose, onPublished, onUnpublished, existingBook }) {
  const isUpdate = !!existingBook;
  const isMounted = useRef(true);
  React.useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [form, setForm] = useState({
    hook:             existingBook?.hook            || story?.synopsis || '',
    genre_display:    existingBook?.genre_display   || story?.genre    || '',
    audience_display: existingBook?.audience_display || '',
    external_link:    existingBook?.external_link   || '',
    is_wip:           existingBook != null ? existingBook.is_wip : true,
  });
  const [regenerateImages, setRegenerateImages] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState('');

  async function handlePublish() {
    if (!form.hook?.trim()) {
      setError('A hook / description is required');
      return;
    }
    setError('');
    setPublishing(true);
    try {
      const res = await api.post('/publish', {
        storyId: story.id,
        ...form,
        regenerate_images: !isUpdate || regenerateImages,
      });
      if (res.data.book) {
        const generatingImages = res.data.generatingImages === true;
        // Store a flag in sessionStorage so the StoryEditor can show the
        // correct banner after the page reloads.
        sessionStorage.setItem(
          'publishSuccess',
          JSON.stringify({ bookId: res.data.book.id, generatingImages })
        );
        // Reload the page — this cleanly remounts the component tree and
        // avoids the Carbon Modal unmount crash that causes the white screen.
        window.location.reload();
      } else {
        onClose();
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err.response?.data?.error || 'Failed to publish. Please try again.');
        setPublishing(false);
      }
    }
  }

  async function handleUnpublish() {
    setUnpublishing(true);
    try {
      await api.delete(`/publish/${story.id}`);
      onUnpublished();
      onClose();
    } catch (err) {
      if (isMounted.current) {
        setError(err.response?.data?.error || 'Failed to unpublish.');
        setUnpublishing(false);
      }
    }
  }

  return (
    <Modal
      open={open}
      modalHeading={isUpdate ? 'Update Public Profile' : '🌐 Publish Your Story'}
      primaryButtonText={publishing ? 'Publishing…' : isUpdate ? 'Update' : 'Publish'}
      secondaryButtonText="Cancel"
      onRequestSubmit={handlePublish}
      onRequestClose={onClose}
      primaryButtonDisabled={publishing || unpublishing}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
        {error && (
          <InlineNotification
            kind="error"
            title="Error:"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
          />
        )}

        <TextArea
          id="pub-hook"
          labelText="Public Hook / Description *"
          helperText="This is the first thing readers will see on the browse page."
          rows={4}
          value={form.hook}
          onChange={e => setForm(p => ({ ...p, hook: e.target.value }))}
          invalid={!!error && !form.hook?.trim()}
          invalidText="A hook is required"
        />

        <TextInput
          id="pub-genre"
          labelText="Genre (public display)"
          value={form.genre_display}
          onChange={e => setForm(p => ({ ...p, genre_display: e.target.value }))}
          placeholder={story?.genre || 'e.g. Fantasy, Sci-Fi'}
        />

        <Select
          id="pub-audience"
          labelText="Target Audience"
          value={form.audience_display}
          onChange={e => setForm(p => ({ ...p, audience_display: e.target.value }))}
        >
          <SelectItem value="" text="Select audience (optional)" />
          {AUDIENCES.map(a => <SelectItem key={a} value={a} text={a} />)}
        </Select>

        <TextInput
          id="pub-link"
          labelText="External Link (optional)"
          helperText="Link to Amazon, Wattpad, AO3, etc."
          value={form.external_link}
          onChange={e => setForm(p => ({ ...p, external_link: e.target.value }))}
          placeholder="https://"
        />

        <Toggle
          id="pub-wip"
          labelText="Status"
          labelA="Complete"
          labelB="Work in Progress"
          toggled={form.is_wip}
          onToggle={val => setForm(p => ({ ...p, is_wip: val }))}
        />

        {isUpdate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Checkbox
              id="regenerate-images"
              labelText="Regenerate storyboard images from current plot points"
              checked={regenerateImages}
              onChange={(_, { checked }) => setRegenerateImages(checked)}
            />
            <p style={{ fontSize: '0.8rem', color: '#6f6f6f', margin: 0 }}>
              Check this to regenerate AI storyboard images. This may take up to a minute.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: '#6f6f6f', margin: 0 }}>
            On first publish, storyboard images will be generated from your non-spoiler plot points. This may take a moment.
          </p>
        )}

        {/* Unpublish option for existing books */}
        {isUpdate && (
          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#525252', marginBottom: '0.75rem' }}>
              Want to remove this story from public view?
            </p>
            <button
              onClick={handleUnpublish}
              disabled={unpublishing}
              style={unpublishBtnStyle}
            >
              {unpublishing ? 'Unpublishing…' : 'Unpublish this story'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

const unpublishBtnStyle = {
  background: 'none',
  border: '1px solid #da1e28',
  color: '#da1e28',
  padding: '0.4rem 0.9rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  borderRadius: '2px',
};
