import { useState } from 'react'
import ConfirmButton from './ConfirmButton'
import '../pages/Tickets.css'

function TicketCard({ ticket: t, onResolve }) {
  const [expanded, setExpanded] = useState(false)

  const detailRows = [
    ['Ticket ID', <code className="ticket-mono" key="id">{t.id ?? '—'}</code>],
    ['User',      t.author?.tag ?? t.author?.username ?? 'Unknown'],
    ['User ID',   <code className="ticket-mono" key="uid">{t.author?.id ?? '—'}</code>],
    ['Channel',   t.channel?.name ? `#${t.channel.name}` : '—'],
    ['Server',    t.server?.name ?? '—'],
    ['File',      <code className="ticket-mono" key="file">{t.file}</code>],
  ]

  return (
    <div className="ticket">
      <div className="ticket-header">
        <div className="ticket-header-left">
          <span className="ticket-author">{t.author?.tag ?? t.author?.username ?? 'Unknown'}</span>
          <div className="ticket-header-meta">
            {t.channel?.name && <span className="ticket-meta-badge">#{t.channel.name}</span>}
            {t.server?.name  && <span className="ticket-meta-badge">{t.server.name}</span>}
          </div>
        </div>
        <span className="ticket-date">{t.created ? new Date(t.created).toLocaleString() : ''}</span>
      </div>

      <div className="ticket-body">
        <p className="ticket-message">{t.message?.content ?? '(no content)'}</p>
      </div>

      <div className="ticket-footer">
        <button className="ticket-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
        {t.message?.url && (
          <a className="ticket-link-btn" href={t.message.url} target="_blank" rel="noreferrer">
            View in Discord ↗
          </a>
        )}
        <ConfirmButton
          className="ticket-resolve"
          label="Resolve"
          confirmLabel="Resolve?"
          onConfirm={onResolve}
        />
      </div>

      {expanded && (
        <div className="ticket-expanded">
          <div className="ticket-detail-group">
            <span className="ticket-detail-title">Details</span>
            {detailRows.map(([label, value]) => (
              <div className="ticket-detail-row" key={label}>
                <span className="ticket-detail-label">{label}</span>
                <span className="ticket-detail-value">{value}</span>
              </div>
            ))}
          </div>

          <div className="ticket-detail-group">
            <span className="ticket-detail-title">AI Suggestion</span>
            <p className="ticket-suggestion-text">{t.moderatorSuggestion ?? 'No AI suggestion available.'}</p>
          </div>

          {t.attachments?.length > 0 && (
            <div className="ticket-detail-group">
              <span className="ticket-detail-title">Attachments</span>
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
  )
}

export default TicketCard
