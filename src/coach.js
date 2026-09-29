const MAX_FOCUS_NOTES = 3

function noteName(label = '') {
  return label.replace(/[0-9]/g, '')
}

function sortWeakest(a, b) {
  const missDifference = b.misses - a.misses
  if (missDifference !== 0) return missDifference

  const distanceDifference = b.averageDistance - a.averageDistance
  if (distanceDifference !== 0) return distanceDifference

  return b.attempts - a.attempts
}

export function analyzeAttempts(attempts = []) {
  if (attempts.length === 0) return null

  const exact = attempts.filter((attempt) => attempt.distance === 0).length
  const totalDistance = attempts.reduce((sum, attempt) => sum + attempt.distance, 0)
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.points, 0)
  const high = attempts.filter((attempt) => attempt.direction === 'high').length
  const low = attempts.filter((attempt) => attempt.direction === 'low').length
  const modes = attempts.reduce((counts, attempt) => {
    counts[attempt.mode] = (counts[attempt.mode] || 0) + 1
    return counts
  }, {})
  const noteStats = new Map()

  for (const attempt of attempts) {
    const key = attempt.targetMidi ?? attempt.targetLabel
    const existing = noteStats.get(key) || {
      midi: attempt.targetMidi,
      label: attempt.targetLabel,
      name: noteName(attempt.targetLabel),
      attempts: 0,
      misses: 0,
      totalDistance: 0,
    }
    existing.attempts += 1
    existing.misses += attempt.distance === 0 ? 0 : 1
    existing.totalDistance += attempt.distance
    noteStats.set(key, existing)
  }

  const weakestNotes = [...noteStats.values()]
    .map((note) => ({
      ...note,
      averageDistance: note.totalDistance / note.attempts,
      accuracy: Math.round(((note.attempts - note.misses) / note.attempts) * 100),
    }))
    .sort(sortWeakest)
    .slice(0, MAX_FOCUS_NOTES)

  const dominantMode = Object.entries(modes).sort(([, a], [, b]) => b - a)[0]?.[0] || 'natural'
  const bias = high === low ? 'balanced' : high > low ? 'high' : 'low'

  return {
    attempts: attempts.length,
    exact,
    accuracy: Math.round((exact / attempts.length) * 100),
    averageDistance: totalDistance / attempts.length,
    averageScore: Math.round(totalScore / attempts.length),
    high,
    low,
    bias,
    dominantMode,
    weakestNotes,
    latest: attempts.at(-1),
  }
}

function formatNoteList(notes) {
  if (notes.length === 1) return notes[0]
  if (notes.length === 2) return `${notes[0]} and ${notes[1]}`
  return `${notes.slice(0, -1).join(', ')}, and ${notes.at(-1)}`
}

export function buildCoachPlan(analysis) {
  if (!analysis) return null

  const focusLabels = analysis.weakestNotes.map((note) => note.label)
  const focusNames = analysis.weakestNotes.map((note) => note.name)
  const focusText = focusLabels.length > 0 ? formatNoteList(focusLabels) : 'the notes you just heard'
  const modeText = analysis.dominantMode === 'chromatic' ? 'all notes, including black keys' : 'white keys first'
  const biasText = analysis.bias === 'balanced'
    ? 'Your high and low guesses are fairly balanced.'
    : `You tend to guess ${analysis.bias === 'high' ? 'above' : 'below'} the target, so use the direction cue before changing keys.`

  const steps = [
    `Warm up with C4 as a reference, then listen for ${focusText} without looking at the keyboard.`,
    `Practice ${focusNames.length > 0 ? focusText : 'a small set of notes'} in ${modeText} until you can name each one twice in a row.`,
    analysis.bias === 'balanced'
      ? 'Finish with a short scored test and aim for three exact answers in a row.'
      : `When you miss, move ${analysis.bias === 'high' ? 'down' : 'up'} first instead of making a large jump; then replay the target to reinforce the difference.`,
  ]

  return {
    headline: analysis.accuracy >= 75
      ? 'You have a solid ear — now sharpen the outliers.'
      : analysis.accuracy >= 45
        ? 'You are building the map; a smaller focus set will help.'
        : 'Let’s make the sound-to-key map easier to hold onto.',
    insight: `${analysis.accuracy}% exact across ${analysis.attempts} ${analysis.attempts === 1 ? 'answer' : 'answers'}, averaging ${analysis.averageDistance.toFixed(1)} semitones away. ${biasText}`,
    weakNotes: focusLabels,
    steps,
    recommendedFocusSize: focusLabels.length >= 3 ? 3 : 5,
    recommendedMode: analysis.dominantMode,
  }
}
