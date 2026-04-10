import { useState } from 'react'
import ConfirmButton from './ConfirmButton'
import './ScheduleCard.css'

// Displays a single schedule entry with enable/disable, run-now, and delete actions.
// System tasks show a [system] badge and hide mutating actions.
function ScheduleCard({ schedule: s, onDelete, onToggle, onRun }) {
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState(null)
  const [runError, setRunError] = useState(false)

  async function handleRun() {
    setRunning(true)
    setRunMsg(null)
    setRunError(false)
    try {
      await onRun(s.id)
      setRunMsg('Triggered')
      setRunError(false)
    } catch (e) {
      setRunMsg(e.message || 'Error')
      setRunError(true)
    } finally {
      setRunning(false)
      setTimeout(() => { setRunMsg(null); setRunError(false) }, 3000)
    }
  }

  return (
    <div className={`schedule-card${s.enabled ? '' : ' schedule-card--disabled'}`}>
      <div className="schedule-card-header">
        <div className="schedule-card-header-left">
          <span className="schedule-id">{s.id}</span>
          <div className="schedule-badges">
            <span className="schedule-badge schedule-badge--mode">{s.mode}</span>
            <code className="schedule-timing">{s.timing}</code>
            {s.system && <span className="schedule-badge schedule-badge--system">system</span>}
            {!s.enabled && <span className="schedule-badge schedule-badge--off">disabled</span>}
          </div>
        </div>
        <span className="schedule-last-run">
          {s.lastRun ? `Last run: ${new Date(s.lastRun).toLocaleString()}` : 'Never run'}
        </span>
      </div>

      {!s.system && (
        <div className="schedule-card-body">
          <span className="schedule-detail-label">Channel</span>
          <span className="schedule-detail-value">#{s.channelName}</span>
          <span className="schedule-detail-label">Message</span>
          <span className="schedule-detail-value schedule-payload">{s.payload}</span>
        </div>
      )}

      <div className="schedule-card-footer">
        <span className={`schedule-run-msg${runError ? ' schedule-run-msg--error' : ''}`} aria-live="polite">{runMsg ?? ''}</span>
        <button
          className="btn schedule-run-btn"
          onClick={handleRun}
          disabled={running}
          type="button"
        >
          {running ? 'Running…' : 'Run'}
        </button>
        {!s.system && (
          <>
            <button
              className={`btn${s.enabled ? ' schedule-disable-btn' : ''}`}
              onClick={() => onToggle(s.id, !s.enabled)}
              type="button"
            >
              {s.enabled ? 'Disable' : 'Enable'}
            </button>
            <ConfirmButton label="Delete" onConfirm={() => onDelete(s.id)} />
          </>
        )}
      </div>
    </div>
  )
}

export default ScheduleCard
