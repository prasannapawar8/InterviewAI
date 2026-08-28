import { createContext, useContext, useEffect, useState } from 'react'
import { authService, setAccessToken } from '../services/api'

const AuthContext = createContext(undefined)

const STORAGE_KEY = 'intervai-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)

  const persist = (u) => {
    setUser(u)
    if (u) {
      const { token, ...rest } = u
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, token }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const saved = stored ? JSON.parse(stored) : null
        if (saved?.token) setAccessToken(saved.token)
        const refreshed = await authService.refresh()
        if (cancelled) return
        if (refreshed?.user) {
          persist({ ...refreshed.user, token: refreshed.token })
        } else if (saved?.token) {
          try {
            const me = await authService.me()
            persist({ ...me.user, token: saved.token })
            setMemberships(me.memberships || [])
            setLoading(false)
            return
          } catch {
            persist(null)
          }
        } else {
          persist(null)
        }
        if (refreshed?.user) {
          try {
            const me = await authService.me()
            if (!cancelled) setMemberships(me.memberships || [])
          } catch {
            setMemberships([])
          }
        }
      } catch {
        persist(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (credentials) => {
    const u = await authService.login(credentials)
    persist(u)
    const me = await authService.me().catch(() => null)
    setMemberships(me?.memberships || [])
    return u
  }

  const register = async (data) => {
    const u = await authService.register(data)
    persist(u)
    const me = await authService.me().catch(() => null)
    setMemberships(me?.memberships || [])
    return u
  }

  const logout = async () => {
    await authService.logout()
    setMemberships([])
    persist(null)
  }

  const updateProfile = (patch) => {
    persist({ ...user, ...patch, token: user?.token })
  }

  const switchOrg = async (orgId) => {
    const u = await authService.switchOrg(orgId)
    persist(u)
    return u
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        switchOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
