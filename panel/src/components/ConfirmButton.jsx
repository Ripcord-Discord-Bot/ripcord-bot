import { useState } from 'react'

// Two-click confirm button. Owns its own pending state so the parent
// only needs to provide the confirmed action.
//
// className:        applied when idle
// confirmClassName: applied when awaiting confirmation (defaults to className + ' confirm')
function ConfirmButton({
  onConfirm,
  label = 'Remove',
  confirmLabel = 'Confirm?',
  className = 'btn danger',
  confirmClassName,
}) {
  const [pending, setPending] = useState(false)
  const activeClass = pending ? (confirmClassName ?? `${className} confirm`) : className

  function handleClick() {
    if (!pending) {
      setPending(true)
      return
    }
    setPending(false)
    onConfirm()
  }

  return (
    <button
      className={activeClass}
      onClick={handleClick}
      onBlur={() => setPending(false)}
      type="button"
    >
      {pending ? confirmLabel : label}
    </button>
  )
}

export default ConfirmButton
