import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import Card from '../components/Card'

function Dashboard() {
  const { data: stats, error } = useApiData(api.getStats)

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <Card title="Bot Status">
        {error
          ? <p className="error-text">API unavailable: {error}</p>
          : <p className="status-ok">API connected</p>
        }
      </Card>
      <Card title="Quick Stats">
        {stats ? (
          <>
            <p>Messages logged: <strong>{stats.messages.toLocaleString()}</strong></p>
            <p>New users joined: <strong>{stats.newUsers.toLocaleString()}</strong></p>
          </>
        ) : (
          <p className="empty">{error ? 'Unavailable' : 'Loading...'}</p>
        )}
      </Card>
    </>
  )
}

export default Dashboard
