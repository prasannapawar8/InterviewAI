import { formatDuration } from '../../../utils/ids.js'
import { SENTIMENT_TRAIN } from './sentimentData.js'

const LABELS = ['positive', 'neutral', 'negative']
const NEGATORS = new Set(['not', 'no', 'never', 'nt', "n't", 'cannot', 'cant', "can't"])

export function tokenize(text) {
  const raw = String(text || '')
    .toLowerCase()
    .replace(/n't/g, ' nt ')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const tokens = []
  let negate = 0
  for (const w of raw) {
    if (NEGATORS.has(w)) {
      negate = 2
      continue
    }
    const tok = negate > 0 ? `NEG_${w}` : w
    tokens.push(tok)
    if (negate > 0) negate -= 1
  }
  const withBigrams = [...tokens]
  for (let i = 0; i < tokens.length - 1; i += 1) {
    withBigrams.push(`${tokens[i]}_${tokens[i + 1]}`)
  }
  return withBigrams
}

export function trainNaiveBayes(examples = SENTIMENT_TRAIN) {
  const classDocs = Object.fromEntries(LABELS.map((l) => [l, 0]))
  const classTokens = Object.fromEntries(LABELS.map((l) => [l, 0]))
  const counts = Object.fromEntries(LABELS.map((l) => [l, Object.create(null)]))
  const vocab = new Set()
  for (const ex of examples) {
    const label = LABELS.includes(ex.label) ? ex.label : 'neutral'
    classDocs[label] += 1
    for (const t of tokenize(ex.text)) {
      vocab.add(t)
      counts[label][t] = (counts[label][t] || 0) + 1
      classTokens[label] += 1
    }
  }
  const nDocs = examples.length || 1
  return { classDocs, classTokens, counts, vocab: [...vocab], nDocs }
}

function logProb(model, tokens, label) {
  const V = model.vocab.length || 1
  let lp = Math.log((model.classDocs[label] + 1) / (model.nDocs + LABELS.length))
  const denom = model.classTokens[label] + V
  for (const t of tokens) {
    lp += Math.log(((model.counts[label][t] || 0) + 1) / denom)
  }
  return lp
}

export function predictSentiment(text, model) {
  const tokens = tokenize(text)
  if (!tokens.length) return { label: 'neutral', scores: { positive: 0, neutral: 1, negative: 0 } }
  const logs = {}
  let max = -Infinity
  let best = 'neutral'
  for (const label of LABELS) {
    logs[label] = logProb(model, tokens, label)
    if (logs[label] > max) {
      max = logs[label]
      best = label
    }
  }
  // softmax over log-space for a simple confidence readout
  const exps = LABELS.map((l) => Math.exp(logs[l] - max))
  const sum = exps.reduce((s, n) => s + n, 0)
  const scores = Object.fromEntries(LABELS.map((l, i) => [l, exps[i] / sum]))
  return { label: best, scores }
}

export function classifyLines(lines, model) {
  return (lines || []).map((line, index) => ({
    index,
    label: predictSentiment(line.text || line, model).label,
  }))
}

export const sentimentModel = trainNaiveBayes()

export function sentimentCharts(transcript, durationSeconds) {
  const lines = (transcript || []).filter((l) => String(l.speaker || '').toLowerCase().includes('candid'))
  const items = lines.length ? classifyLines(lines, sentimentModel) : [{ index: 0, label: 'neutral' }]
  let pos = 0
  let neu = 0
  let neg = 0
  for (const it of items) {
    const l = String(it.label).toLowerCase()
    if (l.startsWith('pos')) pos += 1
    else if (l.startsWith('neg')) neg += 1
    else neu += 1
  }
  const total = Math.max(1, pos + neu + neg)
  const breakdown = [
    { name: 'Positive', value: Math.round((pos / total) * 100), color: '#10B981' },
    { name: 'Neutral', value: Math.round((neu / total) * 100), color: '#06B6D4' },
    { name: 'Negative', value: Math.max(0, 100 - Math.round((pos / total) * 100) - Math.round((neu / total) * 100)), color: '#EF4444' },
  ]
  const buckets = 6
  const timeline = []
  for (let i = 0; i < buckets; i += 1) {
    const slice = items.slice(
      Math.floor((i / buckets) * items.length),
      Math.floor(((i + 1) / buckets) * items.length),
    )
    const p = slice.filter((x) => String(x.label).toLowerCase().startsWith('pos')).length
    const n = slice.filter((x) => String(x.label).toLowerCase().startsWith('neg')).length
    const t = Math.max(1, slice.length)
    timeline.push({
      time: formatDuration((durationSeconds / buckets) * i),
      positive: Math.round((p / t) * 100),
      negative: Math.round((n / t) * 100),
      neutral: Math.max(0, 100 - Math.round((p / t) * 100) - Math.round((n / t) * 100)),
    })
  }
  return { breakdown, timeline, method: 'naive_bayes' }
}
