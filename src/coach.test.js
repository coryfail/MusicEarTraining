import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeAttempts, buildCoachPlan } from './coach.js'

const attempt = (targetMidi, targetLabel, distance, direction = null, mode = 'natural') => ({
  targetMidi,
  targetLabel,
  distance,
  direction,
  points: Math.max(0, 100 - distance * 10),
  mode,
})

test('analyzes accuracy, directional bias, and weakest notes', () => {
  const result = analyzeAttempts([
    attempt(60, 'C4', 1, 'high'),
    attempt(60, 'C4', 2, 'low'),
    attempt(64, 'E4', 0),
    attempt(67, 'G4', 3, 'high', 'chromatic'),
  ])

  assert.equal(result.accuracy, 25)
  assert.equal(result.averageDistance, 1.5)
  assert.equal(result.bias, 'high')
  assert.equal(result.dominantMode, 'natural')
  assert.deepEqual(result.weakestNotes.map((note) => note.label), ['C4', 'G4', 'E4'])
  assert.equal(result.weakestNotes[0].accuracy, 0)
})

test('turns results into a focused coaching plan', () => {
  const plan = buildCoachPlan(analyzeAttempts([
    attempt(60, 'C4', 0),
    attempt(62, 'D4', 0),
    attempt(64, 'E4', 2, 'high'),
    attempt(67, 'G4', 0),
  ]))

  assert.match(plan.headline, /solid ear/)
  assert.equal(plan.weakNotes[0], 'E4')
  assert.equal(plan.recommendedMode, 'natural')
  assert.equal(plan.steps.length, 3)
})
