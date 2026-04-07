import { useState, useEffect } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function Logs() {
  const [date, setDate] = useState(todayDate())
  const [filter, setFilter] = useState('ALL')
  const { data: lines, loading, error, refetch } = useApiData(() => api.getLogs(date), [], [date])

  const filtered = filter === 'ALL' ? (lines ?? []) : (lines ?? []).filter((l) => l.level === filter)
  const visible = [...filtered].reverse()

  // Poll every 5s when viewing today's log
  useEffect(() => {
    if (date !== todayDate()) return
    const id = setInterval(refetch, 5000)
    return () => clearInterval(id)
  }, [date, refetch])

  return (
    <>
      <h1 className="page-title">Logs</h1>
      <div className="log-controls">
        <input
          type="date"
          value={date}
          max={todayDate()}
          onChange={(e) => setDate(e.target.value)}
        />
        {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
          <button
            key={lvl}
            className={`btn${filter === lvl ? '' : ' secondary'}`}
            style={filter !== lvl ? { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' } : {}}
            onClick={() => setFilter(lvl)}
          >
            {lvl}
          </button>
        ))}
        <span className="log-count">
          {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {error && <p className="error-text">{error}</p>}

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
