import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { validate, validators, passwordStrength } from '../../utils/validation'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)

  const strength = passwordStrength(values.password)

  const schema = {
    name: [validators.required('Full name is required'), validators.minLength(2)],
    email: [validators.required('Email is required'), validators.email()],
    password: [
      validators.required('Password is required'),
      validators.minLength(8, 'Password must be at least 8 characters'),
    ],
    confirm: [
      validators.required('Please confirm your password'),
      validators.match(() => values.password, 'Passwords do not match'),
    ],
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(values, schema)
    if (!agree) errs.agree = 'You must accept the terms to continue'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await register(values)
      toast.success('Account created!', 'Welcome to IntervAI.')
      navigate('/dashboard', { replace: true })
    } catch {
      toast.error('Registration failed', 'Please try again in a moment.')
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
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Create your account</h1>
      <p className="mt-2 text-ink-muted">Start analyzing interviews in minutes — no card required.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <Input
          label="Full name"
          name="name"
          placeholder="Jane Doe"
          icon={User}
          value={values.name}
          onChange={onChange}
          error={errors.name}
          autoComplete="name"
        />
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
        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            icon={Lock}
            value={values.password}
            onChange={onChange}
            error={errors.password}
            autoComplete="new-password"
          />
          {values.password && !errors.password && (
            <div className="mt-2">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: i < strength.score ? strength.color : 'rgb(var(--surface-3))',
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs font-medium" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </div>
          )}
        </div>
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          placeholder="Re-enter your password"
          icon={Lock}
          value={values.confirm}
          onChange={onChange}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked)
                if (errors.agree) setErrors((er) => ({ ...er, agree: '' }))
              }}
              className="mt-0.5 h-4 w-4 rounded border-line text-primary focus-ring"
            />
            <span>
              I agree to the{' '}
              <a href="#" className="font-semibold text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {errors.agree && <p className="mt-1.5 text-xs font-medium text-danger">{errors.agree}</p>}
        </div>

        <Button type="submit" variant="gradient" size="lg" fullWidth loading={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
