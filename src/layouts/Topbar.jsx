import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ThemeToggle from '../components/ui/ThemeToggle'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ onMenuClick }) {
  const { user, memberships = [], logout, switchOrg } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-xl lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          placeholder="Search interviews, candidates…"
          className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-11 pr-4 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink focus-ring"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1 pr-2 transition-colors hover:bg-surface-3 focus-ring"
          >
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <span className="hidden text-sm font-medium text-ink sm:block">
              {user?.name?.split(' ')[0]}
            </span>
            {user?.orgName && (
              <span className="hidden max-w-[140px] truncate text-xs text-ink-muted lg:block">
                {user.orgName}
              </span>
            )}
            <ChevronDown className="hidden h-4 w-4 text-ink-subtle sm:block" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-card"
              >
                <div className="border-b border-line p-3">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                  {user?.orgName && <p className="truncate text-xs text-ink-subtle">{user.orgName}</p>}
                </div>
            {memberships.length > 1 && (
              <div className="border-b border-line p-1.5">
                {memberships.map((m) => (
                  <button
                    key={m.orgId}
                    onClick={async () => {
                      setMenuOpen(false)
                      await switchOrg(m.orgId)
                      window.location.reload()
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
                  >
                    <span className="truncate">{m.name}</span>
                    {m.orgId === user?.orgId && <span className="text-xs text-primary">Current</span>}
                  </button>
                ))}
              </div>
            )}
                <div className="p-1.5">
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
                  >
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
