import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Filter from './pages/Filter'
import BannedList from './pages/BannedList'
import Logs from './pages/Logs'
import Stats from './pages/Stats'
import Tickets from './pages/Tickets'
import Config from './pages/Config'
import { api } from './api'
import './App.css'

const PAGES = {
  dashboard: Dashboard,
  filter: Filter,
  banned: BannedList,
  stats: Stats,
  logs: Logs,
  tickets: Tickets,
  config: Config,
}

function App() {
  const [page, setPage] = useState('dashboard')
  const [ticketCount, setTicketCount] = useState(0)
  const Page = PAGES[page] ?? Dashboard

  useEffect(() => {
    async function check() {
      try {
        const tickets = await api.getTickets()
        setTicketCount(tickets.length)
      } catch { /* ignore */ }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <Layout page={page} onNavigate={setPage} ticketBadge={ticketCount}>
      <Page onTicketDeleted={page === 'tickets' ? () => setTicketCount((c) => Math.max(0, c - 1)) : undefined} />
    </Layout>
  )
}

export default App
