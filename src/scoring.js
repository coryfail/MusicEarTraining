export function scoreAnswer(targetSemitone, answerSemitone) {
  const distance = Math.abs(answerSemitone - targetSemitone)

  return {
    distance,
    points: Math.max(0, 100 - distance * 10),
    direction: distance === 0 ? null : answerSemitone > targetSemitone ? 'high' : 'low',
  }
}
