import { useState } from 'react'
import ConfirmButton from './ConfirmButton'
import './TaskCard.css'

// Displays a single task entry with enable/disable, run-now, and delete actions.
// System tasks show a [system] badge and hide mutating actions.
function TaskCard({ task: t, onDelete, onToggle, onRun }) {
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState(null)
  const [runError, setRunError] = useState(false)

  async function handleRun() {
    setRunning(true)
    setRunMsg(null)
    setRunError(false)
    try {
      await onRun(t.id)
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
    <div className={`task-card${t.enabled ? '' : ' task-card--disabled'}`}>
      <div className="task-card-header">
        <div className="task-card-header-left">
          <span className="task-id">{t.id}</span>
          <div className="task-badges">
            <span className="task-badge task-badge--mode">{t.mode}</span>
            <code className="task-timing">{t.timing}</code>
            {t.system && <span className="task-badge task-badge--system">system</span>}
            {!t.enabled && <span className="task-badge task-badge--off">disabled</span>}
          </div>
        </div>
        <span className="task-last-run">
          {t.lastRun ? `Last run: ${new Date(t.lastRun).toLocaleString()}` : 'Never run'}
        </span>
      </div>

      {!t.system && (
        <div className="task-card-body">
          <span className="task-detail-label">Channel</span>
          <span className="task-detail-value">#{t.channelName}</span>
          <span className="task-detail-label">Message</span>
          <span className="task-detail-value task-payload">{t.payload}</span>
        </div>
      )}

      <div className="task-card-footer">
        <span className={`task-run-msg${runError ? ' task-run-msg--error' : ''}`} aria-live="polite">{runMsg ?? ''}</span>
        <button
          className="btn task-run-btn"
          onClick={handleRun}
          disabled={running}
          type="button"
        >
          {running ? 'Running…' : 'Run'}
        </button>
        {!t.system && (
          <>
            <button
              className={`btn${t.enabled ? ' task-disable-btn' : ''}`}
              onClick={() => onToggle(t.id, !t.enabled)}
              type="button"
            >
              {t.enabled ? 'Disable' : 'Enable'}
            </button>
            <ConfirmButton label="Delete" onConfirm={() => onDelete(t.id)} />
          </>
        )}
      </div>
    </div>
  )
}

export default TaskCard
