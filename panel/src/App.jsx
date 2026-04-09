import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Filter from './pages/Filter'
import BannedList from './pages/BannedList'
import Logs from './pages/Logs'
import Stats from './pages/Stats'
import Tickets from './pages/Tickets'
import Config from './pages/Config'
import { api } from './api'
import './App.css'

const PAGES = {
  stats: Stats,
  filter: Filter,
  banned: BannedList,
  logs: Logs,
  tickets: Tickets,
  config: Config,
}

function App() {
  const [page, setPage] = useState('stats')
  const [ticketCount, setTicketCount] = useState(0)
  const [botOnline, setBotOnline] = useState(null)
  const Page = PAGES[page] ?? Stats

  useEffect(() => {
    async function check() {
      try {
        const tickets = await api.getTickets()
        setTicketCount(tickets.length)
        setBotOnline(true)
      } catch {
        setBotOnline(false)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <Layout page={page} onNavigate={setPage} ticketBadge={ticketCount} botOnline={botOnline}>
      <Page onTicketDeleted={page === 'tickets' ? () => setTicketCount((c) => Math.max(0, c - 1)) : undefined} />
    </Layout>
  )
}

export default App
