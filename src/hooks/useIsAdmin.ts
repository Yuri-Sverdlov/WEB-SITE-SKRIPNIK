import { useEffect, useState } from 'react'
import { fetchIsAdmin } from '../api/admin'
import { useAuth } from '../contexts/AuthProvider'

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setIsAdmin(false)
      setChecking(false)
      return
    }

    let cancelled = false
    setChecking(true)

    fetchIsAdmin().then(({ isAdmin: admin, error }) => {
      if (cancelled) return
      if (error) {
        console.warn('fetchIsAdmin failed:', error)
      }
      setIsAdmin(admin)
      setChecking(false)
    })

    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading])

  const loading = authLoading || (Boolean(user) && checking)

  return { isAdmin, loading }
}
