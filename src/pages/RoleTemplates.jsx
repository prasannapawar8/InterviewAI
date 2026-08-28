import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  Copy,
  X,
  GripVertical,
  FileText,
  Scale,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import PageTransition from '../components/ui/PageTransition'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { templateService } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'

const EMPTY = {
  name: '',
  roleTitle: '',
  description: '',
  questionPack: '',
  rubricInstructions: '',
  competencies: [
    { label: 'Communication', weight: 3 },
    { label: 'Problem solving', weight: 3 },
    { label: 'Technical depth', weight: 3 },
    { label: 'Collaboration', weight: 3 },
    { label: 'Ownership', weight: 3 },
    { label: 'Culture add', weight: 3 },
  ],
}

const MAX_COMPETENCIES = 8

function WeightDots({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Competency weight">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`Weight ${n}`}
          className={cn(
            'h-6 w-6 rounded-full border text-[10px] font-bold transition-all duration-200',
            n <= value
              ? 'border-primary bg-primary text-white shadow-sm scale-100'
              : 'border-line bg-surface-2 text-ink-subtle hover:border-primary/40',
            disabled && 'cursor-default',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function CompetencyRow({ item, index, onUpdate, onRemove, disabled, isOnly }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 rounded-xl border border-line/50 bg-surface-2/50 p-3"
    >
      <GripVertical className="h-4 w-4 shrink-0 text-ink-subtle/50" />
      <input
        value={item.label}
        onChange={(e) => onUpdate(index, { ...item, label: e.target.value })}
        disabled={disabled}
        placeholder="Competency name"
        className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-ink placeholder:text-ink-subtle focus:border-line focus:bg-surface focus-ring"
      />
      <div className="hidden sm:block">
        <WeightDots
          value={item.weight}
          onChange={(w) => onUpdate(index, { ...item, weight: w })}
          disabled={disabled}
        />
      </div>
      <div className="block sm:hidden">
        <select
          value={item.weight}
          onChange={(e) => onUpdate(index, { ...item, weight: Number(e.target.value) })}
          disabled={disabled}
          className="h-8 rounded-lg border border-line bg-surface px-1 text-xs"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              W{n}
            </option>
          ))}
        </select>
      </div>
      {!disabled && !isOnly && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-3 hover:text-danger"
          aria-label={`Remove ${item.label}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  )
}

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  )
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
  const [expandedCards, setExpandedCards] = useState(new Set())

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
    const weights = row.competencyWeights || {}
    setForm({
      name: row.name,
      roleTitle: row.roleTitle || '',
      description: row.description || '',
      questionPack: row.questionPack || '',
      rubricInstructions: row.rubricInstructions || '',
      competencies: (row.competencies || []).map((label) => ({
        label,
        weight: weights[label] ?? 3,
      })),
    })
  }

  const save = async (e) => {
    e.preventDefault()
    if (form.competencies.filter((c) => c.label.trim().length >= 2).length === 0) {
      toast.error('At least one competency is required')
      return
    }
    setSaving(true)
    try {
      const competencies = form.competencies
        .filter((c) => c.label.trim().length >= 2)
        .map((c) => c.label.trim())
      const competencyWeights = {}
      form.competencies
        .filter((c) => c.label.trim().length >= 2)
        .forEach((c) => {
          competencyWeights[c.label.trim()] = c.weight
        })
      const body = {
        name: form.name,
        roleTitle: form.roleTitle,
        description: form.description,
        questionPack: form.questionPack,
        rubricInstructions: form.rubricInstructions,
        competencies,
        competencyWeights,
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

  const clone = async (row) => {
    try {
      await templateService.clone(row.id)
      toast.success('Template cloned', `"${row.name} (copy)" was created.`)
      await load()
    } catch (err) {
      toast.error('Could not clone template', err.message)
    }
  }

  const updateCompetency = (index, updated) => {
    setForm((f) => {
      const next = [...f.competencies]
      next[index] = updated
      return { ...f, competencies: next }
    })
  }

  const removeCompetency = (index) => {
    setForm((f) => ({
      ...f,
      competencies: f.competencies.filter((_, i) => i !== index),
    }))
  }

  const addCompetency = () => {
    if (form.competencies.length >= MAX_COMPETENCIES) {
      toast.error('Maximum 8 competencies allowed')
      return
    }
    setForm((f) => ({
      ...f,
      competencies: [...f.competencies, { label: '', weight: 3 }],
    }))
  }

  const toggleExpand = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const questionCount = (pack) =>
    (pack || '')
      .split('\n')
      .filter((l) => l.trim().length >= 8).length

  return (
    <PageTransition>
      <PageHeader
        title="Role templates"
        subtitle="Build custom rubrics with weighted competencies, question packs, and AI instructions."
        actions={
          canEdit ? (
            <Button variant="gradient" onClick={startCreate}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          ) : null
        }
      />

      {/* ─── Editor ─── */}
      <AnimatePresence>
        {editing && canEdit ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="mb-6 border border-primary/20">
              <h2 className="text-lg font-semibold text-ink">
                {editing === 'new' ? '✨ New rubric template' : '✏️ Edit rubric template'}
              </h2>
              <form onSubmit={save} className="mt-5 space-y-6">
                {/* Header fields */}
                <div>
                  <SectionLabel icon={FileText} label="Template info" />
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
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    maxLength={300}
                    placeholder="Short description shown on the template card (optional)"
                    className="mt-3 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm focus-ring"
                  />
                </div>

                {/* Rubric instructions */}
                <div>
                  <SectionLabel icon={Sparkles} label="AI Rubric Instructions" />
                  <p className="mb-2 text-xs text-ink-muted">
                    Describe what a strong vs. weak candidate looks like. These instructions are injected into the AI
                    engine when analysing interviews with this template.
                  </p>
                  <textarea
                    value={form.rubricInstructions}
                    onChange={(e) => setForm((f) => ({ ...f, rubricInstructions: e.target.value }))}
                    rows={4}
                    maxLength={4000}
                    placeholder="e.g. Evaluate depth of systems knowledge, ability to debug under pressure, and clarity when explaining trade-offs. Strong candidates own incidents end to end and quantify blast radius."
                    className="w-full rounded-xl border border-line bg-surface-2 p-3 text-sm focus-ring"
                  />
                </div>

                {/* Competency builder */}
                <div>
                  <SectionLabel icon={Scale} label={`Competency scorecard (${form.competencies.length}/${MAX_COMPETENCIES})`} />
                  <p className="mb-3 text-xs text-ink-muted">
                    Rate each competency weight from 1 (minor) to 5 (critical). Weights influence the scorecard average.
                  </p>
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {form.competencies.map((item, i) => (
                        <CompetencyRow
                          key={`${i}-${item.label}`}
                          item={item}
                          index={i}
                          onUpdate={updateCompetency}
                          onRemove={removeCompetency}
                          disabled={false}
                          isOnly={form.competencies.length === 1}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                  {form.competencies.length < MAX_COMPETENCIES && (
                    <button
                      type="button"
                      onClick={addCompetency}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add competency
                    </button>
                  )}
                </div>

                {/* Question pack */}
                <div>
                  <SectionLabel icon={MessageSquare} label="Question pack" />
                  <textarea
                    value={form.questionPack}
                    onChange={(e) => setForm((f) => ({ ...f, questionPack: e.target.value }))}
                    rows={6}
                    placeholder="Expected questions — one per line"
                    className="w-full rounded-xl border border-line bg-surface-2 p-3 text-sm focus-ring"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-line pt-4">
                  <Button type="submit" variant="gradient" loading={saving}>
                    Save template
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ─── Template grid ─── */}
      {loading ? (
        <p className="text-sm text-ink-muted">Loading templates…</p>
      ) : items.length === 0 ? (
        <Card className="py-12 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 font-semibold text-ink">No templates yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create a rubric for each role you hire for.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((row) => {
            const expanded = expandedCards.has(row.id)
            const weights = row.competencyWeights || {}
            const qCount = questionCount(row.questionPack)
            return (
              <Card key={row.id} className="group relative overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-ink">{row.name}</h3>
                    <p className="text-sm text-ink-muted">{row.roleTitle || 'Any role'}</p>
                    {row.description && (
                      <p className="mt-1 text-xs text-ink-subtle line-clamp-2">{row.description}</p>
                    )}
                  </div>
                  {canEdit ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
                        onClick={() => clone(row)}
                        aria-label={`Clone ${row.name}`}
                        title="Clone template"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
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

                {/* Stats row */}
                <div className="mt-3 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Scale className="h-3 w-3" />
                    {(row.competencies || []).length} competencies
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/8 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                    <MessageSquare className="h-3 w-3" />
                    {qCount} question{qCount !== 1 ? 's' : ''}
                  </span>
                  {row.rubricInstructions && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-2.5 py-1 text-[11px] font-semibold text-accent">
                      <Sparkles className="h-3 w-3" />
                      AI rubric
                    </span>
                  )}
                </div>

                {/* Expand/collapse */}
                <button
                  type="button"
                  onClick={() => toggleExpand(row.id)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" /> Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" /> Show details
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3 border-t border-line pt-3">
                        {/* Competencies with weights */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Scorecard</p>
                          <div className="mt-2 space-y-1.5">
                            {(row.competencies || []).map((label) => (
                              <div key={label} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-ink-muted">{label}</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <div
                                      key={n}
                                      className={cn(
                                        'h-2 w-2 rounded-full',
                                        n <= (weights[label] || 3)
                                          ? 'bg-primary'
                                          : 'bg-line',
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Questions preview */}
                        {row.questionPack && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Questions</p>
                            <ul className="mt-1 space-y-1">
                              {row.questionPack.split('\n').filter((l) => l.trim()).slice(0, 5).map((q, i) => (
                                <li key={i} className="text-xs text-ink-muted">• {q.trim()}</li>
                              ))}
                              {row.questionPack.split('\n').filter((l) => l.trim()).length > 5 && (
                                <li className="text-xs text-ink-subtle">
                                  +{row.questionPack.split('\n').filter((l) => l.trim()).length - 5} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Rubric instructions preview */}
                        {row.rubricInstructions && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                              AI rubric instructions
                            </p>
                            <p className="mt-1 text-xs text-ink-muted line-clamp-3">
                              {row.rubricInstructions}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      )}
    </PageTransition>
  )
}
