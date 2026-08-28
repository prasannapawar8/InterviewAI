import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { validate, validators } from '../../utils/validation'

const SCHEMA = {
  email: [validators.required('Email is required'), validators.email()],
  password: [validators.required('Password is required'), validators.minLength(6)],
}

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(values, SCHEMA)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await login(values)
      toast.success('Welcome back!', 'You are now signed in.')
      navigate(from, { replace: true })
    } catch {
      toast.error('Login failed', 'Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Welcome back</h1>
      <p className="mt-2 text-ink-muted">Sign in to your IntervAI account to continue.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          value={values.email}
          onChange={onChange}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          value={values.password}
          onChange={onChange}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary focus-ring"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="gradient" size="lg" fullWidth loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>

      <p className="mt-4 rounded-lg bg-surface-3 px-3 py-2 text-center text-xs text-ink-subtle">
        Demo login: aarav.mehta@example.com / password123
      </p>
    </motion.div>
  )
}
