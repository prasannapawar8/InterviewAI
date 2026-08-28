const STAR_CUES = {
  S: {
    name: 'Situation',
    patterns: [
      /\bsituation\b/i,
      /\bcontext\b/i,
      /\bwhen i (joined|started|worked)\b/i,
      /\bat (the|my) (company|team|startup|previous role)\b/i,
      /\bwe were (facing|dealing|struggling)\b/i,
      /\bthe problem was\b/i,
    ],
  },
  T: {
    name: 'Task',
    patterns: [
      /\btask\b/i,
      /\bmy (role|job|responsibility) was\b/i,
      /\bi was (asked|responsible|tasked|assigned)\b/i,
      /\bthe goal was\b/i,
      /\bi needed to\b/i,
    ],
  },
  A: {
    name: 'Action',
    patterns: [
      /\bi (implemented|built|designed|led|created|developed|wrote|shipped)\b/i,
      /\bwe (implemented|shipped|redesigned|migrated|launched)\b/i,
      /\bwhat i did\b/i,
      /\bmy approach\b/i,
      /\bi (coordinated|collaborated|facilitated)\b/i,
    ],
  },
  R: {
    name: 'Result',
    patterns: [
      /\bas a result\b/i,
      /\b(the )?result(s)?\b/i,
      /\bimpact\b/i,
      /\b\d+\s?(%|percent)\b/i,
      /\b(reduced|increased|improved|cut|grew)\b/i,
      /\boutcome\b/i,
    ],
  },
}

function candidateText(transcript = []) {
  return transcript
    .filter((l) => String(l.speaker || '').toLowerCase().includes('candid'))
    .map((l) => l.text)
    .join(' ')
}

/** Rule-based STAR coverage on candidate speech (no LLM). */
export function detectStar(transcript = []) {
  const text = candidateText(transcript)
  const letters = Object.entries(STAR_CUES).map(([letter, spec]) => {
    const matched = spec.patterns.find((re) => re.test(text))
    return {
      letter,
      name: spec.name,
      present: Boolean(matched),
      cue: matched ? String(matched).replace(/^\/|\/i$/g, '') : null,
    }
  })
  const found = letters.filter((l) => l.present).length
  return {
    found,
    total: 4,
    missing: letters.filter((l) => !l.present).map((l) => l.letter),
    letters,
  }
}
