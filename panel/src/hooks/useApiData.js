import { useState, useEffect, useRef, useCallback } from 'react'

// Fetches data from an async function, managing loading/error/data state.
// Pass deps to re-fetch when values change (e.g. [date] for log pagination).
export function useApiData(fetchFn, initial = null, deps = []) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const hasData = useRef(false)
  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const load = useCallback(() => {
    if (!hasData.current) setLoading(true)
    setError(null)
    fetchFnRef.current()
      .then((result) => {
        hasData.current = true
        setData(result)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { hasData.current = false; load() }, [load])

  return { data, setData, loading, error, setError, refetch: load }
}
