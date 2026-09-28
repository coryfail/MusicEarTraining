import test from 'node:test'
import assert from 'node:assert/strict'
import { NOTES, drawTestNote, playNote, practiceNotes, stopNote } from './audio.js'

test('range options expand around the original C4 to B4 keyboard', () => {
  assert.equal(practiceNotes('natural', 1).length, 7)
  assert.deepEqual(practiceNotes('natural', 2).map((note) => note.octave).filter((octave, index, all) => all.indexOf(octave) === index), [3, 4])
  assert.equal(practiceNotes('chromatic', 3).length, 36)
  assert.equal(practiceNotes('chromatic', 7).length, 84)
  assert.equal(practiceNotes('chromatic', 8).length, 88)
  assert.equal(practiceNotes('natural', 8).length, 52)
  assert.equal(practiceNotes('chromatic', 8)[0].label, 'A0')
  assert.equal(practiceNotes('chromatic', 8).at(-1).label, 'C8')
})

test('the same pitch in another octave is twelve semitones away', () => {
  const c3 = NOTES.find((note) => note.label === 'C3')
  const c4 = NOTES.find((note) => note.label === 'C4')
  const c5 = NOTES.find((note) => note.label === 'C5')
  assert.equal(c3.semitone, -12)
  assert.equal(c4.semitone, 0)
  assert.equal(c5.semitone, 12)
})

test('test draws every note before repeating and avoids recent notes across bags', () => {
  const pool = practiceNotes('natural', 1)
  let remaining = []
  let recent = []
  const drawn = []

  for (let index = 0; index < pool.length * 2; index += 1) {
    const result = drawTestNote(pool, remaining, recent, () => 0)
    drawn.push(result.note.midi)
    remaining = result.remaining
    recent = [...recent, result.note.midi].slice(-2)
  }

  assert.equal(new Set(drawn.slice(0, pool.length)).size, pool.length)
  assert.equal(new Set(drawn.slice(pool.length)).size, pool.length)
  assert.ok(!drawn.slice(pool.length - 2, pool.length).includes(drawn[pool.length]))
})

test('an older note waiting for audio to resume cannot play over a newer note', async () => {
  let resumeAudio
  const resumePromise = new Promise((resolve) => { resumeAudio = resolve })
  const startedFrequencies = []
  class FakeAudioContext {
    state = 'suspended'
    currentTime = 0
    destination = {}
    async resume() {
      await resumePromise
      this.state = 'running'
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          cancelScheduledValues() {},
          setTargetAtTime() {},
          value: 0,
        },
        connect() { return this },
        disconnect() {},
      }
    }
    createOscillator() {
      return {
        frequency: { value: 0 },
        connect(destination) { return destination },
        start() { startedFrequencies.push(this.frequency.value) },
        stop() {},
        disconnect() {},
      }
    }
  }
  const previousWindow = globalThis.window
  globalThis.window = { AudioContext: FakeAudioContext, setTimeout() {} }
  try {
    const first = playNote(0)
    const second = playNote(2)
    resumeAudio()
    await Promise.all([first, second])
    assert.equal(startedFrequencies.length, 3)
    assert.ok(Math.abs(startedFrequencies[0] - 293.665) < 0.01)
  } finally {
    stopNote()
    globalThis.window = previousWindow
  }
})
