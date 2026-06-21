import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

const ToastContext = createContext(undefined)

let idSeq = 0

const VARIANTS = {
  success: { icon: CheckCircle2, accent: 'text-success', ring: 'ring-success/30' },
  error: { icon: XCircle, accent: 'text-danger', ring: 'ring-danger/30' },
  warning: { icon: AlertTriangle, accent: 'text-warning', ring: 'ring-warning/30' },
  info: { icon: Info, accent: 'text-accent', ring: 'ring-accent/30' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 4000 }) => {
      const id = ++idSeq
      setToasts((list) => [...list, { id, title, description, variant }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  // Convenience helpers
  const api = {
    toast,
    success: (title, description) => toast({ title, description, variant: 'success' }),
    error: (title, description) => toast({ title, description, variant: 'error' }),
    warning: (title, description) => toast({ title, description, variant: 'warning' }),
    info: (title, description) => toast({ title, description, variant: 'info' }),
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const v = VARIANTS[t.variant] || VARIANTS.info
            const Icon = v.icon
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-card ring-1 ${v.ring}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${v.accent}`} />
                <div className="min-w-0 flex-1">
                  {t.title && <p className="text-sm font-semibold text-ink">{t.title}</p>}
                  {t.description && (
                    <p className="mt-0.5 text-sm text-ink-muted">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-ink-subtle transition-colors hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
