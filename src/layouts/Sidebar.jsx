import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  UploadCloud,
  FileBarChart2,
  Settings,
  LogOut,
  X,
  Columns2,
  Users,
  Archive,
  ClipboardList,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/upload', label: 'Upload Interview', icon: UploadCloud, end: true },
  { to: '/results', label: 'Analysis Results', icon: FileBarChart2, kind: 'live' },
  { to: '/results?archived=1', label: 'Archive', icon: Archive, kind: 'archive' },
  { to: '/compare', label: 'Compare', icon: Columns2, end: true },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/templates', label: 'Role templates', icon: ClipboardList, end: true },
  { to: '/settings', label: 'Settings', icon: Settings, end: true },
]

function navIsActive(kind, end, isActive, location) {
  const archived = new URLSearchParams(location.search).get('archived') === '1'
  if (kind === 'live') return location.pathname === '/results' && !archived
  if (kind === 'archive') return location.pathname === '/results' && archived
  return isActive
}

function NavItems({ onNavigate }) {
  const location = useLocation()
  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV.map(({ to, label, icon: Icon, end, kind }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => {
            const on = navIsActive(kind, end, isActive, location)
            return cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              on
                ? 'bg-primary/10 text-primary shadow-soft'
                : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
            )
          }}
        >
          {({ isActive }) => {
            const on = navIsActive(kind, end, isActive, location)
            return (
              <>
                <Icon className={cn('h-5 w-5 shrink-0', on && 'text-primary')} />
                <span>{label}</span>
                {on && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                  />
                )}
              </>
            )
          }}
        </NavLink>
      ))}
    </nav>
  )
}

function NewAnalysisCard({ onNavigate }) {
  return (
    <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white shadow-soft">
      <UploadCloud className="h-6 w-6" />
      <p className="mt-2 text-sm font-semibold">New analysis</p>
      <p className="mt-1 text-xs text-white/80">Upload a recording to score talk-time, STAR, and sentiment.</p>
      <Link
        to="/upload"
        onClick={onNavigate}
        className="mt-3 block w-full rounded-lg bg-white/20 px-3 py-1.5 text-center text-xs font-semibold backdrop-blur transition hover:bg-white/30"
      >
        Upload interview
      </Link>
    </div>
  )
}

function SidebarContent({ onNavigate }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>
      <div className="mt-4 flex-1 overflow-y-auto no-scrollbar">
        <NavItems onNavigate={onNavigate} />
      </div>
      <NewAnalysisCard onNavigate={onNavigate} />
      <div className="border-t border-line p-3">
        <Button variant="ghost" fullWidth className="justify-start" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile: animated drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute left-0 top-0 h-full w-72 border-r border-line bg-surface"
            >
              <button
                onClick={onClose}
                className="absolute right-3 top-4 rounded-lg p-2 text-ink-subtle hover:bg-surface-3 hover:text-ink"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
