import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Button,
  TextInput,
  TextArea,
  Modal,
  InlineLoading,
  Tag,
  IconButton,
} from '@carbon/react';
import { Add, Edit, TrashCan, Checkmark, Close } from '@carbon/icons-react';
import api from '../services/api';

// ─── Reusable inline edit card ────────────────────────────────────────────────
function BibleCard({ item, fields, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...item });

  function startEdit() {
    setForm({ ...item });
    setEditing(true);
  }

  async function save() {
    await onSave(item.id, form);
    setEditing(false);
  }

  return (
    <div style={cardStyles.wrapper}>
      {editing ? (
        <div style={cardStyles.editBody}>
          {fields.map(f => (
            f.multiline
              ? <TextArea key={f.key} labelText={f.label} rows={3}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              : <TextInput key={f.key} labelText={f.label}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          ))}
          <div style={cardStyles.editActions}>
            <Button size="sm" renderIcon={Checkmark} onClick={save}>Save</Button>
            <Button size="sm" kind="ghost" renderIcon={Close} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div style={cardStyles.viewBody}>
          <div style={cardStyles.viewMain}>
            <strong style={cardStyles.viewTitle}>{item[fields[0].key]}</strong>
            {fields.slice(1).map(f => item[f.key] && (
              <p key={f.key} style={cardStyles.viewDetail}>
                <span style={cardStyles.fieldLabel}>{f.label}:</span> {item[f.key]}
              </p>
            ))}
          </div>
          <div style={cardStyles.viewActions}>
            <IconButton label="Edit" kind="ghost" size="sm" onClick={startEdit}>
              <Edit size={16} />
            </IconButton>
            <IconButton label="Delete" kind="ghost" size="sm" onClick={() => onDelete(item.id)}>
              <TrashCan size={16} />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Generic add modal ────────────────────────────────────────────────────────
function AddModal({ open, title, fields, onClose, onAdd }) {
  const empty = fields.reduce((a, f) => ({ ...a, [f.key]: f.type === 'boolean' ? false : '' }), {});
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setForm(empty); setError(''); } }, [open]);

  async function handleSubmit() {
    if (!form[fields[0].key]?.trim()) {
      setError(`${fields[0].label} is required`);
      return;
    }
    await onAdd(form);
    onClose();
  }

  return (
    <Modal open={open} modalHeading={title}
      primaryButtonText="Add" secondaryButtonText="Cancel"
      onRequestSubmit={handleSubmit} onRequestClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
        {fields.map(f => {
          if (f.type === 'boolean') return (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))} />
              {f.label}
            </label>
          );
          if (f.multiline) return (
            <TextArea key={f.key} id={`add-${f.key}`} labelText={f.label} rows={3}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          );
          return (
            <TextInput key={f.key} id={`add-${f.key}`} labelText={f.label}
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              invalid={!!error && f.key === fields[0].key} invalidText={error} />
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function StoryBiblePanel({ storyId }) {
  const [characters, setCharacters] = useState([]);
  const [settings, setSettings] = useState([]);
  const [plotPoints, setPlotPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(null); // 'character' | 'setting' | 'plot'

  useEffect(() => {
    loadAll();
  }, [storyId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, s, p] = await Promise.all([
        api.get(`/stories/${storyId}/characters`),
        api.get(`/stories/${storyId}/settings`),
        api.get(`/stories/${storyId}/plot-points`),
      ]);
      setCharacters(c.data);
      setSettings(s.data);
      setPlotPoints(p.data);
    } catch (err) {
      console.error('Failed to load bible data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Characters
  async function addCharacter(form) {
    const res = await api.post(`/stories/${storyId}/characters`, form);
    setCharacters(p => [...p, res.data]);
  }
  async function saveCharacter(id, form) {
    const res = await api.put(`/stories/${storyId}/characters/${id}`, form);
    setCharacters(p => p.map(c => c.id === id ? res.data : c));
  }
  async function deleteCharacter(id) {
    await api.delete(`/stories/${storyId}/characters/${id}`);
    setCharacters(p => p.filter(c => c.id !== id));
  }

  // Settings
  async function addSetting(form) {
    const res = await api.post(`/stories/${storyId}/settings`, form);
    setSettings(p => [...p, res.data]);
  }
  async function saveSetting(id, form) {
    const res = await api.put(`/stories/${storyId}/settings/${id}`, form);
    setSettings(p => p.map(s => s.id === id ? res.data : s));
  }
  async function deleteSetting(id) {
    await api.delete(`/stories/${storyId}/settings/${id}`);
    setSettings(p => p.filter(s => s.id !== id));
  }

  // Plot points
  async function addPlotPoint(form) {
    const next = plotPoints.length > 0 ? Math.max(...plotPoints.map(p => p.sequence_order)) + 1 : 1;
    const res = await api.post(`/stories/${storyId}/plot-points`, { ...form, sequence_order: next });
    setPlotPoints(p => [...p, res.data]);
  }
  async function savePlotPoint(id, form) {
    const res = await api.put(`/stories/${storyId}/plot-points/${id}`, form);
    setPlotPoints(p => p.map(pp => pp.id === id ? res.data : pp));
  }
  async function deletePlotPoint(id) {
    await api.delete(`/stories/${storyId}/plot-points/${id}`);
    setPlotPoints(p => p.filter(pp => pp.id !== id));
  }

  const characterFields = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'traits', label: 'Traits', multiline: true },
    { key: 'arc_notes', label: 'Arc Notes', multiline: true },
  ];
  const settingFields = [
    { key: 'name', label: 'Name' },
    { key: 'time_period', label: 'Time Period' },
    { key: 'description', label: 'Description', multiline: true },
  ];
  const plotFields = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description', multiline: true },
    { key: 'is_spoiler', label: 'Spoiler', type: 'boolean' },
  ];

  if (loading) return <InlineLoading description="Loading story bible…" style={{ padding: '1rem' }} />;

  return (
    <div style={panelStyles.wrapper}>
      <Tabs>
        <TabList aria-label="Story Bible">
          <Tab>Characters ({characters.length})</Tab>
          <Tab>Settings ({settings.length})</Tab>
          <Tab>Plot Points ({plotPoints.length})</Tab>
        </TabList>
        <TabPanels>

          {/* ── Characters ── */}
          <TabPanel>
            <div style={panelStyles.section}>
              <Button size="sm" renderIcon={Add} onClick={() => setAddModal('character')}>
                Add Character
              </Button>
              <div style={panelStyles.list}>
                {characters.length === 0
                  ? <p style={panelStyles.empty}>No characters yet. Add your first one.</p>
                  : characters.map(c => (
                      <BibleCard key={c.id} item={c} fields={characterFields}
                        onSave={saveCharacter} onDelete={deleteCharacter} />
                    ))
                }
              </div>
            </div>
          </TabPanel>

          {/* ── Settings ── */}
          <TabPanel>
            <div style={panelStyles.section}>
              <Button size="sm" renderIcon={Add} onClick={() => setAddModal('setting')}>
                Add Setting
              </Button>
              <div style={panelStyles.list}>
                {settings.length === 0
                  ? <p style={panelStyles.empty}>No settings yet. Add your first one.</p>
                  : settings.map(s => (
                      <BibleCard key={s.id} item={s} fields={settingFields}
                        onSave={saveSetting} onDelete={deleteSetting} />
                    ))
                }
              </div>
            </div>
          </TabPanel>

          {/* ── Plot Points ── */}
          <TabPanel>
            <div style={panelStyles.section}>
              <Button size="sm" renderIcon={Add} onClick={() => setAddModal('plot')}>
                Add Plot Point
              </Button>
              <div style={panelStyles.list}>
                {plotPoints.length === 0
                  ? <p style={panelStyles.empty}>No plot points yet. Add your first one.</p>
                  : plotPoints.map(pp => (
                      <div key={pp.id} style={{ position: 'relative' }}>
                        {pp.is_spoiler && (
                          <Tag type="red" size="sm" style={{ marginBottom: '0.25rem' }}>Spoiler</Tag>
                        )}
                        <BibleCard item={pp} fields={plotFields}
                          onSave={savePlotPoint} onDelete={deletePlotPoint} />
                      </div>
                    ))
                }
              </div>
            </div>
          </TabPanel>

        </TabPanels>
      </Tabs>

      {/* Add modals */}
      <AddModal open={addModal === 'character'} title="Add Character"
        fields={characterFields} onClose={() => setAddModal(null)} onAdd={addCharacter} />
      <AddModal open={addModal === 'setting'} title="Add Setting"
        fields={settingFields} onClose={() => setAddModal(null)} onAdd={addSetting} />
      <AddModal open={addModal === 'plot'} title="Add Plot Point"
        fields={plotFields} onClose={() => setAddModal(null)} onAdd={addPlotPoint} />
    </div>
  );
}

const panelStyles = {
  wrapper: {
    height: '100%',
    overflowY: 'auto',
    background: '#f4f4f4',
    borderLeft: '1px solid #e0e0e0',
  },
  section: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  empty: {
    color: '#6f6f6f',
    fontSize: '0.875rem',
    margin: 0,
  },
};

const cardStyles = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    padding: '0.75rem',
  },
  viewBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  viewMain: { flex: 1 },
  viewTitle: {
    fontSize: '0.9rem',
    display: 'block',
    marginBottom: '0.25rem',
    color: '#161616',
  },
  viewDetail: {
    fontSize: '0.8rem',
    color: '#525252',
    margin: '0.1rem 0',
    lineHeight: '1.4',
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#393939',
  },
  viewActions: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },
  editBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  editActions: {
    display: 'flex',
    gap: '0.5rem',
  },
};
