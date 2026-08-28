function csvEscape(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function analysesToCsv(rows) {
  const header = [
    'id',
    'candidate',
    'role',
    'date',
    'status',
    'score',
    'sentiment',
    'recommendation',
    'decision',
    'candidateTalkPct',
    'star',
    'pace',
    'fillers',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    const star = r.starFound == null ? '' : `${r.starFound}/${r.starTotal || 4}`
    lines.push(
      [
        r.id,
        r.candidate,
        r.role,
        r.date,
        r.status,
        r.score,
        r.sentiment,
        r.recommendation,
        r.decision,
        r.candidateTalkPct,
        star,
        r.pace,
        r.fillers,
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}
