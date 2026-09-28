export function focusNotes(notes, size) {
  if (size === 'all') return notes

  return [...notes]
    .sort((a, b) => Math.abs(a.midi - 60) - Math.abs(b.midi - 60) || b.midi - a.midi)
    .slice(0, size)
    .sort((a, b) => a.midi - b.midi)
}

export function pickPracticeNote(notes, recentMidi = [], misses = {}, random = Math.random) {
  const recent = new Set(recentMidi.slice(-Math.min(2, notes.length - 1)))
  const candidates = notes.filter((note) => !recent.has(note.midi))
  const weights = candidates.map((note) => 1 + Math.min(misses[note.midi] || 0, 4) * 2)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let pick = random() * total

  for (let index = 0; index < candidates.length; index += 1) {
    pick -= weights[index]
    if (pick < 0) return candidates[index]
  }
  return candidates.at(-1)
}
