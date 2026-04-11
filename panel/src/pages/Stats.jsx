import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import { usePoll } from '../hooks/usePoll'
import Card from '../components/Card'
import ChartCard from '../components/ChartCard'
import LineChart from '../components/LineChart'
import BarChart from '../components/BarChart'
import StockChart from '../components/StockChart'
import CandlestickChart from '../components/CandlestickChart'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatGrid from '../components/StatGrid'
import StatSection from '../components/StatSection'
import CountTable from '../components/CountTable'
import PieChart from '../components/PieChart'

function Stats({ tickets = null }) {
  const { data: stats, error, refetch } = useApiData(api.getStats)
  const { data: schedules, refetch: refetchSchedules } = useApiData(api.getSchedules, [])
  const { data: history = [] } = useApiData(() => api.getStatsHistory(30), [])

  usePoll(() => { refetch(); refetchSchedules() }, 10000)

  const fmt = (key) => stats ? (stats[key] ?? 0).toLocaleString() : null

  const userSchedules   = schedules ? schedules.filter((s) => !s.system) : null
  const activeSchedules = userSchedules ? userSchedules.filter((s) => s.enabled) : null
  const systemSchedules = schedules ? schedules.filter((s) => s.system) : null

  const historyPoint = (key) =>
    history.map((h) => ({ label: h.date?.slice(5) ?? '', value: h.stats?.[key] ?? 0 }))

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
        <ChartCard title="Daily Messages">
          <BarChart data={historyPoint('messages')} color="var(--accent)" />
        </ChartCard>
        <ChartCard title="Commands Run Trend">
          <LineChart data={historyPoint('commandsRun')} color="var(--accent)" />
        </ChartCard>
      </StatSection>

      <StatSection title="Members">
        <StatGrid>
          <StatCard label="Member Count" value={fmt('memberCount')} accent="blue" />
          <StatCard label="Users Joined" value={fmt('newUsers')} accent="green" />
          <StatCard label="Users Left" value={fmt('usersLeft')} accent="red" />
        </StatGrid>
        <ChartCard title="Member Count">
          <StockChart data={historyPoint('memberCount')} height={160} />
        </ChartCard>
        <ChartCard title="Member Count (Candlestick)">
          <CandlestickChart data={historyPoint('memberCount')} height={180} />
        </ChartCard>
        <ChartCard title="Daily Joins">
          <BarChart data={historyPoint('newUsers')} color="var(--success)" />
        </ChartCard>
      </StatSection>

      <StatSection title="Moderation">
        <StatGrid>
          <StatCard label="Filtered Messages" value={fmt('filteredMessages')} accent="yellow" />
          <StatCard label="Kicked Members" value={fmt('bannedUsersKicked')} accent="red" />
        </StatGrid>
        <ChartCard title="Daily Filtered Messages">
          <BarChart data={historyPoint('filteredMessages')} color="var(--warning)" />
        </ChartCard>
      </StatSection>

      <StatSection title="Tickets">
        <StatGrid>
          <StatCard label="Created" value={fmt('ticketsCreated')} accent="blue" />
          <StatCard label="Resolved" value={fmt('ticketsResolved')} accent="green" />
          <StatCard label="Open Tickets" value={tickets ? tickets.length.toLocaleString() : null} accent="yellow" />
        </StatGrid>
        <ChartCard title="Daily Tickets Created">
          <BarChart data={historyPoint('ticketsCreated')} color="#3b82f6" />
        </ChartCard>
      </StatSection>

      <StatSection title="Roles">
        <ChartCard title="Members per Role">
          {!stats
            ? <p className="empty">Loading...</p>
            : (() => {
                const roleEntries = Object.entries(stats.roleCounts ?? {}).map(([label, value]) => ({ label, value }))
                const roleTotal   = roleEntries.reduce((s, d) => s + d.value, 0)
                const unassigned  = (stats.memberCount ?? 0) - roleTotal
                const pieData     = unassigned > 0
                  ? [...roleEntries, { label: 'No Role', value: unassigned }]
                  : roleEntries
                return <PieChart data={pieData} />
              })()
          }
        </ChartCard>
      </StatSection>
    </>
  )
}

export default Stats

