import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { templateService } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  name: '',
  roleTitle: '',
  questionPack: '',
  competencies: 'Communication\nProblem solving\nTechnical depth\nCollaboration\nOwnership\nCulture add',
}

export default function RoleTemplates() {
  const toast = useToast()
  const { user } = useAuth()
  const canEdit = ['owner', 'admin', 'recruiter'].includes(user?.membershipRole)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () =>
    templateService
      .list()
      .then(setItems)
      .catch((err) => toast.error('Could not load templates', err.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const startCreate = () => {
    setEditing('new')
    setForm(EMPTY)
  }

  const startEdit = (row) => {
    setEditing(row.id)
    setForm({
      name: row.name,
      roleTitle: row.roleTitle || '',
      questionPack: row.questionPack || '',
      competencies: (row.competencies || []).join('\n'),
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name: form.name,
        roleTitle: form.roleTitle,
        questionPack: form.questionPack,
        competencies: form.competencies.split('\n'),
      }
      if (editing === 'new') await templateService.create(body)
      else await templateService.update(editing, body)
      toast.success(editing === 'new' ? 'Template created' : 'Template saved')
      setEditing(null)
      setForm(EMPTY)
      await load()
    } catch (err) {
      toast.error('Could not save template', err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    try {
      await templateService.remove(row.id)
      toast.success('Template deleted', `${row.name} was removed. Existing reports keep their scorecards.`)
      if (editing === row.id) {
        setEditing(null)
        setForm(EMPTY)
      }
      await load()
    } catch (err) {
      toast.error('Could not delete', err.message)
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Role templates"
        subtitle="Save a question pack and scorecard once, then apply it on upload or on a report."
        actions={
          canEdit ? (
            <Button variant="gradient" onClick={startCreate}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          ) : null
        }
      />

      {editing && canEdit ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-ink">
            {editing === 'new' ? 'New template' : 'Edit template'}
          </h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Template name (e.g. Backend screen)"
                className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm focus-ring"
              />
              <input
                value={form.roleTitle}
                onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
                placeholder="Default job title"
                className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm focus-ring"
              />
            </div>
            <textarea
              value={form.questionPack}
              onChange={(e) => setForm((f) => ({ ...f, questionPack: e.target.value }))}
              rows={6}
              placeholder="Expected questions — one per line"
              className="w-full rounded-xl border border-line bg-surface-2 p-3 text-sm focus-ring"
            />
            <textarea
              value={form.competencies}
              onChange={(e) => setForm((f) => ({ ...f, competencies: e.target.value }))}
              rows={6}
              placeholder="Scorecard competencies — one per line (3–8)"
              className="w-full rounded-xl border border-line bg-surface-2 p-3 text-sm focus-ring"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="gradient" loading={saving}>
                Save template
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading templates…</p>
      ) : items.length === 0 ? (
        <Card className="py-12 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 font-semibold text-ink">No templates yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create a pack for each role you hire for.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((row) => (
            <Card key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{row.name}</h3>
                  <p className="text-sm text-ink-muted">{row.roleTitle || 'Any role'}</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
                      onClick={() => startEdit(row)}
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-danger"
                      onClick={() => remove(row)}
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Scorecard</p>
              <p className="mt-1 text-sm text-ink-muted">{(row.competencies || []).join(' · ')}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Questions</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">
                {(row.questionPack || '').split('\n').filter(Boolean).length} saved
              </p>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
