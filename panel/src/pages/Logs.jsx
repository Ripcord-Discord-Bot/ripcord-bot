import { useState, useEffect } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import './Logs.css'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function Logs() {
  const [date, setDate] = useState(todayDate())
  const [filter, setFilter] = useState('ALL')
  const { data, loading, error, refetch } = useApiData(() => api.getLogs(date), { total: 0, offset: 0, lines: [] }, [date])
  const lines = data?.lines ?? []

  const filtered = filter === 'ALL' ? lines : lines.filter((l) => l.level === filter)
  const visible = [...filtered].reverse()

  // Poll every 5s when viewing today's log
  useEffect(() => {
    if (date !== todayDate()) return
    const id = setInterval(refetch, 5000)
    return () => clearInterval(id)
  }, [date, refetch])

  return (
    <>
      <PageHeader title="Logs" error={error} />
      <Card>
        <div className="log-controls">
          <input
            type="date"
            value={date}
            max={todayDate()}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="log-level-filters">
            {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                className={filter === lvl ? 'btn' : 'btn secondary'}
                onClick={() => setFilter(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
          <span className="log-count">
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </Card>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="empty">No log entries for this date.</p>
      ) : (
        <div className="log-viewer">
          {visible.map((line, i) => (
            <div className="log-line" key={i}>
              <span className="log-ts">{line.timestamp}</span>
              <span className={`log-level ${line.level}`}>{line.level}</span>
              <span className="log-msg">{line.message}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default Logs
