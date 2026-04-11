import { useEffect, useRef } from 'react'

// Polls fn every interval ms. The interval is registered once and never
// re-registered — fn is captured in a ref so callers can pass unstable
// references (inline functions, useCallback results) without side-effects.
export function usePoll(fn, interval) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    const id = setInterval(() => fnRef.current(), interval)
    return () => clearInterval(id)
  }, [interval])
}
