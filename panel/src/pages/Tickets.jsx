import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import { usePoll } from '../hooks/usePoll'
import PageHeader from '../components/PageHeader'
import TicketCard from '../components/TicketCard'

function Tickets({ onTicketDeleted }) {
  const { data: tickets, setData: setTickets, loading, error, refetch } = useApiData(api.getTickets, [])

  usePoll(refetch, 5000, [refetch])

  async function deleteConfirmed(t) {
    try {
      await api.deleteTicket(t.id ?? t.file)
      setTickets((prev) => prev.filter((x) => x.file !== t.file))
      onTicketDeleted?.()
    } catch {
      // silently fail — ticket list will still reflect truth on next load
    }
  }

  return (
    <>
      <PageHeader title="Tickets" error={error} />
      {loading ? (
        <p className="empty">Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="empty">No tickets found.</p>
      ) : (
        tickets.map((t) => (
          <TicketCard key={t.file} ticket={t} onResolve={() => deleteConfirmed(t)} />
        ))
      )}
    </>
  )
}

export default Tickets
