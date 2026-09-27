import test from 'node:test'
import assert from 'node:assert/strict'
import { NOTES, practiceNotes } from './audio.js'

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
