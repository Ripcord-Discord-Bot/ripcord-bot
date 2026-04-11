import { useState } from 'react'
import Card from './Card'

// Shared add-item form used by list management pages.
// onAdd(value) — called with the trimmed input value.
//   Return false (or throw) to keep the input populated on failure.
function InputCard({ title, placeholder, buttonLabel = 'Add', onSubmit }) {
  const [input, setInput] = useState('')

  async function handleSubmit() {
    const value = input.trim()
    if (!value) return
    const result = await onSubmit(value)
    if (result !== false) setInput('')
  }

  return (
    <Card title={title}>
      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
        />
        <button className="btn" onClick={handleSubmit} type="button">{buttonLabel}</button>
      </div>
    </Card>
  )
}

export default InputCard
