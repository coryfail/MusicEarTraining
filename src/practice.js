export function focusNotes(notes, size) {
  if (size === 'all') return notes

  return [...notes]
    .sort((a, b) => Math.abs(a.midi - 60) - Math.abs(b.midi - 60) || b.midi - a.midi)
    .slice(0, size)
    .sort((a, b) => a.midi - b.midi)
}

export function pickPracticeNote(notes, previousMidi, misses = {}, random = Math.random) {
  const candidates = notes.length > 1 ? notes.filter((note) => note.midi !== previousMidi) : notes
  const weights = candidates.map((note) => 1 + Math.min(misses[note.midi] || 0, 4) * 2)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let pick = random() * total

  for (let index = 0; index < candidates.length; index += 1) {
    pick -= weights[index]
    if (pick < 0) return candidates[index]
  }
  return candidates.at(-1)
}
