import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import { orgService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function AcceptInvite() {
  const { token } = useParams()
  const { isAuthenticated, loading, switchOrg } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await orgService.acceptInvite(token)
        if (cancelled) return
        if (res.orgId) await switchOrg(res.orgId)
        setStatus('ok')
        toast.success('Invite accepted', 'You have joined the workspace.')
        navigate('/dashboard', { replace: true })
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          toast.error('Could not accept invite', err.message)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, loading, token, navigate, switchOrg, toast])

  if (loading) return null

  if (!isAuthenticated) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-ink">You’re invited</h1>
        <p className="mt-2 text-ink-muted">Sign in with the invited email address to join this workspace.</p>
        <div className="mt-6 flex gap-3">
          <Link to="/login" state={{ from: { pathname: `/invite/${token}` } }}>
            <Button variant="gradient">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button variant="outline">Create account</Button>
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-bold text-ink">{status === 'error' ? 'Invite failed' : 'Joining workspace…'}</h1>
      {status === 'error' && (
        <Link to="/dashboard" className="mt-4 inline-block font-semibold text-primary">
          Go to dashboard
        </Link>
      )}
    </motion.div>
  )
}
