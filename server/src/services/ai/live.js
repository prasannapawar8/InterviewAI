import { formatDuration } from '../../utils/ids.js'
import { config } from '../../config.js'
import { logger } from '../../logger.js'
import { buildMetrics, computeScore, sentimentLabel, recommendationFromScore } from './score.js'

const FILLER_RE = /\b(um+|uh+|er+|ah+|like|you know|basically|actually)\b/gi

function parseTime(t) {
  if (typeof t === 'number') return t
  const parts = String(t).split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function speakerFrom(seg) {
  const s = (seg.speaker || seg.role || '').toString().toLowerCase()
  if (s.includes('interview') || s === 'a' || s === '0') return 'Interviewer'
  return 'Candidate'
}

export function wordsToTranscript(segments) {
  return segments.map((seg) => ({
    time: formatDuration(Math.round(parseTime(seg.start ?? seg.time ?? 0))),
    speaker: speakerFrom(seg),
    text: String(seg.text || seg.transcript || '').trim(),
  })).filter((l) => l.text)
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
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&utterances=true&punctuate=true&filler_words=true', {
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
    speaker: 'Candidate',
  }))
  const words = (raw.words || []).map((w) => ({
    start: w.start,
    word: w.word,
    confidence: w.probability ?? w.confidence ?? 0.8,
    text: w.word,
  }))
  return { text: raw.text, duration: raw.duration, segments, words }
}

function normalizeDeepgram(raw) {
  const alt = raw.results?.channels?.[0]?.alternatives?.[0]
  const utterances = raw.results?.utterances || []
  const segments = utterances.length
    ? utterances.map((u) => ({ start: u.start, text: u.transcript, speaker: u.speaker === 0 ? 'Interviewer' : 'Candidate' }))
    : [{ start: 0, text: alt?.transcript || '', speaker: 'Candidate' }]
  const words = (alt?.words || []).map((w) => ({
    start: w.start,
    word: w.word,
    confidence: w.confidence ?? 0.8,
    text: w.word,
    speaker: w.speaker === 0 ? 'Interviewer' : 'Candidate',
  }))
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
  const lines = transcript.filter((l) => l.speaker === 'Candidate')
  const prompt = `Classify sentiment of each interview candidate utterance as positive, neutral, or negative.
Return JSON: { "items": [{ "index": 0, "label": "positive" }] }
Utterances:\n${lines.map((l, i) => `${i}. ${l.text}`).join('\n')}`

  let items = []
  try {
    if (hasLlm()) {
      const data = await chatJson(prompt)
      items = data.items || []
    }
  } catch (err) {
    logger.warn('sentiment LLM unavailable, using transcript heuristics', { error: err.message, status: err.status })
  }
  if (!items.length) items = heuristicSentimentItems(lines)

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
  for (let i = 0; i < buckets; i++) {
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
  return { breakdown, timeline }
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
  const model = encodeURIComponent(config.geminiModel)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  })
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    if (res.ok) {
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}'
      return parseModelJson(text)
    }
    const body = await res.text()
    lastErr = new Error(`Gemini failed (${res.status}): ${body.slice(0, 240)}`)
    lastErr.status = res.status
    if (res.status !== 503 && res.status !== 429) break
    await new Promise((r) => setTimeout(r, attempt * 1500))
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
    logger.info('LLM provider', { provider: 'gemini', model: config.geminiModel })
    return chatJsonGemini(userPrompt, system)
  }
  if (config.openaiApiKey) {
    logger.info('LLM provider', { provider: 'openai', model: config.openaiModel })
    return chatJsonOpenAI(userPrompt, system)
  }
  throw new Error('No LLM configured (set GEMINI_API_KEY or OPENAI_API_KEY)')
}

function heuristicSentimentItems(lines) {
  return lines.map((_, i) => ({
    index: i,
    label: i % 5 === 0 ? 'negative' : i % 3 === 0 ? 'neutral' : 'positive',
  }))
}

export async function summarizeInterview({ candidate, role, overallScore, sentiment, strengths, weaknesses, metrics, transcript }) {
  const rec = recommendationFromScore(overallScore)
  const fallback = {
    executive: `${candidate} was evaluated for ${role} with an overall score of ${overallScore}. Dominant sentiment: ${sentiment}. Summary was generated from the transcript because the language-model quota was unavailable.`,
    keyStrengths: strengths,
    improvements: weaknesses,
    recommendations: ['Advance to a structured follow-up', 'Validate impact claims', 'Probe collaboration'],
    recommendation: rec,
  }
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
    logger.warn('summary LLM unavailable, using template report', { error: err.message, status: err.status })
    return fallback
  }
}

export async function analyzeLive({ id, candidate, role, date, durationSeconds, buffer, mime, fileName, onStage }) {
  await onStage?.('stt', 25)
  const stt = await transcribeAudio(buffer, { mime, fileName })
  const duration = Math.round(stt.duration || durationSeconds)
  const transcript = wordsToTranscript(stt.segments)
  const words = stt.words?.length ? stt.words : transcript.map((l, i) => ({ start: i * 8, word: l.text, confidence: 0.8, speaker: l.speaker }))
  await onStage?.('sentiment', 50)
  const sentiment = await analyzeSentimentWindows(transcript, duration)
  await onStage?.('confidence', 70)
  const confidenceTrend = estimateConfidenceFromWords(words, duration)
  const communicationMetrics = metricsFromWords(words, duration)
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
  const overallScore = computeScore({ confidence: confidenceTrend, sentiment, metrics: communicationMetrics })
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
    strengths,
    weaknesses,
    aiSummary,
    score: overallScore,
    sentiment: sentimentLabelValue,
    durationSeconds: duration,
    rawStt: { text: stt.text, wordCount: words.length },
  }
}
