import './StatCard.css'

// accent: 'default' | 'green' | 'red' | 'yellow' | 'blue'
function StatCard({ label, value, accent = 'default' }) {
  const loading = value === null || value === undefined

  return (
    <div className={`stat-card stat-card--${accent}`}>
      <span className="stat-card-value">
        {loading ? <span className="stat-card-skeleton" /> : value}
      </span>
      <span className="stat-card-label">{label}</span>
    </div>
  )
}

export default StatCard
