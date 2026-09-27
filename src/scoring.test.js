import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreAnswer } from './scoring.js'

test('exact notes receive full points', () => {
  assert.deepEqual(scoreAnswer(9, 9), { distance: 0, points: 100, direction: null })
})

test('near misses score by semitone distance and report direction', () => {
  assert.deepEqual(scoreAnswer(5, 6), { distance: 1, points: 90, direction: 'high' })
  assert.deepEqual(scoreAnswer(5, 3), { distance: 2, points: 80, direction: 'low' })
})

test('far guesses never score below zero', () => {
  assert.deepEqual(scoreAnswer(0, 11), { distance: 11, points: 0, direction: 'high' })
})
