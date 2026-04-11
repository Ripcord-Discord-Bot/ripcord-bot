import './CountTable.css'

function CountTable({ counts }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] ?? 1

  if (entries.length === 0) {
    return <p className="empty">No entries tracked yet.</p>
  }

  return (
    <div className="count-table">
      {entries.map(([label, count]) => (
        <div key={label} className="count-table-row">
          <span className="count-table-name">{label}</span>
          <div className="count-table-bar-wrap">
            <div
              className="count-table-bar"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="count-table-count">{count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default CountTable
