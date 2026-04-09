import './RoleCountTable.css'

function RoleCountTable({ roleCounts }) {
  const entries = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] ?? 1

  if (entries.length === 0) {
    return <p className="empty">No roles tracked yet.</p>
  }

  return (
    <div className="role-table">
      {entries.map(([role, count]) => (
        <div key={role} className="role-table-row">
          <span className="role-table-name">{role}</span>
          <div className="role-table-bar-wrap">
            <div
              className="role-table-bar"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="role-table-count">{count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default RoleCountTable
