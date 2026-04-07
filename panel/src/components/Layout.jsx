const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'filter', label: 'Word Filter' },
  { id: 'banned', label: 'Banned List' },
  { id: 'stats', label: 'Statistics' },
  { id: 'logs', label: 'Logs' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'config', label: 'Configuration' },
]

function Layout({ page, onNavigate, ticketBadge, children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">
          Rip<span>cord</span>
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
