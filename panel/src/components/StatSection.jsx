import './StatSection.css'

function StatSection({ title, children }) {
  return (
    <section className="stat-section">
      <h2 className="stat-section-title">{title}</h2>
      {children}
    </section>
  )
}

export default StatSection
