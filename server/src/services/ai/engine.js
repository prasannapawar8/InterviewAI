/* ============================================================
   IntervAI "analysis engine".

   This module simulates the AI pipeline (speech-to-text,
   sentiment analysis, confidence estimation, report generation)
   with a deterministic, seeded generator. The same input always
   produces the same analysis, so uploads are reproducible.

   🔌 REAL AI INTEGRATION POINTS
   -----------------------------
   To plug in production ML providers, replace the bodies of the
   functions below (each is documented with the data shape it must
   return). Everything downstream — storage, API routes, the React
   UI — only depends on those shapes, so providers can be swapped
   without touching the rest of the codebase.

   Suggested providers:
     - transcript  → OpenAI Whisper / Deepgram / AssemblyAI
     - sentiment   → a classifier over the transcript (or the same STT API)
     - confidence  → prosody/filler detection (e.g. speech analytics APIs)
     - summary     → an LLM call (OpenAI / Anthropic) over the transcript
   ============================================================ */

import { formatDuration, hashString } from '../../utils/ids.js'
import { computeScore, sentimentLabel } from './score.js'

/* ------------------------- Seeded RNG ------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------- Template pools ------------------------- */

const QUESTIONS = [
  'Thanks for joining us today. Could you start by walking us through your background?',
  'Great. Tell me about a project you are particularly proud of.',
  'How did you measure success for that initiative?',
  'What about a time something did not go as planned?',
  'How do you collaborate with engineering and product?',
  'Where do you see the biggest opportunity in this role?',
  'Tell me about a time you had to influence someone senior.',
  'How do you handle ambiguity or changing priorities?',
  'What are you looking for in your next role?',
  'How do you stay current in your field?',
  'Describe a situation where you received difficult feedback.',
  'Why are you interested in this position specifically?',
]

const ANSWERS = [
  'I have around six years of experience in this space, primarily focused on B2B products where I led cross-functional initiatives and end-to-end delivery.',
  'One project that stands out is when we redesigned the onboarding flow. We reduced drop-off by 34% by simplifying the steps and introducing contextual guidance.',
  'We tracked activation rate, time-to-first-value, and qualitative feedback. The combination gave us a balanced view of both behavior and sentiment.',
  'Early on, I shipped a feature without enough usability testing. It taught me to always validate assumptions with real users before committing engineering effort.',
  'I believe in early, continuous collaboration. I bring engineers into design reviews so we catch constraints early and ship faster together.',
  'The biggest opportunity is standardizing how we measure quality. A consistent framework would let the team compare signals across candidates fairly.',
  'I prepared a one-page summary with the trade-offs and walked through it in a 1:1. Once they saw the data, it was an easy yes.',
  'I keep a prioritized backlog and communicate the trade-offs explicitly. When priorities shift, I renegotiate scope rather than silently dropping work.',
  'I am looking for a role where I can own outcomes end to end and work with a team that values craft and candor.',
  'I follow a few core newsletters, attend quarterly meetups, and most importantly I learn from code and design reviews with people who are better than me.',
  'The feedback was that I spoke too much in meetings. I started keeping answers shorter and asking more questions, which changed how the team perceived me.',
  'Your team has a strong track record on this problem space, and the mandate here is bigger than what I can do in my current role. That combination is rare.',
]

const STRENGTH_POOL = [
  'Articulate, well-structured answers with clear examples',
  'Strong domain knowledge demonstrated under follow-up questions',
  'Confident tone that improved steadily through the session',
  'Quantified impact with concrete metrics in most answers',
  'Collaborative mindset across engineering and product',
  'Excellent active listening — answers mapped directly to the question asked',
  'Calm and composed delivery, even on challenging questions',
  'Demonstrated ownership and initiative with clear examples',
]

const WEAKNESS_POOL = [
  'Occasional filler words during transitions ("um", "like")',
  'Could quantify impact with more concrete metrics',
  'A few rushed answers in the final third of the interview',
  'Longer answers than necessary on two occasions',
  'Hesitation when discussing conflict or failure',
  'Could ask more clarifying questions before answering',
  'Some answers lacked a clear STAR structure',
  'Pacing dipped noticeably during technical questions',
]

/* ------------------------- Transcript (STT) ------------------------- */

/**
 * 🔌 STT integration point.
 * Generate (or transcribe) interview dialogue. Returns:
 *   [{ time: 'MM:SS', speaker: 'Interviewer'|'Candidate', text: string }]
 */
export function generateTranscript(seed, { numLines = 10 } = {}) {
  const rand = mulberry32(hashString(`${seed}:transcript`))
  const count = Math.min(numLines, QUESTIONS.length)
  const lines = []
  let seconds = 8 + Math.floor(rand() * 20) // start a few seconds in

  for (let i = 0; i < count; i++) {
    const qIndex = Math.floor(rand() * QUESTIONS.length)
    const aIndex = Math.floor(rand() * ANSWERS.length)

    lines.push({
      time: formatDuration(seconds),
      speaker: 'Interviewer',
      text: QUESTIONS[qIndex],
    })
    seconds += 8 + Math.floor(rand() * 12) // ~8–20s gap between turns

    lines.push({
      time: formatDuration(seconds),
      speaker: 'Candidate',
      text: ANSWERS[aIndex],
    })
    seconds += 30 + Math.floor(rand() * 45) // answers run 30–75s
  }
  return lines
}

/* ------------------------- Sentiment ------------------------- */

/**
 * 🔌 Sentiment integration point.
 * Returns a breakdown plus a per-timestamp timeline:
 *   breakdown: [{ name, value, color }]   (percentages summing to 100)
 *   timeline:  [{ time, positive, neutral, negative }]
 */
export function generateSentiment(seed, { durationSeconds = 1900 } = {}) {
  const rand = mulberry32(hashString(`${seed}:sentiment`))
  const positive = 52 + Math.floor(rand() * 22) // 52–74
  const neutral = 22 + Math.floor(rand() * 14) // 22–36
  const negative = 100 - positive - neutral

  const breakdown = [
    { name: 'Positive', value: positive, color: '#10B981' },
    { name: 'Neutral', value: neutral, color: '#06B6D4' },
    { name: 'Negative', value: negative, color: '#EF4444' },
  ]

  // Walk the interview in ~5-minute buckets with a generally rising drift
  const buckets = 6 + Math.floor(rand() * 2) // 6–7 points
  const timeline = []
  let p = positive - 14
  let n = negative + 4
  for (let i = 0; i < buckets; i++) {
    p = Math.min(84, Math.max(30, p + (rand() * 8 - 2)))
    n = Math.min(30, Math.max(4, n + (rand() * 6 - 4)))
    const neu = 100 - p - n
    timeline.push({
      time: formatDuration((durationSeconds / buckets) * i),
      positive: Math.round(p),
      neutral: Math.round(neu),
      negative: Math.round(n),
    })
  }
  return { breakdown, timeline }
}

/* ------------------------- Confidence ------------------------- */

/**
 * 🔌 Confidence integration point.
 * Returns:
 *   trend: [{ time, confidence }]   (0–100)
 */
export function generateConfidence(seed, { durationSeconds = 1900 } = {}) {
  const rand = mulberry32(hashString(`${seed}:confidence`))
  const buckets = 6 + Math.floor(rand() * 2)
  const trend = []
  let c = 58 + Math.floor(rand() * 10) // start mid-60s
  for (let i = 0; i < buckets; i++) {
    c = Math.min(92, Math.max(50, c + (rand() * 10 - 1)))
    trend.push({
      time: formatDuration((durationSeconds / buckets) * i),
      confidence: Math.round(c),
    })
  }
  return trend
}

/* ------------------------- Communication metrics ------------------------- */

export function generateMetrics(seed) {
  const rand = mulberry32(hashString(`${seed}:metrics`))
  const clarity = 70 + Math.floor(rand() * 22) // 70–91
  const engagement = 62 + Math.floor(rand() * 24) // 62–85
  const pace = 125 + Math.floor(rand() * 30) // 125–154 wpm
  const fillers = 10 + Math.floor(rand() * 26) // 10–35

  const good = (v, lo, hi) => (v >= lo && v <= hi ? 'good' : v < lo ? 'bad' : 'warn')

  return [
    { key: 'pace', label: 'Speaking Pace', value: pace, unit: 'wpm', target: '120–150 wpm', status: good(pace, 120, 150), icon: 'Activity' },
    { key: 'fillers', label: 'Filler Words', value: fillers, unit: 'total', target: '< 30', status: fillers < 30 ? 'good' : 'warn', icon: 'MessageSquareDashed' },
    { key: 'clarity', label: 'Clarity Score', value: clarity, unit: '%', target: '> 80%', status: clarity >= 80 ? 'good' : 'warn', icon: 'Sparkles' },
    { key: 'engagement', label: 'Engagement', value: engagement, unit: '%', target: '> 70%', status: engagement >= 70 ? 'good' : 'warn', icon: 'Zap' },
  ]
}

/* ------------------------- Strengths & weaknesses ------------------------- */

export function generateStrengths(seed, count = 3) {
  const rand = mulberry32(hashString(`${seed}:strengths`))
  return pickN(STRENGTH_POOL, count, rand)
}

export function generateWeaknesses(seed, count = 3) {
  const rand = mulberry32(hashString(`${seed}:weaknesses`))
  return pickN(WEAKNESS_POOL, count, rand)
}

function pickN(pool, n, rand) {
  const copy = [...pool]
  const out = []
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
  }
  return out
}

/* ------------------------- Summary report ------------------------- */

/**
 * 🔌 LLM integration point.
 * Returns:
 *   { executive, keyStrengths, improvements, recommendations, recommendation }
 */
export function generateSummary(seed, ctx) {
  const rand = mulberry32(hashString(`${seed}:summary`))
  const { candidate, role, overallScore, sentiment, strengths, weaknesses, metrics } = ctx
  const clarity = metrics.find((m) => m.key === 'clarity')?.value ?? 80
  const fillers = metrics.find((m) => m.key === 'fillers')?.value ?? 20

  const recommendation = overallScore >= 80 ? 'Advance' : overallScore >= 65 ? 'Consider' : 'Reject'

  const executive =
    `${candidate} presented as a ${overallScore >= 80 ? 'confident, well-prepared' : overallScore >= 65 ? 'competent, generally prepared' : 'somewhat hesitant'} candidate ` +
    `for the ${role} role. Communication was ${clarity >= 85 ? 'clear and well-structured' : 'mostly clear with room for polish'}, with ${sentiment} sentiment ` +
    `dominating the conversation and ${overallScore >= 75 ? 'confidence trending upward' : 'confidence holding steady'} throughout the session. ` +
    `${strengths[0]?.toLowerCase()}. ${weaknesses[0]?.toLowerCase()} — worth addressing in any follow-up round.`

  const keyStrengths = strengths.map((s) => capitalize(s))
  const improvements = weaknesses.map((w) => capitalize(w))

  const recPool = [
    `Advance to the technical / portfolio round`,
    'Prepare a structured deep-dive on their flagship project',
    'Practice concise STAR responses to control pacing',
    'Run a panel round to probe collaboration in depth',
    'Validate the quantified impact claims with references',
  ]
  const recommendations = pickN(recPool, 3, rand)

  return { executive, keyStrengths, improvements, recommendations, recommendation }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ------------------------- Top-level generation ------------------------- */

/**
 * Build the full analysis document for an interview.
 * `input` must include: id, candidate, role, date (ISO), durationSeconds.
 * Everything else is derived deterministically from the id seed.
 */
export function generateAnalysis(input) {
  const {
    id,
    candidate = 'Candidate',
    role = 'Interview Candidate',
    date,
    durationSeconds = 32 * 60 + 14,
  } = input

  const seed = `${id}:${candidate}:${role}`
  const transcript = generateTranscript(seed)
  const sentiment = generateSentiment(seed, { durationSeconds })
  const confidence = generateConfidence(seed, { durationSeconds })
  const communicationMetrics = generateMetrics(seed)
  const strengths = generateStrengths(seed)
  const weaknesses = generateWeaknesses(seed)
  const overallScore = computeScore({ confidence, sentiment, metrics: communicationMetrics })
  const sentimentLabelValue = sentimentLabel(sentiment.breakdown)
  const aiSummary = generateSummary(seed, {
    candidate,
    role,
    overallScore,
    sentiment: sentimentLabelValue,
    strengths,
    weaknesses,
    metrics: communicationMetrics,
  })

  return {
    overview: {
      id,
      candidate,
      role,
      date,
      duration: formatDuration(durationSeconds),
      overallScore,
      recommendation: aiSummary.recommendation,
    },
    transcript,
    sentimentBreakdown: sentiment.breakdown,
    sentimentTimeline: sentiment.timeline,
    confidenceTrend: confidence,
    communicationMetrics,
    strengths,
    weaknesses,
    aiSummary,
    // List-row fields (used by the dashboard / analyses list)
    score: overallScore,
    sentiment: sentimentLabelValue,
  }
}
