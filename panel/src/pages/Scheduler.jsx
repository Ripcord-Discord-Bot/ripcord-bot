import { useState } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import { usePoll } from '../hooks/usePoll'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import TaskCard from '../components/TaskCard'
import './Scheduler.css'

const EMPTY_FORM = { id: '', mode: 'interval', timing: '', channelName: '', payload: '', enabled: true }

function Scheduler() {
  const { data: tasks, setData: setTasks, loading, error, setError, refetch } = useApiData(api.getSchedules, [])
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)

  usePoll(refetch, 10_000)

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddTask() {
    setFormError(null)
    const task = {
      ...form,
      id: form.id.trim(),
      timing: form.timing.trim(),
      channelName: form.channelName.trim(),
      payload: form.payload.trim(),
    }
    if (!task.id || !task.timing || !task.channelName || !task.payload) {
      setFormError('All fields are required.')
      return
    }
    try {
      const created = await api.addTask(task)
      setTasks((prev) => [...prev, created])
      setForm(EMPTY_FORM)
    } catch (e) {
      setFormError(e.message)
    }
  }

  async function handleDeleteTask(id) {
    try {
      await api.deleteTask(id)
      setTasks((prev) => prev.filter((s) => s.id !== id))
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleToggleTask(id, enable) {
    try {
      const updated = enable ? await api.enableTask(id) : await api.disableTask(id)
      setTasks((prev) => prev.map((s) => s.id === id ? { ...s, enabled: updated.enabled } : s))
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRunTask(id) {
    await api.runTask(id)
    refetch()
  }

  const userTasks   = tasks.filter((s) => !s.system)
  const systemTasks = tasks.filter((s) =>  s.system)

  return (
    <>
      <PageHeader title="Scheduler" error={error} />

      <Card title="Add Schedule">
        {formError && <p className="error-text scheduler-form-error">{formError}</p>}
        <div className="scheduler-form">
          <div className="scheduler-form-row">
            <label>ID</label>
            <input
              value={form.id}
              onChange={(e) => setField('id', e.target.value)}
              placeholder="e.g. daily-reminder"
            />
          </div>
          <div className="scheduler-form-row">
            <label>Mode</label>
            <select value={form.mode} onChange={(e) => setField('mode', e.target.value)}>
              <option value="interval">Interval</option>
              <option value="cron">Cron</option>
            </select>
          </div>
          <div className="scheduler-form-row">
            <label>Timing</label>
            <input
              value={form.timing}
              onChange={(e) => setField('timing', e.target.value)}
              placeholder={form.mode === 'interval' ? 'e.g. 30m, 2h, 1d' : 'e.g. 0 9 * * 1'}
            />
          </div>
          <div className="scheduler-form-row">
            <label>Channel</label>
            <input
              value={form.channelName}
              onChange={(e) => setField('channelName', e.target.value)}
              placeholder="Channel name"
            />
          </div>
          <div className="scheduler-form-row scheduler-form-row--full">
            <label>Message</label>
            <textarea
              value={form.payload}
              onChange={(e) => setField('payload', e.target.value)}
              placeholder="Message to send..."
              rows={3}
            />
          </div>
          <div className="scheduler-btn-row">
            <label>
              Enabled
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setField('enabled', e.target.checked)}
              />
            </label>
            <button className="btn" onClick={handleAddTask} type="button">Add</button>
          </div>
        </div>
      </Card>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : (
        <>
          {userTasks.length > 0 && (
            <section>
              <p className="scheduler-section-label">User Schedules ({userTasks.length})</p>
              {userTasks.map((s) => (
                <TaskCard
                  key={s.id}
                  task={s}
                  onDelete={handleDeleteTask}
                  onToggle={handleToggleTask}
                  onRun={handleRunTask}
                />
              ))}
            </section>
          )}

          {userTasks.length === 0 && systemTasks.length === 0 && (
            <p className="empty">No scheduled tasks.</p>
          )}

          {systemTasks.length > 0 && (
            <section>
              <p className="scheduler-section-label">System Schedules ({systemTasks.length})</p>
              {systemTasks.map((s) => (
                <TaskCard
                  key={s.id}
                  task={s}
                  onDelete={handleDeleteTask}
                  onToggle={handleToggleTask}
                  onRun={handleRunTask}
                />
              ))}
            </section>
          )}
        </>
      )}
    </>
  )
}

export default Scheduler
