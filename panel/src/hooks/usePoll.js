import { useEffect } from 'react'

// Polls fn every interval ms. Re-registers when deps change.
// Pass deps as the third argument (same contract as useEffect).
export function usePoll(fn, interval, deps = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setInterval(fn, interval)
    return () => clearInterval(id)
  }, deps)
}
