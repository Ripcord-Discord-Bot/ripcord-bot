import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import Card from '../components/Card'

const SECTIONS = [
  {
    title: 'General',
    fields: [
      { key: 'commandPrefix', label: 'Command Prefix', type: 'text' },
    ],
  },
  {
    title: 'Channels',
    fields: [
      { key: 'chatChannel',      label: 'Chat Channel',      type: 'text' },
      { key: 'moderatorChannel', label: 'Moderator Channel', type: 'text' },
      { key: 'ticketChannel',    label: 'Ticket Channel',    type: 'text' },
      { key: 'welcomeChannel',   label: 'Welcome Channel',   type: 'text' },
    ],
  },
  {
    title: 'Roles',
    fields: [
      { key: 'moderatorRole', label: 'Moderator Role', type: 'text' },
      { key: 'trustedRole',   label: 'Trusted Role',   type: 'text' },
    ],
  },
  {
    title: 'Features',
    fields: [
      { key: 'enableFiltering',   label: 'Word Filtering',  type: 'toggle' },
      { key: 'enableTickets',     label: 'Tickets',         type: 'toggle' },
      { key: 'enableConsole',     label: 'Console Logging', type: 'toggle' },
      { key: 'enableFileLogging', label: 'File Logging',    type: 'toggle' },
    ],
  },
  {
    title: 'AI',
    fields: [
      { key: 'ollamaModel', label: 'Ollama Model', type: 'text' },
    ],
  },
]

function Config() {
  const { data: saved, setData: setSaved, loading, error: loadError } = useApiData(api.getConfig)
  const [local, setLocal] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved2, setSaved2] = useState(false)

  useEffect(() => {
    if (saved) setLocal(saved)
  }, [saved])

  function handleChange(key, value) {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setSaved2(false)
  }

  async function handleSave() {
    if (!saved) return
    setSaving(true)
    setSaveError(null)
    setSaved2(false)
    try {
      const changed = Object.fromEntries(
        Object.keys(local)
          .filter((k) => String(local[k]) !== String(saved[k]))
          .map((k) => [k, local[k]])
      )
      if (Object.keys(changed).length === 0) return
      await api.saveConfig(changed)
      setSaved({ ...local })
      setSaved2(true)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function isDirty() {
    return saved && Object.keys(local).some((k) => String(local[k]) !== String(saved[k]))
  }

  if (loading) return <p className="empty">Loading...</p>
  if (loadError) return <p className="error-text">{loadError}</p>

  return (
    <>
      <div className="config-header">
        <h1 className="page-title" style={{ margin: 0 }}>Configuration</h1>
        <div className="config-header-right">
          {saved2 && <span className="config-saved">Saved — restart bot to apply</span>}
          {saveError && <span className="error-text" style={{ margin: 0 }}>{saveError}</span>}
          <button className="btn" onClick={handleSave} disabled={saving || !isDirty()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} title={section.title}>
          {section.fields.map((field) => (
            <div className="config-row" key={field.key}>
              <label className="config-label" htmlFor={field.key}>{field.label}</label>
              {field.type === 'toggle' ? (
                <button
                  id={field.key}
                  className={`config-toggle${local[field.key] ? ' on' : ''}`}
                  onClick={() => handleChange(field.key, !local[field.key])}
                  role="switch"
                  aria-checked={!!local[field.key]}
                >
                  <span className="config-toggle-thumb" />
                </button>
              ) : (
                <input
                  id={field.key}
                  className="config-input"
                  type="text"
                  value={local[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </Card>
      ))}
    </>
  )
}

export default Config
