import { useEffect } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import Card from '../components/Card'

function Stats() {
  const { data: stats, error, refetch } = useApiData(api.getStats)

  useEffect(() => {
    const id = setInterval(refetch, 10000)
    return () => clearInterval(id)
  }, [refetch])

  return (
    <>
      <h1 className="page-title">Statistics</h1>
      {error && <p className="error-text">{error}</p>}
      <Card title="Messages Logged">
        <p className="stat-value">{stats ? stats.messages.toLocaleString() : '—'}</p>
      </Card>
      <Card title="New Users Joined">
        <p className="stat-value">{stats ? stats.newUsers.toLocaleString() : '—'}</p>
      </Card>
    </>
  )
}

export default Stats
