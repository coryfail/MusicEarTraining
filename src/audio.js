const PITCHES = [
  { name: 'C', semitone: 0, key: 'A', black: false },
  { name: 'C♯', semitone: 1, key: 'W', black: true },
  { name: 'D', semitone: 2, key: 'S', black: false },
  { name: 'D♯', semitone: 3, key: 'E', black: true },
  { name: 'E', semitone: 4, key: 'D', black: false },
  { name: 'F', semitone: 5, key: 'F', black: false },
  { name: 'F♯', semitone: 6, key: 'T', black: true },
  { name: 'G', semitone: 7, key: 'G', black: false },
  { name: 'G♯', semitone: 8, key: 'Y', black: true },
  { name: 'A', semitone: 9, key: 'H', black: false },
  { name: 'A♯', semitone: 10, key: 'U', black: true },
  { name: 'B', semitone: 11, key: 'J', black: false },
]

// Standard 88-key piano: A0 (MIDI 21) through C8 (MIDI 108).
export const NOTES = Array.from({ length: 88 }, (_, index) => {
  const midi = index + 21
  const pitchIndex = midi % 12
  const octave = Math.floor(midi / 12) - 1
  const pitch = PITCHES[pitchIndex]
  return {
    ...pitch,
    octave,
    midi,
    pitchIndex,
    semitone: midi - 60,
    label: `${pitch.name}${octave}`,
  }
})

const RANGE_ENDPOINTS = [
  [60, 71],  // C4–B4
  [48, 71],  // C3–B4
  [48, 83],  // C3–B5
  [36, 83],  // C2–B5
  [36, 95],  // C2–B6
  [24, 95],  // C1–B6
  [24, 107], // C1–B7
  [21, 108], // A0–C8: the full 88-key piano
]

export const OCTAVE_RANGES = RANGE_ENDPOINTS.map(([startMidi, endMidi], index) => ({
  count: index + 1,
  startMidi,
  endMidi,
  label: `${NOTES[startMidi - 21].label}–${NOTES[endMidi - 21].label}`,
}))

export function practiceNotes(mode, octaveCount) {
  const range = OCTAVE_RANGES.find((option) => option.count === octaveCount)
  return NOTES.filter((note) => note.midi >= range.startMidi && note.midi <= range.endMidi && (mode === 'chromatic' || !note.black))
}

let context
let activeGain

export async function playNote(semitone) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) throw new Error('This browser does not support Web Audio.')
  context ??= new AudioContext()
  if (context.state === 'suspended') await context.resume()

  // Semitone 0 is C4 (MIDI 60); the range can cover the whole 88-key piano.
  const frequency = 440 * 2 ** ((60 + semitone - 69) / 12)
  const now = context.currentTime
  if (activeGain) {
    activeGain.gain.cancelScheduledValues(now)
    activeGain.gain.setTargetAtTime(0.0001, now, 0.01)
  }
  const gain = context.createGain()
  activeGain = gain
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.3)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7)
  gain.connect(context.destination)

  for (const [multiple, volume] of [[1, 1], [2, 0.18], [3, 0.06]]) {
    const oscillator = context.createOscillator()
    const partial = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency * multiple
    partial.gain.value = volume
    oscillator.connect(partial).connect(gain)
    oscillator.start(now)
    oscillator.stop(now + 1.72)
    oscillator.onended = () => {
      oscillator.disconnect()
      partial.disconnect()
    }
  }
  window.setTimeout(() => {
    if (activeGain === gain) activeGain = null
    gain.disconnect()
  }, 1850)
}

export function pickNote(pool, previous) {
  const candidates = pool.filter((note) => note.semitone !== previous)
  return candidates[Math.floor(Math.random() * candidates.length)]
}
