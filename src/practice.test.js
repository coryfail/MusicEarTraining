import test from 'node:test'
import assert from 'node:assert/strict'
import { NOTES, practiceNotes } from './audio.js'
import { focusNotes, pickPracticeNote } from './practice.js'

test('a small focus set starts near C4 and grows without leaving the test range', () => {
  const whiteKeys = practiceNotes('natural', 1)
  assert.deepEqual(focusNotes(whiteKeys, 3).map((note) => note.label), ['C4', 'D4', 'E4'])
  assert.deepEqual(focusNotes(whiteKeys, 5).map((note) => note.label), ['C4', 'D4', 'E4', 'F4', 'G4'])
  assert.equal(focusNotes(whiteKeys, 'all').length, whiteKeys.length)
  assert.deepEqual(focusNotes(practiceNotes('chromatic', 1), 3).map((note) => note.label), ['C4', 'C♯4', 'D4'])
  assert.equal(focusNotes(practiceNotes('chromatic', 8), 'all').length, 88)
})

test('missed notes receive more practice weight and the previous note is avoided', () => {
  const notes = [NOTES[60 - 21], NOTES[62 - 21], NOTES[64 - 21]]
  assert.equal(pickPracticeNote(notes, 60, { 64: 2 }, () => 0.3).midi, 64)
  assert.equal(pickPracticeNote(notes, 60, { 60: 4 }, () => 0).midi, 62)
})
