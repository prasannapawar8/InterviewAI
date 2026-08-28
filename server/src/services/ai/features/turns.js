function wordCount(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean).length
}

function isCandidate(line) {
  return String(line?.speaker || '').toLowerCase().includes('candid')
}

function isInterviewer(line) {
  return String(line?.speaker || '').toLowerCase().includes('interview')
}

/** Talk-time share and interviewer questions with no substantial candidate reply. */
export function analyzeTurns(transcript = []) {
  let candidateWords = 0
  let interviewerWords = 0
  for (const line of transcript) {
    const n = wordCount(line.text)
    if (isInterviewer(line)) interviewerWords += n
    else if (isCandidate(line)) candidateWords += n
    else candidateWords += n
  }
  const total = candidateWords + interviewerWords || 1
  const unansweredQuestions = []
  for (let i = 0; i < transcript.length; i += 1) {
    const line = transcript[i]
    if (!isInterviewer(line)) continue
    if (!/\?\s*$/.test(String(line.text || '').trim())) continue
    const next = transcript.slice(i + 1).find((x) => isCandidate(x))
    const nextWords = next ? wordCount(next.text) : 0
    if (!next || nextWords < 8) {
      unansweredQuestions.push({
        time: line.time || '',
        question: String(line.text || '').trim(),
        reason: !next ? 'no_answer' : 'too_short',
      })
    }
  }
  return {
    candidateWords,
    interviewerWords,
    candidateTalkPct: Math.round((candidateWords / total) * 100),
    interviewerTalkPct: Math.round((interviewerWords / total) * 100),
    unansweredCount: unansweredQuestions.length,
    unansweredQuestions,
  }
}
