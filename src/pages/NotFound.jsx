import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-2 px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
      <div className="absolute top-8">
        <Logo />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <h1 className="text-8xl font-extrabold text-gradient sm:text-9xl">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-ink">Page not found</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button variant="gradient">
              <Home className="h-4 w-4" /> Back to home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" /> Go to dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
