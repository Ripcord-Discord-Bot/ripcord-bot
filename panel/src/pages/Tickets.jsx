import { useState, useEffect } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'

function Tickets({ onTicketDeleted }) {
  const { data: tickets, setData: setTickets, loading, error, refetch } = useApiData(api.getTickets, [])
  const [expanded, setExpanded] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    const id = setInterval(refetch, 5000)
    return () => clearInterval(id)
  }, [refetch])

  function toggle(file) {
    setExpanded((prev) => (prev === file ? null : file))
  }

  async function handleDelete(t) {
    if (confirmDelete !== t.file) {
      setConfirmDelete(t.file)
      return
    }
    try {
      await api.deleteTicket(t.id ?? t.file)
      setTickets((prev) => prev.filter((x) => x.file !== t.file))
      if (expanded === t.file) setExpanded(null)
      onTicketDeleted?.()
    } catch {
      // silently fail — ticket list will still reflect truth on next load
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <>
      <h1 className="page-title">Tickets</h1>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="empty">Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="empty">No tickets found.</p>
      ) : (
        tickets.map((t) => (
          <div className="ticket" key={t.file}>
            <div className="ticket-titlebar">
              <span className="ticket-author">{t.author?.tag ?? t.author?.username ?? 'Unknown'}</span>
              <span className="ticket-date">{t.created ? new Date(t.created).toLocaleString() : ''}</span>
            </div>

            <div className="ticket-section">
              <span className="ticket-field-label">Message</span>
              <p className="ticket-message">{t.message?.content ?? '(no content)'}</p>
            </div>

            <div className="ticket-footer">
              <button className="ticket-toggle" onClick={() => toggle(t.file)}>
                {expanded === t.file ? '▲ Less' : '▼ AI & Details'}
              </button>
              <button
                className={`ticket-delete${confirmDelete === t.file ? ' confirm' : ''}`}
                onClick={() => handleDelete(t)}
                onBlur={() => setConfirmDelete(null)}
              >
                {confirmDelete === t.file ? 'Confirm?' : 'Delete'}
              </button>
            </div>

            {expanded === t.file && (
              <div className="ticket-expanded">
                <div className="ticket-meta">
                  <div className="ticket-field">
                    <span className="ticket-field-label">Ticket ID</span>
                    <code className="ticket-field-value ticket-field-mono">{t.id ?? '—'}</code>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-field-label">User</span>
                    <span className="ticket-field-value">{t.author?.tag ?? t.author?.username ?? 'Unknown'}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-field-label">User ID</span>
                    <code className="ticket-field-value ticket-field-mono">{t.author?.id ?? '—'}</code>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-field-label">Channel</span>
                    <span className="ticket-field-value">{t.channel?.name ? `#${t.channel.name}` : '—'}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-field-label">Server</span>
                    <span className="ticket-field-value">{t.server?.name ?? '—'}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-field-label">File</span>
                    <code className="ticket-field-value ticket-field-mono">{t.file}</code>
                  </div>
                  {t.message?.url && (
                    <div className="ticket-field">
                      <span className="ticket-field-label">Link</span>
                      <a className="ticket-link-btn" href={t.message.url} target="_blank" rel="noreferrer">View in Discord ↗</a>
                    </div>
                  )}
                </div>
                <div className="ticket-section ticket-section-left">
                  <span className="ticket-field-label">AI Suggestion</span>
                  <p className="ticket-suggestion-text">{t.moderatorSuggestion ?? 'No AI suggestion available.'}</p>
                </div>
                {t.attachments?.length > 0 && (
                  <div className="ticket-section">
                    <span className="ticket-field-label">Attachments</span>
                    {t.attachments.map((att) => (
                      <div className="ticket-attachment" key={att.id}>
                        <a href={att.url} target="_blank" rel="noreferrer">{att.name}</a>
                        <span className="ticket-badge">{(att.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </>
  )
}

export default Tickets
