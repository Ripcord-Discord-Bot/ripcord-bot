import './Toggle.css'

function Toggle({ id, checked, onChange }) {
  return (
    <button
      id={id}
      className={`toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={!!checked}
      type="button"
    >
      <span className="toggle-thumb" />
    </button>
  )
}

export default Toggle
