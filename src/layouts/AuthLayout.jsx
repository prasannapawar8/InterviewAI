import { Outlet, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Sparkles, BarChart3 } from 'lucide-react'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'AI transcription with 98% accuracy' },
  { icon: BarChart3, text: 'Sentiment & confidence analytics' },
  { icon: ShieldCheck, text: 'Enterprise-grade data security' },
]

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-surface-2">
      {/* Brand panel (desktop) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-brand-gradient lg:flex">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(600px_400px_at_20%_20%,white,transparent)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Logo to="/" className="[&_span]:text-white" />
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md text-4xl font-bold leading-tight"
            >
              Turn every interview into actionable insight.
            </motion.h2>
            <p className="mt-4 max-w-md text-white/80">
              IntervAI analyzes communication, sentiment, and confidence so your team makes
              faster, fairer hiring decisions.
            </p>
            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-white/90">{text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/60">© 2026 IntervAI. All rights reserved.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6">
          <Logo to="/" className="lg:hidden" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <Outlet />
            <p className="mt-8 text-center text-sm text-ink-muted">
              <Link to="/" className="font-medium text-primary hover:underline">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
