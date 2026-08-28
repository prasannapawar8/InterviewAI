/** Match a recruiter question pack against the transcript (keyword overlap, no LLM). */

const STOP = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how', 'the', 'and', 'for',
  'you', 'your', 'have', 'this', 'that', 'with', 'from', 'would', 'could', 'please',
  'tell', 'about', 'can', 'did', 'does', 'are', 'was', 'were', 'been',
])

export function parseQuestionPack(text) {
  return String(text || '')
    .split(/\n+/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length >= 8)
    .slice(0, 40)
}

function significantWords(q) {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
}

export function matchQuestionPack(transcript = [], packText) {
  const questions = parseQuestionPack(packText)
  const blob = (Array.isArray(transcript) ? transcript : [])
    .map((l) => String(l.text || ''))
    .join(' ')
    .toLowerCase()
  const items = questions.map((question) => {
    const words = significantWords(question)
    const hit = words.filter((w) => blob.includes(w)).length
    const covered = words.length ? hit / words.length >= 0.45 : blob.includes(question.toLowerCase().slice(0, 24))
    return { question, covered }
  })
  return {
    total: items.length,
    covered: items.filter((i) => i.covered).length,
    items,
  }
}
