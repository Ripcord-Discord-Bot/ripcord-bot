import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import { usePoll } from '../hooks/usePoll'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatGrid from '../components/StatGrid'
import StatSection from '../components/StatSection'
import RoleCountTable from '../components/RoleCountTable'

function Stats() {
  const { data: stats, error, refetch } = useApiData(api.getStats)
  const { data: tickets, refetch: refetchTickets } = useApiData(api.getTickets, [])
  const { data: schedules, refetch: refetchSchedules } = useApiData(api.getSchedules, [])

  usePoll(() => { refetch(); refetchTickets(); refetchSchedules() }, 10000, [refetch, refetchTickets, refetchSchedules])

  const fmt = (key) => stats ? (stats[key] ?? 0).toLocaleString() : null

  const userSchedules   = schedules ? schedules.filter((s) => !s.system) : null
  const activeSchedules = userSchedules ? userSchedules.filter((s) => s.enabled) : null
  const systemSchedules = schedules ? schedules.filter((s) => s.system) : null

  return (
    <>
      <PageHeader title="Statistics" error={error} />

      <StatSection title="Scheduler">
        <StatGrid>
          <StatCard label="Tasks Run" value={fmt('tasksRun')} accent="default" />
          <StatCard label="Active Tasks" value={activeSchedules ? activeSchedules.length.toLocaleString() : null} accent="green" />
          <StatCard label="Total Tasks" value={userSchedules ? userSchedules.length.toLocaleString() : null} accent="default" />
          <StatCard label="System Tasks" value={systemSchedules ? systemSchedules.length.toLocaleString() : null} accent="default" />
        </StatGrid>
      </StatSection>

      <StatSection title="Activity">
        <StatGrid>
          <StatCard label="Messages Logged" value={fmt('messages')} accent="default" />
          <StatCard label="Commands Run" value={fmt('commandsRun')} accent="default" />
        </StatGrid>
      </StatSection>

      <StatSection title="Members">
        <StatGrid>
          <StatCard label="Users Joined" value={fmt('newUsers')} accent="green" />
          <StatCard label="Users Left" value={fmt('usersLeft')} accent="red" />
        </StatGrid>
      </StatSection>

      <StatSection title="Moderation">
        <StatGrid>
          <StatCard label="Filtered Messages" value={fmt('filteredMessages')} accent="yellow" />
          <StatCard label="Banned Users Kicked" value={fmt('bannedUsersKicked')} accent="red" />
        </StatGrid>
      </StatSection>

      <StatSection title="Tickets">
        <StatGrid>
          <StatCard label="Created" value={fmt('ticketsCreated')} accent="blue" />
          <StatCard label="Resolved" value={fmt('ticketsResolved')} accent="green" />
          <StatCard label="Open Tickets" value={tickets ? tickets.length.toLocaleString() : null} accent="yellow" />
        </StatGrid>
      </StatSection>

      <StatSection title="Roles">
        <Card>
          {!stats
            ? <p className="empty">Loading...</p>
            : <RoleCountTable roleCounts={stats.roleCounts ?? {}} />
          }
        </Card>
      </StatSection>
    </>
  )
}

export default Stats
