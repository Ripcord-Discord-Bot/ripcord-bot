import './StatusIndicator.css'

function StatusIndicator({ online }) {
  const state = online === true ? 'online' : online === false ? 'offline' : 'connecting'
  const label = online === true ? 'API Connected' : online === false ? 'API Offline' : 'Connecting…'

  return (
    <div className={`status-indicator status-indicator--${state}`}>
      <span className="status-indicator__dot" />
      <span className="status-indicator__label">{label}</span>
    </div>
  )
}

export default StatusIndicator
