/* ============================================================
   Mock API service layer.
   Mimics async network calls with promises + latency so the UI
   behaves like it will against a real backend. Swap the bodies
   for `fetch`/`axios` calls when wiring up the API.
   ============================================================ */

import {
  currentUser,
  dashboardStats,
  monthlyOverview,
  recentAnalyses,
  sentimentBreakdown,
  sentimentTimeline,
  confidenceTrend,
  communicationMetrics,
  strengths,
  weaknesses,
  transcript,
  aiSummary,
  interviewOverview,
} from './mockData'

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

/* ---------------------- Auth ---------------------- */

export const authService = {
  async login({ email }) {
    await delay(800)
    return { ...currentUser, email: email || currentUser.email }
  },

  async register({ name, email }) {
    await delay(900)
    return { ...currentUser, name: name || currentUser.name, email: email || currentUser.email }
  },

  async forgotPassword({ email }) {
    await delay(700)
    return { ok: true, message: `Reset link sent to ${email}` }
  },
}

/* ---------------------- Dashboard ---------------------- */

export const dashboardService = {
  async getStats() {
    await delay(500)
    return dashboardStats
  },
  async getOverview() {
    await delay(500)
    return monthlyOverview
  },
  async getRecentAnalyses() {
    await delay(600)
    return recentAnalyses
  },
}

/* ---------------------- Analysis ---------------------- */

export const analysisService = {
  async getResult() {
    await delay(700)
    return {
      overview: interviewOverview,
      transcript,
      sentimentBreakdown,
      sentimentTimeline,
      confidenceTrend,
      communicationMetrics,
      strengths,
      weaknesses,
      aiSummary,
    }
  },

  // Simulates a multi-stage processing pipeline, invoking `onStep`
  // and `onProgress` callbacks so the UI can animate.
  async processInterview({ onProgress, onStep, steps }) {
    const total = steps.length
    for (let i = 0; i < total; i++) {
      onStep?.(i)
      // animate progress within each step
      const stepStart = (i / total) * 100
      const stepEnd = ((i + 1) / total) * 100
      const ticks = 12
      for (let t = 1; t <= ticks; t++) {
        await delay(70)
        onProgress?.(Math.round(stepStart + ((stepEnd - stepStart) * t) / ticks))
      }
    }
    onProgress?.(100)
    return { ok: true, resultId: 'int_1042' }
  },
}
