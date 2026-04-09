import './ConfigToggle.css'

function ConfigToggle({ id, checked, onChange }) {
  return (
    <button
      id={id}
      className={`cfg-toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={!!checked}
      type="button"
    >
      <span className="cfg-toggle-thumb" />
    </button>
  )
}

export default ConfigToggle
