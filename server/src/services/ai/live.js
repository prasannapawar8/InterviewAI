import { formatDuration } from '../../utils/ids.js'
import { config } from '../../config.js'
import { logger } from '../../logger.js'
import { buildMetrics, explainScore, sentimentLabel, recommendationFromScore } from './score.js'
import { analyzeTurns } from './features/turns.js'
import { detectStar } from './features/star.js'
import { sentimentCharts } from './features/naiveBayes.js'

const FILLER_RE = /\b(um+|uh+|er+|ah+|like|you know|basically|actually)\b/gi
const INTERVIEWER_OPEN =
  /^(so,?\s+|and,?\s+|ok(ay)?,?\s+|alright,?\s+|right,?\s+|great,?\s+|thanks?\b|thank you|could you|can you|would you|tell me|walk me|talk (to )?me|describe |explain |what\b|why\b|how\b|when\b|where\b|who\b|have you|did you|do you|are you|is there|let's |lets )/i

function parseTime(t) {
  if (typeof t === 'number') return t
  const parts = String(t).split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

export function looksLikeInterviewerUtterance(text) {
  const t = String(text || '').trim()
  if (!t) return false
  if (/\?\s*$/.test(t)) return true
  const words = t.split(/\s+/).filter(Boolean).length
  if (words <= 22 && INTERVIEWER_OPEN.test(t)) return true
  return false
}

export function assignDiarizedRoles(utterances) {
  const ids = [...new Set(utterances.map((u) => u.speakerId).filter((id) => id !== null && id !== undefined))]
  if (ids.length < 2) return null
  const stats = ids.map((id) => {
    const utts = utterances.filter((u) => u.speakerId === id)
    const words = utts.reduce((n, u) => n + String(u.text || '').split(/\s+/).filter(Boolean).length, 0)
    const questions = utts.filter((u) => looksLikeInterviewerUtterance(u.text)).length
    return { id, words, questions, count: utts.length, qRatio: questions / Math.max(1, utts.length) }
  })
  const totalWords = stats.reduce((s, x) => s + x.words, 0) || 1
  for (const s of stats) {
    s.score = s.qRatio * 4 + (1 - s.words / totalWords) * 2 + (s.questions > 0 ? 1.5 : 0)
  }
  stats.sort((a, b) => b.score - a.score)
  const interviewerId = stats[0].id
  return Object.fromEntries(ids.map((id) => [String(id), id === interviewerId ? 'Interviewer' : 'Candidate']))
}

function speakerFrom(seg) {
  const raw = (seg.speaker ?? seg.role ?? '').toString().trim()
  const lower = raw.toLowerCase()
  if (raw === 'Interviewer' || lower.includes('interview')) return 'Interviewer'
  if (raw === 'Candidate' || lower.includes('candid')) return 'Candidate'
  if (looksLikeInterviewerUtterance(seg.text || seg.transcript)) return 'Interviewer'
  return 'Candidate'
}

export function wordsToTranscript(segments) {
  return (segments || [])
    .map((seg) => ({
      time: formatDuration(Math.round(parseTime(seg.start ?? seg.time ?? 0))),
      speaker: speakerFrom(seg),
      text: String(seg.text || seg.transcript || '').trim(),
    }))
    .filter((l) => l.text)
}

export function mergeConsecutiveSpeakers(lines) {
  const out = []
  for (const line of lines || []) {
    const last = out[out.length - 1]
    if (last && last.speaker === line.speaker) {
      last.text = `${last.text} ${line.text}`.replace(/\s+/g, ' ').trim()
    } else {
      out.push({ time: line.time, speaker: line.speaker, text: line.text })
    }
  }
  return out
}

/** Relabel a stored or live transcript so Interviewer vs Candidate is visible. */
export function prepareTranscript(lines) {
  const mapped = wordsToTranscript(
    (lines || []).map((l) => ({
      start: l.time ?? l.start ?? 0,
      speaker: l.speaker,
      text: l.text,
    })),
  )
  const roles = new Set(mapped.map((l) => l.speaker))
  const refined =
    roles.size >= 2
      ? mapped
      : mapped.map((l) => ({
          ...l,
          speaker: looksLikeInterviewerUtterance(l.text) ? 'Interviewer' : 'Candidate',
        }))
  return mergeConsecutiveSpeakers(refined)
}

function windowStats(words, durationSeconds, buckets = 7) {
  const span = Math.max(durationSeconds, 1)
  const size = span / buckets
  const out = []
  for (let i = 0; i < buckets; i++) {
    const lo = i * size
    const hi = (i + 1) * size
    const slice = words.filter((w) => w.start >= lo && w.start < hi)
    out.push({ lo, hi, words: slice })
  }
  return out
}

export function estimateConfidenceFromWords(words, durationSeconds) {
  const buckets = windowStats(words, durationSeconds)
  return buckets.map((b) => {
    const confs = b.words.map((w) => (typeof w.confidence === 'number' ? w.confidence : 0.75))
    const avg = confs.length ? confs.reduce((s, n) => s + n, 0) / confs.length : 0.7
    const fillers = b.words.filter((w) => /\b(um+|uh+|er+|ah+|like|you know)\b/i.test(w.word || w.text || '')).length
    const penalty = Math.min(20, fillers * 3)
    return {
      time: formatDuration(b.lo),
      confidence: Math.round(Math.min(95, Math.max(40, avg * 100 - penalty))),
    }
  })
}

export function metricsFromWords(words, durationSeconds) {
  const candidateWords = words.filter((w) => speakerFrom(w) !== 'Interviewer' || !w.speaker)
  const text = candidateWords.map((w) => w.word || w.text || '').join(' ')
  const fillers = (text.match(FILLER_RE) || []).length
  const minutes = Math.max(durationSeconds / 60, 0.5)
  const pace = Math.round(candidateWords.length / minutes)
  const avgConf =
    candidateWords.reduce((s, w) => s + (w.confidence ?? 0.8), 0) / (candidateWords.length || 1)
  const clarity = Math.round(Math.min(95, avgConf * 100 - Math.min(15, fillers)))
  const engagement = Math.round(Math.min(92, 55 + (pace > 90 ? 15 : 5) + avgConf * 20))
  return buildMetrics({
    pace: Math.min(200, Math.max(80, pace)),
    fillers,
    clarity: Math.min(95, Math.max(50, clarity)),
    engagement: Math.min(95, Math.max(50, engagement)),
  })
}

async function whisperTranscribe(buffer, mime, fileName) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime || 'audio/mpeg' }), fileName || 'interview.mp3')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  form.append('timestamp_granularities[]', 'segment')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Whisper failed (${res.status}): ${body.slice(0, 240)}`)
  }
  return res.json()
}

async function deepgramTranscribe(buffer, mime) {
  const params = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    punctuate: 'true',
    filler_words: 'true',
    utterances: 'true',
    diarize: 'true',
  })
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.deepgramApiKey}`,
      'Content-Type': mime || 'audio/wav',
    },
    body: buffer,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Deepgram failed (${res.status}): ${body.slice(0, 240)}`)
  }
  return res.json()
}

function normalizeWhisper(raw) {
  const segments = (raw.segments || []).map((s) => ({
    start: s.start,
    text: s.text,
  }))
  const words = (raw.words || []).map((w) => ({
    start: w.start,
    word: w.word,
    confidence: w.probability ?? w.confidence ?? 0.8,
    text: w.word,
  }))
  return { text: raw.text, duration: raw.duration, segments, words }
}

function numericSpeaker(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeDeepgram(raw) {
  const alt = raw.results?.channels?.[0]?.alternatives?.[0]
  const utterances = raw.results?.utterances || []
  const withIds = utterances.map((u) => ({
    start: u.start,
    text: u.transcript,
    speakerId: numericSpeaker(u.speaker),
  }))
  const roleMap = assignDiarizedRoles(withIds)
  const segments = withIds.length
    ? withIds.map((u) => ({
        start: u.start,
        text: u.text,
        speaker: roleMap && u.speakerId != null ? roleMap[String(u.speakerId)] : undefined,
      }))
    : [{ start: 0, text: alt?.transcript || '' }]
  const words = (alt?.words || []).map((w) => {
    const speakerId = numericSpeaker(w.speaker)
    return {
      start: w.start,
      word: w.word,
      confidence: w.confidence ?? 0.8,
      text: w.word,
      speaker: roleMap && speakerId != null ? roleMap[String(speakerId)] : undefined,
    }
  })
  return { text: alt?.transcript || '', duration: raw.metadata?.duration, segments, words }
}

export async function transcribeAudio(buffer, { mime, fileName }) {
  if (config.deepgramApiKey) {
    logger.info('STT provider', { provider: 'deepgram' })
    return normalizeDeepgram(await deepgramTranscribe(buffer, mime))
  }
  if (config.openaiApiKey) {
    logger.info('STT provider', { provider: 'whisper' })
    return normalizeWhisper(await whisperTranscribe(buffer, mime, fileName))
  }
  throw new Error('No STT provider configured (set DEEPGRAM_API_KEY or OPENAI_API_KEY)')
}

export async function analyzeSentimentWindows(transcript, durationSeconds) {
  logger.info('sentiment provider', { provider: 'naive_bayes' })
  return sentimentCharts(transcript, durationSeconds)
}

function hasLlm() {
  return Boolean(config.geminiApiKey || config.openaiApiKey)
}

function parseModelJson(text) {
  const trimmed = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return JSON.parse(trimmed || '{}')
}

async function chatJsonGemini(userPrompt, system) {
  const models = [...new Set([
    config.geminiModel,
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
  ].filter(Boolean))]
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  })
  let lastErr
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '{}'
        logger.info('LLM provider', { provider: 'gemini', model })
        return parseModelJson(text)
      }
      const body = await res.text()
      lastErr = new Error(`Gemini failed (${res.status}): ${body.slice(0, 240)}`)
      lastErr.status = res.status
      if (res.status === 404 || res.status === 429) break
      if (res.status !== 503) throw lastErr
      await new Promise((r) => setTimeout(r, attempt * 2000))
    }
  }
  throw lastErr
}

async function chatJsonOpenAI(userPrompt, system) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiModel,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`LLM failed (${res.status}): ${body.slice(0, 240)}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return parseModelJson(data.choices?.[0]?.message?.content || '{}')
}

async function chatJson(userPrompt, system = 'You return only valid JSON.') {
  if (config.geminiApiKey) {
    return chatJsonGemini(userPrompt, system)
  }
  if (config.openaiApiKey) {
    logger.info('LLM provider', { provider: 'openai', model: config.openaiModel })
    return chatJsonOpenAI(userPrompt, system)
  }
  throw new Error('No LLM configured (set GEMINI_API_KEY or OPENAI_API_KEY)')
}

export function isPlaceholderSummary(executive) {
  return /language-model quota was unavailable/i.test(String(executive || ''))
}

function transcriptFallbackSummary({ candidate, role, overallScore, sentiment, strengths, weaknesses, transcript }) {
  const rec = recommendationFromScore(overallScore)
  const spoken = (transcript || [])
    .filter((l) => l.speaker === 'Candidate')
    .map((l) => l.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const snippet = spoken.slice(0, 520)
  const executive = snippet
    ? `${candidate} interviewed for ${role} with an overall score of ${overallScore}/100 and ${sentiment} sentiment. Candidate remarks included: ${snippet}${spoken.length > 520 ? '…' : ''}`
    : `${candidate} was evaluated for ${role} with an overall score of ${overallScore}/100 and ${sentiment} sentiment. Gemini was busy; this summary is based on scores and metrics only.`
  return {
    executive,
    keyStrengths: strengths,
    improvements: weaknesses,
    recommendations: ['Advance to a structured follow-up', 'Validate impact claims', 'Probe collaboration'],
    recommendation: rec,
  }
}

export async function summarizeInterview({ candidate, role, overallScore, sentiment, strengths, weaknesses, metrics, transcript }) {
  const rec = recommendationFromScore(overallScore)
  const fallback = transcriptFallbackSummary({
    candidate,
    role,
    overallScore,
    sentiment,
    strengths,
    weaknesses,
    transcript,
  })
  if (!hasLlm()) return fallback
  try {
    const sample = transcript.slice(0, 24).map((l) => `${l.speaker}: ${l.text}`).join('\n')
    const data = await chatJson(
      `Write an interview hiring report as JSON with keys:
executive (string), keyStrengths (string[3]), improvements (string[3]), recommendations (string[3]), recommendation (one of Advance, Consider, Reject).
Candidate: ${candidate}. Role: ${role}. Score: ${overallScore}. Sentiment: ${sentiment}.
Strengths: ${strengths.join('; ')}. Weaknesses: ${weaknesses.join('; ')}.
Metrics: ${JSON.stringify(metrics)}. Transcript sample:\n${sample}`,
    )
    return {
      executive: data.executive || fallback.executive,
      keyStrengths: data.keyStrengths || strengths,
      improvements: data.improvements || weaknesses,
      recommendations: data.recommendations || fallback.recommendations,
      recommendation: ['Advance', 'Consider', 'Reject'].includes(data.recommendation) ? data.recommendation : rec,
    }
  } catch (err) {
    logger.warn('summary LLM unavailable, using transcript-based report', { error: err.message, status: err.status })
    return fallback
  }
}

export async function analyzeLive({ id, candidate, role, date, durationSeconds, buffer, mime, fileName, onStage }) {
  await onStage?.('stt', 25)
  const stt = await transcribeAudio(buffer, { mime, fileName })
  const duration = Math.round(stt.duration || durationSeconds)
  const transcript = prepareTranscript(wordsToTranscript(stt.segments))
  const words = stt.words?.length ? stt.words : transcript.map((l, i) => ({ start: i * 8, word: l.text, confidence: 0.8, speaker: l.speaker }))
  await onStage?.('sentiment', 50)
  const sentiment = await analyzeSentimentWindows(transcript, duration)
  await onStage?.('confidence', 70)
  const confidenceTrend = estimateConfidenceFromWords(words, duration)
  const communicationMetrics = metricsFromWords(words, duration)
  const scoreCard = explainScore({ confidence: confidenceTrend, sentiment, metrics: communicationMetrics })
  const overallScore = scoreCard.score
  const talkTime = analyzeTurns(transcript)
  const starCoverage = detectStar(transcript)
  const strengths = [
    'Evidence-backed answers drawn from the transcript',
    'Turn-taking and response structure',
    'Domain language appropriate to the role',
  ]
  const weaknesses = [
    'Filler words or pacing issues where detected',
    'Opportunities to quantify impact more clearly',
    'Follow-up depth on weaker answers',
  ]
  const sentimentLabelValue = sentimentLabel(sentiment.breakdown)
  await onStage?.('report', 88)
  const aiSummary = await summarizeInterview({
    candidate,
    role,
    overallScore,
    sentiment: sentimentLabelValue,
    strengths,
    weaknesses,
    metrics: communicationMetrics,
    transcript,
  })
  return {
    overview: {
      id,
      candidate,
      role,
      date,
      duration: formatDuration(duration),
      overallScore,
      recommendation: aiSummary.recommendation,
    },
    transcript,
    sentimentBreakdown: sentiment.breakdown,
    sentimentTimeline: sentiment.timeline,
    confidenceTrend,
    communicationMetrics,
    scoreBreakdown: scoreCard.breakdown,
    talkTime,
    starCoverage,
    strengths,
    weaknesses,
    aiSummary,
    score: overallScore,
    sentiment: sentimentLabelValue,
    durationSeconds: duration,
    rawStt: { text: stt.text, wordCount: words.length },
  }
}
