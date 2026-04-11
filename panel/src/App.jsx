import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Filter from './pages/Filter'
import AutoKicker from './pages/AutoKicker'
import BannedUsers from './pages/BannedUsers'
import Logs from './pages/Logs'
import Stats from './pages/Stats'
import Tickets from './pages/Tickets'
import Config from './pages/Config'
import Scheduler from './pages/Scheduler'
import { api } from './api'
import './App.css'

import Invites from './pages/Invites'

const PAGES = {
  stats: Stats,
  filter: Filter,
  autokicker: AutoKicker,
  bannedusers: BannedUsers,
  invites: Invites,
  logs: Logs,
  tickets: Tickets,
  config: Config,
  scheduler: Scheduler,
}

function App() {
  const [page, setPage] = useState('stats')
  const [tickets, setTickets] = useState([])
  const [botOnline, setBotOnline] = useState(null)

  useEffect(() => {
    async function check() {
      try {
        const data = await api.getTickets()
        setTickets(data)
        setBotOnline(true)
      } catch {
        setBotOnline(false)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  function handleTicketDeleted() {
    setTickets((prev) => prev.slice(0, Math.max(0, prev.length - 1)))
  }

  return (
    <Layout page={page} onNavigate={setPage} ticketBadge={tickets.length} botOnline={botOnline}>
      {Object.entries(PAGES).map(([id, Page]) => (
        <div key={id} style={id === page ? undefined : { display: 'none' }}>
          <Page
            tickets={id === 'stats' ? tickets : undefined}
            onTicketDeleted={id === 'tickets' ? handleTicketDeleted : undefined}
          />
        </div>
      ))}
    </Layout>
  )
}

export default App
