import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(undefined)

const STORAGE_KEY = 'intervai-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    setLoading(false)
  }, [])

  const persist = (u) => {
    setUser(u)
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const login = async (credentials) => {
    const u = await authService.login(credentials)
    persist(u)
    return u
  }

  const register = async (data) => {
    const u = await authService.register(data)
    persist(u)
    return u
  }

  const logout = () => {
    persist(null)
  }

  const updateProfile = (patch) => {
    persist({ ...user, ...patch })
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, register, logout, updateProfile }}
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
