import './Layout.css'
import StatusIndicator from './StatusIndicator'

const NAV = [
  { id: 'stats', label: 'Statistics' },
  { id: 'filter', label: 'Word Filter' },
  { id: 'autokicker', label: 'Auto Kicker' },
  { id: 'bannedusers', label: 'Banned Users' },
  { id: 'invites', label: 'Invites' },
  { id: 'logs', label: 'Logs' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'config', label: 'Configuration' },
]

function Layout({ page, onNavigate, ticketBadge, botOnline, children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            Rip<span>cord</span>
          </div>
          <StatusIndicator online={botOnline} />
        </div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item${page === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
              {item.id === 'tickets' && ticketBadge > 0 && (
                <span className="nav-badge">{ticketBadge}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}

export default Layout
