import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useResource — standardised async data fetch for list views.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useResource(() => api.vehicles.list(filters), [filterKey])
 *
 * Returns the unwrapped `data` (the inner payload), plus loading/error/refetch.
 */
export function useResource(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetcherRef.current()
      if (!mounted.current) return
      if (res && res.success === false) {
        setError(res.message || 'Request failed.')
        setData(null)
      } else {
        setData(res?.data ?? res)
      }
    } catch (e) {
      if (mounted.current) setError(e?.message || 'Network error.')
    } finally {
      if (mounted.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mounted.current = true
    load()
    return () => {
      mounted.current = false
    }
  }, [load])

  return { data, loading, error, refetch: load, setData }
}

/** Debounce a rapidly-changing value (e.g. search input). */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
