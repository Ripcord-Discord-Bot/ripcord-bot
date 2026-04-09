import './ApiStatus.css'

function ApiStatus({ online }) {
  const state = online === true ? 'online' : online === false ? 'offline' : 'connecting'
  const label = online === true ? 'API Connected' : online === false ? 'API Offline' : 'Connecting\u2026'

  return (
    <div className={`api-status api-status--${state}`}>
      <span className="api-status__dot" />
      <span className="api-status__label">{label}</span>
    </div>
  )
}

export default ApiStatus
