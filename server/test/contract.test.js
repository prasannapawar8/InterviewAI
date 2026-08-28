import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateAnalysis } from '../src/services/ai/engine.js'
import { computeScore, buildMetrics, sentimentLabel, recommendationFromScore } from '../src/services/ai/score.js'
import { wordsToTranscript, estimateConfidenceFromWords, metricsFromWords } from '../src/services/ai/live.js'

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
    const trend = estimateConfidenceFromWords(words, 120)
    assert.ok(trend.length)
    assert.ok(typeof trend[0].confidence === 'number')
    const metrics = metricsFromWords(words, 120)
    assert.deepEqual(
      metrics.map((m) => m.key).sort(),
      ['clarity', 'engagement', 'fillers', 'pace'].sort(),
    )
  })
})
