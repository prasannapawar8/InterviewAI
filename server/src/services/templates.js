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
    description: 'Technical screen for backend engineering candidates — API design, debugging, and system thinking.',
    rubricInstructions:
      'Evaluate depth of systems knowledge, ability to debug under pressure, and clarity when explaining trade-offs. Strong candidates own incidents end-to-end and quantify the blast radius.',
    competencies: ['Communication', 'Problem solving', 'Technical depth', 'Ownership', 'Collaboration'],
    competencyWeights: { Communication: 3, 'Problem solving': 5, 'Technical depth': 5, Ownership: 4, Collaboration: 3 },
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
    description: 'Leadership screen — coaching, prioritisation, and cross-functional partnering.',
    rubricInstructions:
      'Assess people leadership, ability to grow engineers, and judgment on prioritisation. Look for evidence of coaching through performance gaps and hiring bar ownership.',
    competencies: ['Communication', 'Leadership', 'Coaching', 'Prioritization', 'Collaboration', 'Judgment'],
    competencyWeights: { Communication: 4, Leadership: 5, Coaching: 5, Prioritization: 4, Collaboration: 3, Judgment: 4 },
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
    description: 'Design craft screen — user insight, stakeholder collaboration, and impact measurement.',
    rubricInstructions:
      'Focus on how the candidate uses research to drive design decisions, handles conflicting feedback, and measures design success quantitatively.',
    competencies: ['Communication', 'Craft', 'User insight', 'Collaboration', 'Culture add'],
    competencyWeights: { Communication: 3, Craft: 5, 'User insight': 5, Collaboration: 4, 'Culture add': 3 },
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

/**
 * Normalize competency weights from client input.
 * Returns { [label]: weight(1-5) } or null if no valid weights.
 */
export function normalizeCompetencyWeights(input, competencies) {
  if (!input || typeof input !== 'object') return null
  const out = {}
  let hasCustom = false
  for (const label of competencies) {
    const raw = input[label]
    if (raw != null && raw !== '') {
      const w = clampWeight(Number(raw))
      out[label] = w
      if (w !== 3) hasCustom = true
    } else {
      out[label] = 3 // default weight
    }
  }
  return hasCustom || Object.keys(out).length ? out : null
}

function clampWeight(n) {
  if (!Number.isFinite(n)) return 3
  return Math.min(5, Math.max(1, Math.round(n)))
}

export function snapshotFromTemplate(template) {
  const competencies = normalizeCompetencies(template.competencies)
  const weights = template.competencyWeights || {}
  return {
    templateId: template.id || null,
    templateName: template.name || 'Role template',
    items: competencies.map((label) => ({
      label,
      rating: null,
      weight: clampWeight(weights[label] ?? 3),
    })),
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
      weight: clampWeight(row?.weight ?? 3),
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

/**
 * Compute weighted average of scorecard ratings.
 * Items with weight use weighted mean; items without weight default to 3.
 */
export function scorecardAverage(scorecard) {
  const rated = (scorecard?.items || []).filter((i) => typeof i.rating === 'number')
  if (!rated.length) return null
  const totalWeight = rated.reduce((s, i) => s + (i.weight || 3), 0)
  if (totalWeight === 0) return null
  const weightedSum = rated.reduce((s, i) => s + i.rating * (i.weight || 3), 0)
  return Math.round((weightedSum / totalWeight) * 10) / 10
}

export function toTemplateDto(row) {
  return {
    id: row.id,
    name: row.name,
    roleTitle: row.roleTitle || '',
    description: row.description || '',
    questionPack: row.questionPack || '',
    rubricInstructions: row.rubricInstructions || '',
    competencies: normalizeCompetencies(row.competencies),
    competencyWeights: row.competencyWeights || null,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
  }
}

function clampRating(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return Math.min(5, Math.max(1, Math.round(v)))
}
