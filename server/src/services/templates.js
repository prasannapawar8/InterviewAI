export const DEFAULT_COMPETENCIES = [
  'Communication',
  'Problem solving',
  'Technical depth',
  'Collaboration',
  'Ownership',
  'Culture add',
]

export const BUILTIN_TEMPLATES = [
  {
    name: 'Backend screen',
    roleTitle: 'Backend Engineer',
    competencies: ['Communication', 'Problem solving', 'Technical depth', 'Ownership', 'Collaboration'],
    questionPack: [
      'Tell me about a production incident you owned end to end.',
      'How do you design an API for high read traffic?',
      'Walk me through how you would debug a slow database query.',
      'Describe a time you disagreed with a design and what you did.',
      'How do you think about testing and rollback for a risky change?',
    ].join('\n'),
  },
  {
    name: 'Engineering manager',
    roleTitle: 'Engineering Manager',
    competencies: ['Communication', 'Leadership', 'Coaching', 'Prioritization', 'Collaboration', 'Judgment'],
    questionPack: [
      'Tell me about a time you coached an engineer through a performance gap.',
      'How do you set priorities when everything is urgent?',
      'Describe a hiring miss and what you changed afterward.',
      'How do you handle conflict between two senior ICs?',
      'Walk me through how you partner with product on a roadmap cut.',
    ].join('\n'),
  },
  {
    name: 'Product design',
    roleTitle: 'Product Designer',
    competencies: ['Communication', 'Craft', 'User insight', 'Collaboration', 'Culture add'],
    questionPack: [
      'Walk me through a project where research changed the design.',
      'How do you handle conflicting stakeholder feedback?',
      'Tell me about a time you simplified a complex flow.',
      'How do you partner with engineering on constraints?',
      'Describe how you measure whether a design worked.',
    ].join('\n'),
  },
]

export function normalizeCompetencies(input) {
  const raw = Array.isArray(input)
    ? input
    : String(input || '')
        .split(/\n|,/)
        .map((s) => s.trim())
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const label = String(item || '').trim().slice(0, 80)
    if (label.length < 2) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= 8) break
  }
  return out.length ? out : [...DEFAULT_COMPETENCIES]
}

export function snapshotFromTemplate(template) {
  const competencies = normalizeCompetencies(template.competencies)
  return {
    templateId: template.id || null,
    templateName: template.name || 'Role template',
    items: competencies.map((label) => ({ label, rating: null })),
  }
}

export function mergeScorecard(existing, template) {
  const next = snapshotFromTemplate(template)
  const prev = Array.isArray(existing?.items) ? existing.items : []
  const byLabel = new Map(
    prev.map((i) => [String(i.label || '').toLowerCase(), i.rating]),
  )
  for (const item of next.items) {
    const prevRating = byLabel.get(item.label.toLowerCase())
    if (typeof prevRating === 'number') item.rating = clampRating(prevRating)
  }
  return next
}

export function normalizeScorecard(input) {
  if (!input || typeof input !== 'object') return null
  const itemsIn = Array.isArray(input.items) ? input.items : []
  const items = []
  const seen = new Set()
  for (const row of itemsIn) {
    const label = String(row?.label || '').trim().slice(0, 80)
    if (label.length < 2) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      label,
      rating: row?.rating == null || row.rating === '' ? null : clampRating(row.rating),
    })
    if (items.length >= 8) break
  }
  if (!items.length) return null
  return {
    templateId: input.templateId || null,
    templateName: String(input.templateName || 'Scorecard').slice(0, 80),
    items,
  }
}

export function scorecardAverage(scorecard) {
  const rated = (scorecard?.items || []).filter((i) => typeof i.rating === 'number')
  if (!rated.length) return null
  const sum = rated.reduce((s, i) => s + i.rating, 0)
  return Math.round((sum / rated.length) * 10) / 10
}

export function toTemplateDto(row) {
  return {
    id: row.id,
    name: row.name,
    roleTitle: row.roleTitle || '',
    questionPack: row.questionPack || '',
    competencies: normalizeCompetencies(row.competencies),
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
  }
}

function clampRating(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return Math.min(5, Math.max(1, Math.round(v)))
}
