export function metricStatus(key, value) {
  if (key === 'pace') return value >= 120 && value <= 150 ? 'good' : value < 120 ? 'bad' : 'warn'
  if (key === 'fillers') return value < 30 ? 'good' : 'warn'
  if (key === 'clarity') return value >= 80 ? 'good' : 'warn'
  if (key === 'engagement') return value >= 70 ? 'good' : 'warn'
  return 'good'
}

export function buildMetrics({ pace, fillers, clarity, engagement }) {
  return [
    { key: 'pace', label: 'Speaking Pace', value: pace, unit: 'wpm', target: '120–150 wpm', status: metricStatus('pace', pace), icon: 'Activity' },
    { key: 'fillers', label: 'Filler Words', value: fillers, unit: 'total', target: '< 30', status: metricStatus('fillers', fillers), icon: 'MessageSquareDashed' },
    { key: 'clarity', label: 'Clarity Score', value: clarity, unit: '%', target: '> 80%', status: metricStatus('clarity', clarity), icon: 'Sparkles' },
    { key: 'engagement', label: 'Engagement', value: engagement, unit: '%', target: '> 70%', status: metricStatus('engagement', engagement), icon: 'Zap' },
  ]
}

export function explainScore({ confidence, sentiment, metrics }) {
  const avgConfidence =
    confidence.reduce((s, p) => s + p.confidence, 0) / (confidence.length || 1)
  const clarity = metrics.find((m) => m.key === 'clarity')?.value ?? 80
  const fillers = metrics.find((m) => m.key === 'fillers')?.value ?? 25
  const engagement = metrics.find((m) => m.key === 'engagement')?.value ?? 75
  const positive = sentiment.breakdown.find((b) => b.name === 'Positive')?.value ?? 60
  const fillerTerm = Math.max(0, 100 - fillers * 1.2)

  const breakdown = [
    {
      key: 'confidence',
      label: 'Delivery confidence',
      raw: Math.round(avgConfidence),
      unit: '%',
      weight: 0.3,
      contribution: round1(avgConfidence * 0.3),
      reason: `Average confidence ${Math.round(avgConfidence)}% across the session`,
    },
    {
      key: 'clarity',
      label: 'Clarity',
      raw: clarity,
      unit: '%',
      weight: 0.25,
      contribution: round1(clarity * 0.25),
      reason: `Clarity ${clarity}% (target above 80%)`,
    },
    {
      key: 'engagement',
      label: 'Engagement',
      raw: engagement,
      unit: '%',
      weight: 0.15,
      contribution: round1(engagement * 0.15),
      reason: `Engagement ${engagement}% (target above 70%)`,
    },
    {
      key: 'sentiment',
      label: 'Positive sentiment',
      raw: positive,
      unit: '%',
      weight: 0.2,
      contribution: round1(positive * 0.2),
      reason: `Positive sentiment share ${positive}% of candidate turns`,
    },
    {
      key: 'fillers',
      label: 'Filler-word control',
      raw: fillers,
      unit: 'count',
      weight: 0.1,
      contribution: round1(fillerTerm * 0.1),
      reason: `${fillers} filler words (score term ${Math.round(fillerTerm)} after penalty)`,
    },
  ]

  const rawSum = breakdown.reduce((s, p) => s + p.contribution, 0)
  const score = Math.min(98, Math.max(35, Math.round(rawSum)))
  return { score, breakdown }
}

export function computeScore(args) {
  return explainScore(args).score
}

function round1(n) {
  return Math.round(n * 10) / 10
}

export function sentimentLabel(breakdown) {
  const pos = breakdown.find((b) => b.name === 'Positive')?.value ?? 50
  const neg = breakdown.find((b) => b.name === 'Negative')?.value ?? 20
  if (pos >= 55) return 'Positive'
  if (neg > pos) return 'Negative'
  return 'Neutral'
}

export function recommendationFromScore(overallScore) {
  if (overallScore >= 80) return 'Advance'
  if (overallScore >= 65) return 'Consider'
  return 'Reject'
}
