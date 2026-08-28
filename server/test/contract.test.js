import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateAnalysis } from '../src/services/ai/engine.js'
import { computeScore, explainScore, buildMetrics, sentimentLabel, recommendationFromScore } from '../src/services/ai/score.js'
import { wordsToTranscript, estimateConfidenceFromWords, metricsFromWords, prepareTranscript, assignDiarizedRoles } from '../src/services/ai/live.js'
import { analyzeTurns } from '../src/services/ai/features/turns.js'
import { detectStar } from '../src/services/ai/features/star.js'
import { predictSentiment, sentimentModel } from '../src/services/ai/features/naiveBayes.js'

const REQUIRED_KEYS = [
  'overview',
  'transcript',
  'sentimentBreakdown',
  'sentimentTimeline',
  'confidenceTrend',
  'communicationMetrics',
  'strengths',
  'weaknesses',
  'aiSummary',
  'score',
  'sentiment',
  'scoreBreakdown',
  'talkTime',
  'starCoverage',
]

describe('analysis result contract', () => {
  it('generateAnalysis returns the Results document shape', () => {
    const doc = generateAnalysis({
      id: 'int_test1',
      candidate: 'Test Candidate',
      role: 'Engineer',
      date: '2026-08-28',
      durationSeconds: 1800,
    })
    for (const key of REQUIRED_KEYS) {
      assert.ok(doc[key] != null, `missing ${key}`)
    }
    assert.equal(doc.overview.id, 'int_test1')
    assert.ok(Array.isArray(doc.transcript) && doc.transcript[0].speaker)
    assert.ok(doc.sentimentBreakdown.every((b) => 'name' in b && 'value' in b))
    assert.ok(doc.sentimentTimeline[0].time)
    assert.ok(typeof doc.confidenceTrend[0].confidence === 'number')
    assert.ok(doc.communicationMetrics.every((m) => m.key && m.unit))
    assert.ok(['Advance', 'Consider', 'Reject'].includes(doc.aiSummary.recommendation))
    assert.equal(doc.overview.recommendation, doc.aiSummary.recommendation)
  })

  it('computeScore is deterministic for the same inputs', () => {
    const metrics = buildMetrics({ pace: 140, fillers: 12, clarity: 88, engagement: 80 })
    const sentiment = {
      breakdown: [
        { name: 'Positive', value: 70 },
        { name: 'Neutral', value: 20 },
        { name: 'Negative', value: 10 },
      ],
    }
    const confidence = [{ time: '00:00', confidence: 80 }]
    const a = computeScore({ confidence, sentiment, metrics })
    const b = computeScore({ confidence, sentiment, metrics })
    assert.equal(a, b)
    const explained = explainScore({ confidence, sentiment, metrics })
    assert.equal(explained.score, a)
    assert.equal(explained.breakdown.length, 5)
    assert.ok(explained.breakdown.every((p) => p.reason && typeof p.contribution === 'number'))
    assert.equal(sentimentLabel(sentiment.breakdown), 'Positive')
    assert.equal(recommendationFromScore(90), 'Advance')
  })

  it('live adapters map words into the UI transcript/metrics shapes', () => {
    const words = [
      { start: 0, word: 'hello', confidence: 0.9, speaker: 'Candidate', text: 'hello' },
      { start: 12, word: 'um', confidence: 0.6, speaker: 'Candidate', text: 'um' },
    ]
    const segs = [{ start: 0, text: 'hello there', speaker: 'Candidate' }]
    const transcript = wordsToTranscript(segs)
    assert.equal(transcript[0].speaker, 'Candidate')
    assert.ok(transcript[0].time)
    const mixed = prepareTranscript([
      { time: '00:01', speaker: 'Candidate', text: 'Could you walk me through your background?' },
      { time: '00:12', speaker: 'Candidate', text: 'I have six years of experience in backend systems.' },
    ])
    assert.equal(mixed[0].speaker, 'Interviewer')
    assert.equal(mixed[1].speaker, 'Candidate')
    const roles = assignDiarizedRoles([
      { speakerId: 0, text: 'Tell me about a project you are proud of?' },
      { speakerId: 0, text: 'How did you measure success?' },
      { speakerId: 1, text: 'We redesigned onboarding and cut drop-off by 34 percent with a longer detailed answer about the process.' },
    ])
    assert.equal(roles['0'], 'Interviewer')
    assert.equal(roles['1'], 'Candidate')
    const trend = estimateConfidenceFromWords(words, 120)
    assert.ok(trend.length)
    assert.ok(typeof trend[0].confidence === 'number')
    const metrics = metricsFromWords(words, 120)
    assert.deepEqual(
      metrics.map((m) => m.key).sort(),
      ['clarity', 'engagement', 'fillers', 'pace'].sort(),
    )
    const turns = analyzeTurns([
      { speaker: 'Interviewer', time: '00:01', text: 'How did you measure success?' },
      { speaker: 'Candidate', time: '00:08', text: 'Yes.' },
      { speaker: 'Interviewer', time: '00:12', text: 'Tell me about a project you are proud of?' },
      {
        speaker: 'Candidate',
        time: '00:20',
        text: 'When I joined the team I was responsible for checkout. I implemented a rewrite and as a result we improved conversion 34 percent.',
      },
    ])
    assert.equal(turns.unansweredCount, 1)
    assert.ok(turns.candidateTalkPct > 0)
    const star = detectStar([
      {
        speaker: 'Candidate',
        text: 'When I joined the company I was tasked to cut latency. I implemented caching. As a result p95 dropped 40 percent.',
      },
    ])
    assert.equal(star.found, 4)
    assert.equal(star.missing.length, 0)
    assert.equal(predictSentiment('We exceeded the goal and the metrics looked fantastic.', sentimentModel).label, 'positive')
    assert.equal(predictSentiment('The launch failed and we had to roll everything back.', sentimentModel).label, 'negative')
    assert.equal(predictSentiment('I have around six years of experience in backend systems.', sentimentModel).label, 'neutral')
  })
})

describe('role templates', () => {
  it('normalizes competencies and merges scorecard ratings by label', async () => {
    const { normalizeCompetencies, snapshotFromTemplate, mergeScorecard, scorecardAverage } = await import(
      '../src/services/templates.js'
    )
    assert.deepEqual(normalizeCompetencies(['Communication', 'communication', 'Ownership']), [
      'Communication',
      'Ownership',
    ])
    const tpl = { id: 'tpl_1', name: 'Backend screen', competencies: ['Communication', 'Ownership'] }
    const snap = snapshotFromTemplate(tpl)
    snap.items[0].rating = 4
    const merged = mergeScorecard(snap, { id: 'tpl_1', name: 'Backend screen', competencies: ['Ownership', 'Communication'] })
    assert.equal(merged.items.find((i) => i.label === 'Communication').rating, 4)
    assert.equal(scorecardAverage({ items: [{ rating: 4 }, { rating: 5 }] }), 4.5)
  })
})
