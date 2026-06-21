/* ============================================================
   Sample / dummy data for the AI Interview Analysis platform.
   In production these would come from the backend API.
   ============================================================ */

export const currentUser = {
  id: 'usr_001',
  name: 'Aarav Mehta',
  email: 'aarav.mehta@example.com',
  role: 'Talent Lead',
  company: 'Northwind Talent',
  avatar: null, // falls back to initials
  joinedAt: '2025-11-02',
}

export const dashboardStats = [
  {
    key: 'interviews',
    label: 'Total Interviews',
    value: 248,
    delta: 12.5,
    trend: 'up',
    icon: 'Video',
    accent: 'primary',
  },
  {
    key: 'confidence',
    label: 'Avg. Confidence Score',
    value: 78,
    suffix: '%',
    delta: 4.2,
    trend: 'up',
    icon: 'Gauge',
    accent: 'accent',
  },
  {
    key: 'sentiment',
    label: 'Positive Sentiment',
    value: 64,
    suffix: '%',
    delta: -1.8,
    trend: 'down',
    icon: 'Smile',
    accent: 'success',
  },
  {
    key: 'reports',
    label: 'Reports Generated',
    value: 192,
    delta: 8.1,
    trend: 'up',
    icon: 'FileText',
    accent: 'secondary',
  },
]

// 12-month overview used by the dashboard area chart
export const monthlyOverview = [
  { month: 'Jul', interviews: 12, confidence: 71, positivity: 58 },
  { month: 'Aug', interviews: 18, confidence: 73, positivity: 60 },
  { month: 'Sep', interviews: 22, confidence: 70, positivity: 57 },
  { month: 'Oct', interviews: 27, confidence: 75, positivity: 62 },
  { month: 'Nov', interviews: 31, confidence: 76, positivity: 63 },
  { month: 'Dec', interviews: 24, confidence: 74, positivity: 61 },
  { month: 'Jan', interviews: 29, confidence: 77, positivity: 64 },
  { month: 'Feb', interviews: 33, confidence: 78, positivity: 66 },
  { month: 'Mar', interviews: 38, confidence: 79, positivity: 65 },
  { month: 'Apr', interviews: 41, confidence: 80, positivity: 67 },
  { month: 'May', interviews: 44, confidence: 81, positivity: 68 },
  { month: 'Jun', interviews: 48, confidence: 82, positivity: 70 },
]

export const recentAnalyses = [
  {
    id: 'int_1042',
    candidate: 'Sofia Alvarez',
    role: 'Senior Product Designer',
    date: '2026-06-18',
    duration: '32:14',
    score: 88,
    sentiment: 'Positive',
    status: 'Completed',
  },
  {
    id: 'int_1041',
    candidate: 'Liam O’Connor',
    role: 'Backend Engineer',
    date: '2026-06-17',
    duration: '41:02',
    score: 74,
    sentiment: 'Neutral',
    status: 'Completed',
  },
  {
    id: 'int_1040',
    candidate: 'Priya Nair',
    role: 'Data Scientist',
    date: '2026-06-17',
    duration: '28:47',
    score: 91,
    sentiment: 'Positive',
    status: 'Completed',
  },
  {
    id: 'int_1039',
    candidate: 'Marcus Chen',
    role: 'Engineering Manager',
    date: '2026-06-16',
    duration: '52:30',
    score: 67,
    sentiment: 'Negative',
    status: 'Completed',
  },
  {
    id: 'int_1038',
    candidate: 'Hannah Müller',
    role: 'UX Researcher',
    date: '2026-06-15',
    duration: '35:18',
    score: 82,
    sentiment: 'Positive',
    status: 'Processing',
  },
  {
    id: 'int_1037',
    candidate: 'Diego Santos',
    role: 'DevOps Engineer',
    date: '2026-06-14',
    duration: '39:55',
    score: 79,
    sentiment: 'Neutral',
    status: 'Completed',
  },
]

/* ---- Detailed single-interview analysis (Results page) ---- */

export const sentimentBreakdown = [
  { name: 'Positive', value: 58, color: '#10B981' },
  { name: 'Neutral', value: 29, color: '#06B6D4' },
  { name: 'Negative', value: 13, color: '#EF4444' },
]

export const sentimentTimeline = [
  { time: '00:00', positive: 40, neutral: 45, negative: 15 },
  { time: '05:00', positive: 52, neutral: 36, negative: 12 },
  { time: '10:00', positive: 61, neutral: 28, negative: 11 },
  { time: '15:00', positive: 48, neutral: 38, negative: 14 },
  { time: '20:00', positive: 66, neutral: 25, negative: 9 },
  { time: '25:00', positive: 71, neutral: 22, negative: 7 },
  { time: '30:00', positive: 63, neutral: 27, negative: 10 },
]

export const confidenceTrend = [
  { time: '00:00', confidence: 62 },
  { time: '05:00', confidence: 68 },
  { time: '10:00', confidence: 74 },
  { time: '15:00', confidence: 71 },
  { time: '20:00', confidence: 79 },
  { time: '25:00', confidence: 84 },
  { time: '30:00', confidence: 81 },
]

export const communicationMetrics = [
  { key: 'pace', label: 'Speaking Pace', value: 142, unit: 'wpm', target: '120–150 wpm', status: 'good', icon: 'Activity' },
  { key: 'fillers', label: 'Filler Words', value: 23, unit: 'total', target: '< 30', status: 'good', icon: 'MessageSquareDashed' },
  { key: 'clarity', label: 'Clarity Score', value: 86, unit: '%', target: '> 80%', status: 'good', icon: 'Sparkles' },
  { key: 'engagement', label: 'Engagement', value: 73, unit: '%', target: '> 70%', status: 'good', icon: 'Zap' },
]

export const strengths = [
  'Articulate, well-structured answers with clear examples',
  'Strong domain knowledge demonstrated under follow-up questions',
  'Confident tone that improved steadily through the session',
]

export const weaknesses = [
  'Occasional filler words during transitions ("um", "like")',
  'Could quantify impact with more concrete metrics',
  'A few rushed answers in the final third of the interview',
]

export const transcript = [
  { time: '00:12', speaker: 'Interviewer', text: 'Thanks for joining us today. Could you start by walking us through your background?' },
  { time: '00:21', speaker: 'Candidate', text: 'Absolutely. I have around six years of experience in product design, primarily focused on B2B SaaS platforms where I led design systems and end-to-end research initiatives.' },
  { time: '01:05', speaker: 'Interviewer', text: 'Great. Tell me about a project you are particularly proud of.' },
  { time: '01:14', speaker: 'Candidate', text: 'One project that stands out is when we redesigned the onboarding flow. We reduced drop-off by 34% by simplifying the steps and introducing contextual guidance.' },
  { time: '02:38', speaker: 'Interviewer', text: 'How did you measure success for that initiative?' },
  { time: '02:47', speaker: 'Candidate', text: 'We tracked activation rate, time-to-first-value, and qualitative feedback. The combination gave us a balanced view of both behavior and sentiment.' },
  { time: '04:10', speaker: 'Interviewer', text: 'What about a time something did not go as planned?' },
  { time: '04:19', speaker: 'Candidate', text: 'Early on, I shipped a feature without enough usability testing. It taught me to always validate assumptions with real users before committing engineering effort.' },
  { time: '06:02', speaker: 'Interviewer', text: 'How do you collaborate with engineering and product?' },
  { time: '06:11', speaker: 'Candidate', text: 'I believe in early, continuous collaboration. I bring engineers into design reviews so we catch constraints early and ship faster together.' },
]

export const aiSummary = {
  executive:
    'Sofia presented as a confident, well-prepared candidate with strong communication skills and deep domain expertise in product design. Her answers were structured, example-driven, and demonstrated measurable impact. Confidence and positive sentiment trended upward throughout the session, indicating comfort and authenticity. Minor areas for growth include reducing filler words and quantifying outcomes more consistently.',
  keyStrengths: [
    'Clear, structured storytelling with the STAR method',
    'Quantified impact (34% drop-off reduction) where relevant',
    'Calm, confident delivery that strengthened over time',
    'Collaborative mindset across engineering and product',
  ],
  improvements: [
    'Reduce filler words during transitions between ideas',
    'Add metrics to all major accomplishments, not just some',
    'Maintain consistent pacing in the latter half of interviews',
  ],
  recommendations: [
    'Advance to the technical / portfolio round',
    'Prepare a structured deep-dive on the onboarding redesign',
    'Practice concise STAR responses to control pacing',
  ],
  recommendation: 'Advance',
}

export const interviewOverview = {
  id: 'int_1042',
  candidate: 'Sofia Alvarez',
  role: 'Senior Product Designer',
  date: '2026-06-18',
  duration: '32:14',
  overallScore: 88,
  recommendation: 'Advance',
}

export const testimonials = [
  {
    name: 'Elena Rodriguez',
    role: 'Head of Talent, Vertex Labs',
    quote:
      'IntervAI cut our screening time in half. The confidence and sentiment insights help us make fairer, faster decisions.',
    rating: 5,
  },
  {
    name: 'James Whitfield',
    role: 'Recruiting Manager, Loop Health',
    quote:
      'The automated summary reports are a game-changer. What used to take an hour of notes now takes thirty seconds.',
    rating: 5,
  },
  {
    name: 'Aisha Khan',
    role: 'People Ops Lead, Brightwave',
    quote:
      'Our candidates love the consistency. Every interview is analyzed against the same objective signals.',
    rating: 5,
  },
]

// Steps shown on the Processing screen
export const processingSteps = [
  { key: 'upload', label: 'Uploading File', description: 'Securely transferring your recording' },
  { key: 'stt', label: 'Speech-to-Text Conversion', description: 'Transcribing audio with high accuracy' },
  { key: 'sentiment', label: 'Sentiment Analysis', description: 'Detecting tone and emotional signals' },
  { key: 'confidence', label: 'Confidence Evaluation', description: 'Scoring delivery and assurance' },
  { key: 'report', label: 'Report Generation', description: 'Compiling your insights report' },
]
