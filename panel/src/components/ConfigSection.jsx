import './ConfigSection.css'

function ConfigSection({ title, children }) {
  return (
    <section className="cfg-section">
      <h2 className="cfg-section-title">{title}</h2>
      <div className="cfg-section-body">{children}</div>
    </section>
  )
}

export default ConfigSection
