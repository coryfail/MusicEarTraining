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

test('practice gives missed notes more weight without repeating either recent note', () => {
  const notes = [60, 62, 64, 65, 67].map((midi) => NOTES[midi - 21])
  assert.equal(pickPracticeNote(notes, [60, 62], { 65: 2 }, () => 0.3).midi, 65)

  const smallSet = notes.slice(0, 3)
  let recent = []
  const drawn = []
  for (let index = 0; index < 15; index += 1) {
    const next = pickPracticeNote(smallSet, recent, {}, () => 0)
    drawn.push(next.midi)
    recent = [...recent, next.midi].slice(-2)
  }
  for (let index = 2; index < drawn.length; index += 1) {
    assert.equal(new Set(drawn.slice(index - 2, index + 1)).size, 3)
  }
})
