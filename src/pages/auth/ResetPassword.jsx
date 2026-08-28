import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { authService } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { validate, validators } from '../../utils/validation'

export default function ResetPassword() {
  const toast = useToast()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form, {
      password: [validators.required('Enter a new password'), validators.minLength(8)],
      confirm: [validators.match(() => form.password, 'Passwords do not match')],
    })
    if (!token) errs.password = 'This reset link is missing a token'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      await authService.resetPassword({ token, password: form.password })
      setDone(true)
      toast.success('Password updated', 'You can sign in with your new password.')
    } catch (err) {
      toast.error('Could not reset password', err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-2xl font-bold text-ink">Password reset</h1>
        <p className="mt-2 text-ink-muted">Your password has been updated.</p>
        <Link to="/login" className="mt-6 inline-block font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Choose a new password</h1>
      <p className="mt-2 text-ink-muted">Use at least 8 characters.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Input
          label="New password"
          name="password"
          type="password"
          icon={Lock}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          icon={Lock}
          value={form.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          error={errors.confirm}
        />
        <Button type="submit" variant="gradient" size="lg" fullWidth loading={loading}>
          Update password
        </Button>
      </form>
    </motion.div>
  )
}
