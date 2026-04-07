import { useState } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import Card from '../components/Card'

function BannedList() {
  const { data: ids, setData: setIds, loading, error, setError } = useApiData(api.getBanned, [])
  const [input, setInput] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)

  async function addId() {
    const id = input.trim()
    if (!id || ids.includes(id)) return
    try {
      await api.addBanned(id)
      setIds([...ids, id])
      setInput('')
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function removeId(id) {
    if (confirmRemove !== id) {
      setConfirmRemove(id)
      return
    }
    try {
      await api.removeBanned(id)
      setIds(ids.filter((i) => i !== id))
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmRemove(null)
    }
  }

  return (
    <>
      <h1 className="page-title">Banned List</h1>
      {error && <p className="error-text">{error}</p>}
      <Card title="Ban User ID">
        <div className="row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addId()}
            placeholder="Discord user ID..."
          />
          <button className="btn" onClick={addId}>Ban</button>
        </div>
      </Card>
      <Card title={`Banned Users (${ids.length})`}>
        {loading ? (
          <p className="empty">Loading...</p>
        ) : ids.length === 0 ? (
          <p className="empty">No banned users.</p>
        ) : (
          ids.map((id) => (
            <div className="list-item" key={id}>
              <code>{id}</code>
              <button
                className="btn danger"
                onClick={() => removeId(id)}
                onBlur={() => setConfirmRemove(null)}
              >
                {confirmRemove === id ? 'Confirm?' : 'Unban'}
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  )
}

export default BannedList
