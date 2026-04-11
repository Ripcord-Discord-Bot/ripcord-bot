import { useEffect, useRef } from 'react'
import { useApiData } from './useApiData'

// Manages a simple server-side list: fetch, add, and remove items.
// normalize(value) optionally transforms the value before add/duplicate-check.
export function useListPage({ fetchFn, addFn, removeFn, normalize }) {
  const { data: items, setData: setItems, loading, error, setError, refetch } = useApiData(fetchFn, [])
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function addItem(value) {
    const v = normalize ? normalize(value) : value
    if (items.includes(v)) return false
    try {
      await addFn(v)
      if (!mounted.current) return
      setItems([...items, v])
      setError(null)
    } catch (e) {
      if (!mounted.current) return
      setError(e.message)
      return false
    }
  }

  async function removeItem(item) {
    try {
      await removeFn(item)
      if (!mounted.current) return
      setItems(items.filter((i) => i !== item))
      setError(null)
    } catch (e) {
      if (!mounted.current) return
      setError(e.message)
    }
  }

  return { items, loading, error, addItem, removeItem, refetch }
}
