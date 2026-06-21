import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Palette, Mail, Briefcase, Building2, Monitor, Sun, Moon, Camera } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Switch from '../components/ui/Switch'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { validate, validators, passwordStrength } from '../utils/validation'
import { cn } from '../utils/cn'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

function ProfileTab() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
    company: user?.company || '',
  })
  const [saving, setSaving] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const save = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      updateProfile(form)
      setSaving(false)
      toast.success('Profile updated', 'Your changes have been saved.')
    }, 800)
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-ink">Profile information</h3>
      <p className="mt-1 text-sm text-ink-muted">Update your account details and public profile.</p>

      <div className="mt-6 flex items-center gap-5">
        <div className="relative">
          <Avatar name={form.name} size="xl" />
          <button className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-primary text-white shadow-soft hover:bg-primary-700">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <div>
          <p className="font-semibold text-ink">{form.name}</p>
          <p className="text-sm text-ink-muted">{form.role}</p>
          <button className="mt-2 text-sm font-semibold text-primary hover:underline">
            Change avatar
          </button>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 grid gap-5 sm:grid-cols-2">
        <Input label="Full name" name="name" icon={User} value={form.name} onChange={onChange} />
        <Input label="Email address" name="email" type="email" icon={Mail} value={form.email} onChange={onChange} />
        <Input label="Job title" name="role" icon={Briefcase} value={form.role} onChange={onChange} />
        <Input label="Company" name="company" icon={Building2} value={form.company} onChange={onChange} />
        <div className="sm:col-span-2 flex justify-end gap-3">
          <Button variant="outline" type="button">Cancel</Button>
          <Button variant="gradient" type="submit" loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function PasswordTab() {
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const strength = passwordStrength(form.next)

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((er) => ({ ...er, [e.target.name]: '' }))
  }

  const save = (e) => {
    e.preventDefault()
    const errs = validate(form, {
      current: [validators.required('Enter your current password')],
      next: [validators.required('Enter a new password'), validators.minLength(8)],
      confirm: [validators.match(() => form.next, 'Passwords do not match')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Password changed', 'Your password has been updated successfully.')
    }, 900)
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-ink">Change password</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Use a strong, unique password to keep your account secure.
      </p>
      <form onSubmit={save} className="mt-6 max-w-md space-y-5">
        <Input
          label="Current password"
          name="current"
          type="password"
          icon={Lock}
          value={form.current}
          onChange={onChange}
          error={errors.current}
        />
        <div>
          <Input
            label="New password"
            name="next"
            type="password"
            icon={Lock}
            value={form.next}
            onChange={onChange}
            error={errors.next}
          />
          {form.next && !errors.next && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: i < strength.score ? strength.color : 'rgb(var(--surface-3))' }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <Input
          label="Confirm new password"
          name="confirm"
          type="password"
          icon={Lock}
          value={form.confirm}
          onChange={onChange}
          error={errors.confirm}
        />
        <div className="flex justify-end">
          <Button variant="gradient" type="submit" loading={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function NotificationsTab() {
  const toast = useToast()
  const [prefs, setPrefs] = useState({
    analysisComplete: true,
    weeklyDigest: true,
    productUpdates: false,
    teamActivity: true,
    marketing: false,
  })

  const set = (key) => (val) => {
    setPrefs((p) => ({ ...p, [key]: val }))
    toast.info('Preference updated', '')
  }

  const ITEMS = [
    { key: 'analysisComplete', label: 'Analysis complete', desc: 'Notify me when an interview finishes processing.' },
    { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A summary of your interview analytics each week.' },
    { key: 'teamActivity', label: 'Team activity', desc: 'Updates when teammates run or share analyses.' },
    { key: 'productUpdates', label: 'Product updates', desc: 'New features and improvements to IntervAI.' },
    { key: 'marketing', label: 'Marketing emails', desc: 'Tips, offers, and news from our team.' },
  ]

  return (
    <Card>
      <h3 className="text-lg font-semibold text-ink">Notification preferences</h3>
      <p className="mt-1 text-sm text-ink-muted">Choose what you want to be notified about.</p>
      <div className="mt-6 divide-y divide-line">
        {ITEMS.map((item) => (
          <div key={item.key} className="py-4">
            <Switch
              label={item.label}
              description={item.desc}
              checked={prefs[item.key]}
              onChange={set(item.key)}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const OPTIONS = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]

  const handleSelect = (id) => {
    if (id === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    } else {
      setTheme(id)
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-ink">Appearance</h3>
      <p className="mt-1 text-sm text-ink-muted">Customize how IntervAI looks on your device.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const active = opt.id === theme || (opt.id === 'system' && false)
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                'flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all',
                active ? 'border-primary bg-primary/5' : 'border-line hover:border-primary/40',
              )}
            >
              <span
                className={cn(
                  'grid h-12 w-12 place-items-center rounded-xl',
                  active ? 'bg-primary text-white' : 'bg-surface-3 text-ink-muted',
                )}
              >
                <opt.icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-ink">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('profile')

  return (
    <PageTransition>
      <PageHeader title="Settings" subtitle="Manage your account, security, and preferences." />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tab nav */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-ink-muted hover:bg-surface-3 hover:text-ink',
                )}
              >
                <t.icon className="h-[18px] w-[18px]" />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* Tab content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'profile' && <ProfileTab />}
          {tab === 'password' && <PasswordTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'appearance' && <AppearanceTab />}
        </motion.div>
      </div>
    </PageTransition>
  )
}
