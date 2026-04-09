import { useState } from 'react'
import Card from './Card'

// Shared add-item form used by list management pages.
// onAdd(value) — called with the trimmed input value.
//   Return false (or throw) to keep the input populated on failure.
function AddItemCard({ title, placeholder, buttonLabel = 'Add', onAdd }) {
  const [input, setInput] = useState('')

  async function handleAdd() {
    const value = input.trim()
    if (!value) return
    const result = await onAdd(value)
    if (result !== false) setInput('')
  }

  return (
    <Card title={title}>
      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
        />
        <button className="btn" onClick={handleAdd} type="button">{buttonLabel}</button>
      </div>
    </Card>
  )
}

export default AddItemCard
