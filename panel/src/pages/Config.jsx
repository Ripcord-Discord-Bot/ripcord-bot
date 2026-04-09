import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import './Config.css'
import PageHeader from '../components/PageHeader'
import ConfigSection from '../components/ConfigSection'
import ConfigRow from '../components/ConfigRow'
import ConfigToggle from '../components/ConfigToggle'

const SECTIONS = [
  {
    title: 'General',
    fields: [
      { key: 'commandPrefix', label: 'Command Prefix', hint: 'Character that triggers bot commands', type: 'text' },
    ],
  },
  {
    title: 'Channels',
    fields: [
      { key: 'chatChannel',      label: 'Chat Channel',      hint: 'General chat channel name', type: 'text' },
      { key: 'moderatorChannel', label: 'Moderator Channel', hint: 'Moderator-only channel name', type: 'text' },
      { key: 'ticketChannel',    label: 'Ticket Channel',    hint: 'Channel where tickets are created', type: 'text' },
      { key: 'welcomeChannel',   label: 'Welcome Channel',   hint: 'Channel for rules and onboarding', type: 'text' },
    ],
  },
  {
    title: 'Roles',
    fields: [
      { key: 'moderatorRole', label: 'Moderator Role', hint: 'Role name with mod permissions', type: 'text' },
      { key: 'trustedRole',   label: 'Trusted Role',   hint: 'Role assigned after rules acceptance', type: 'text' },
    ],
  },
  {
    title: 'Features',
    fields: [
      { key: 'enableFiltering',   label: 'Word Filtering',  hint: 'Auto-delete messages with filtered words', type: 'toggle' },
      { key: 'enableTickets',     label: 'Tickets',         hint: 'Create support tickets from the issues channel', type: 'toggle' },
      { key: 'enableConsole',     label: 'Console Logging', hint: 'Print log output to the terminal', type: 'toggle' },
      { key: 'enableFileLogging', label: 'File Logging',    hint: 'Write logs to disk', type: 'toggle' },
    ],
  },
  {
    title: 'AI',
    fields: [
      { key: 'ollamaModel', label: 'Ollama Model', hint: 'Local model name used for AI features', type: 'text' },
    ],
  },
]

function Config() {
  const { data: saved, setData: setSaved, loading, error: loadError } = useApiData(api.getConfig)
  const [local, setLocal] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [wasSaved, setWasSaved] = useState(false)

  useEffect(() => {
    if (saved) setLocal(saved)
  }, [saved])

  function handleChange(key, value) {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setWasSaved(false)
  }

  async function handleSave() {
    if (!saved) return
    setSaving(true)
    setSaveError(null)
    setWasSaved(false)
    try {
      const changed = Object.fromEntries(
        Object.keys(local)
          .filter((k) => String(local[k]) !== String(saved[k]))
          .map((k) => [k, local[k]])
      )
      if (Object.keys(changed).length === 0) return
      await api.saveConfig(changed)
      setSaved({ ...local })
      setWasSaved(true)
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
      <PageHeader title="Configuration" error={saveError}>
        {wasSaved && <span className="cfg-saved-notice">Saved — restart bot to apply</span>}
        <button className="btn" onClick={handleSave} disabled={saving || !isDirty()}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </PageHeader>

      {SECTIONS.map((section) => (
        <ConfigSection key={section.title} title={section.title}>
          {section.fields.map((field) => (
            <ConfigRow key={field.key} label={field.label} hint={field.hint} htmlFor={field.key}>
              {field.type === 'toggle' ? (
                <ConfigToggle
                  id={field.key}
                  checked={!!local[field.key]}
                  onChange={(val) => handleChange(field.key, val)}
                />
              ) : (
                <input
                  id={field.key}
                  className="cfg-input"
                  type="text"
                  value={local[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </ConfigRow>
          ))}
        </ConfigSection>
      ))}
    </>
  )
}

export default Config
