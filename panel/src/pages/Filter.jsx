import { useState } from 'react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import Card from '../components/Card'

function Filter() {
  const { data: words, setData: setWords, loading, error, setError } = useApiData(api.getFilter, [])
  const [input, setInput] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)

  async function addWord() {
    const w = input.trim().toLowerCase()
    if (!w || words.includes(w)) return
    try {
      await api.addFilter(w)
      setWords([...words, w])
      setInput('')
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function removeWord(word) {
    if (confirmRemove !== word) {
      setConfirmRemove(word)
      return
    }
    try {
      await api.removeFilter(word)
      setWords(words.filter((w) => w !== word))
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmRemove(null)
    }
  }

  return (
    <>
      <h1 className="page-title">Word Filter</h1>
      {error && <p className="error-text">{error}</p>}
      <Card title="Add Word">
        <div className="row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Enter word..."
          />
          <button className="btn" onClick={addWord}>Add</button>
        </div>
      </Card>
      <Card title={`Filtered Words (${words.length})`}>
        {loading ? (
          <p className="empty">Loading...</p>
        ) : words.length === 0 ? (
          <p className="empty">No filtered words.</p>
        ) : (
          words.map((word) => (
            <div className="list-item" key={word}>
              <span className="tag">{word}</span>
              <button
                className="btn danger"
                onClick={() => removeWord(word)}
                onBlur={() => setConfirmRemove(null)}
              >
                {confirmRemove === word ? 'Confirm?' : 'Remove'}
              </button>
            </div>
          ))
        )}
      </Card>
    </>
  )
}

export default Filter
