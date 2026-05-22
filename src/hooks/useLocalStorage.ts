import { useState, useEffect, useCallback } from "react"

export function useLocalStorage<T>(key: string, initialValue: T, onError?: (msg: string) => void) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      onError?.("Could not load data from storage")
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {
      onError?.("Storage is full — changes may not be saved")
    }
  }, [key, storedValue, onError])

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch {
      onError?.("Could not clear storage")
    }
  }, [key, initialValue, onError])

  return [storedValue, setStoredValue, remove] as const
}
