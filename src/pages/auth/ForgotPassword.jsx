import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, MailCheck } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { authService } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { validate, validators } from '../../utils/validation'

const SCHEMA = {
  email: [validators.required('Email is required'), validators.email()],
}

export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    const errs = validate({ email }, SCHEMA)
    setError(errs.email || '')
    if (errs.email) return

    setLoading(true)
    try {
      await authService.forgotPassword({ email })
      setSent(true)
      toast.success('Reset link sent', `Check ${email} for instructions.`)
    } catch {
      toast.error('Something went wrong', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/10">
          <MailCheck className="h-8 w-8 text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-ink">Check your inbox</h1>
        <p className="mt-2 text-ink-muted">
          We&apos;ve sent a password reset link to{' '}
          <span className="font-semibold text-ink">{email}</span>. The link expires in 30 minutes.
        </p>
        <Button
          variant="outline"
          fullWidth
          className="mt-8"
          onClick={() => {
            setSent(false)
            setEmail('')
          }}
        >
          Use a different email
        </Button>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Forgot password?</h1>
      <p className="mt-2 text-ink-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError('')
          }}
          error={error}
          autoComplete="email"
        />
        <Button type="submit" variant="gradient" size="lg" fullWidth loading={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </motion.div>
  )
}
