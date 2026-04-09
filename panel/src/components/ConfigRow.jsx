import './ConfigRow.css'

// hint: optional sub-label shown below the main label
function ConfigRow({ label, hint, htmlFor, children }) {
  return (
    <div className="cfg-row">
      <div className="cfg-row-label-group">
        <label className="cfg-row-label" htmlFor={htmlFor}>{label}</label>
        {hint && <span className="cfg-row-hint">{hint}</span>}
      </div>
      <div className="cfg-row-control">{children}</div>
    </div>
  )
}

export default ConfigRow
