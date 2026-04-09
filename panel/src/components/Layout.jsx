import './Layout.css'
import ApiStatus from './ApiStatus'

const NAV = [
  { id: 'stats', label: 'Statistics' },
  { id: 'filter', label: 'Word Filter' },
  { id: 'banned', label: 'Banned List' },
  { id: 'logs', label: 'Logs' },
  { id: 'tickets', label: 'Tickets' },
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
          <ApiStatus online={botOnline} />
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
