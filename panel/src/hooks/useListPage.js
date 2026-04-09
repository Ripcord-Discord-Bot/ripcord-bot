import { useApiData } from './useApiData'

// Manages a simple server-side list: fetch, add, and remove items.
// normalize(value) optionally transforms the value before add/duplicate-check.
export function useListPage({ fetchFn, addFn, removeFn, normalize }) {
  const { data: items, setData: setItems, loading, error, setError } = useApiData(fetchFn, [])

  async function addItem(value) {
    const v = normalize ? normalize(value) : value
    if (items.includes(v)) return false
    try {
      await addFn(v)
      setItems([...items, v])
      setError(null)
    } catch (e) {
      setError(e.message)
      return false
    }
  }

  async function removeItem(item) {
    try {
      await removeFn(item)
      setItems(items.filter((i) => i !== item))
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  return { items, loading, error, addItem, removeItem }
}
