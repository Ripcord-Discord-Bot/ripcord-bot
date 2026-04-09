import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatGrid from '../components/StatGrid'

function Dashboard() {
  const { data: stats, error } = useApiData(api.getStats)

  return (
    <>
      <PageHeader title="Dashboard" />
      <Card title="Bot Status">
        {error
          ? <p className="error-text">API unavailable: {error}</p>
          : <p className="status-ok">API connected</p>
        }
      </Card>
      <StatGrid>
        <StatCard label="Messages Logged" value={stats ? stats.messages.toLocaleString() : null} />
        <StatCard label="Users Joined" value={stats ? stats.newUsers.toLocaleString() : null} accent="green" />
      </StatGrid>
    </>
  )
}

export default Dashboard
