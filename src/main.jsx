import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { NOTES, OCTAVE_RANGES, drawTestNote, playNote, practiceNotes, stopNote } from './audio.js'
import { focusNotes, pickPracticeNote } from './practice.js'
import { scoreAnswer } from './scoring.js'
import './styles.css'

function App() {
  const [activity, setActivity] = useState('test')
  const [mode, setMode] = useState('natural')
  const [octaveCount, setOctaveCount] = useState(1)
  const [focusSize, setFocusSize] = useState(3)
  const [showNoteLabels, setShowNoteLabels] = useState(true)
  const [preciseChoice, setPreciseChoice] = useState('')
  const [target, setTarget] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [audioError, setAudioError] = useState('')
  const [practiceAttempts, setPracticeAttempts] = useState(0)
  const [practiceSolved, setPracticeSolved] = useState(0)
  const targetRef = useRef(null)
  const answerRef = useRef(null)
  const activityRef = useRef(activity)
  const settingsRef = useRef({ test: { mode, octaveCount }, practice: { mode, octaveCount } })
  const modeRef = useRef(mode)
  const octaveCountRef = useRef(octaveCount)
  const focusSizeRef = useRef(focusSize)
  const missesRef = useRef({})
  const testBagRef = useRef([])
  const testRecentRef = useRef([])
  const practiceRecentRef = useRef([])
  const comparisonTimerRef = useRef(null)

  const range = OCTAVE_RANGES.find((option) => option.count === octaveCount)
  const rangeNotes = practiceNotes('chromatic', octaveCount)
  const answerNotes = practiceNotes(mode, octaveCount)
  const focusedNotes = focusNotes(answerNotes, focusSize)
  const whiteNotes = rangeNotes.filter((note) => !note.black)
  let whitePosition = 0
  const blackNotes = rangeNotes.flatMap((note) => {
    if (!note.black) {
      whitePosition += 1
      return []
    }
    return [{ note, whitePosition }]
  })
  const roundResult = answer && target ? scoreAnswer(target.semitone, answer.semitone) : null
  const isCorrect = roundResult?.distance === 0
  const distanceLabel = roundResult?.distance === 1 ? '1 semitone' : `${roundResult?.distance} semitones`
  const isPractice = activity === 'practice'
  const canGuess = target && (!answer || (isPractice && !isCorrect))

  function keyClass(note) {
    const selected = answer?.semitone === note.semitone
    const selectedClass = selected ? isCorrect ? 'selected-correct' : roundResult.distance <= 2 ? 'selected-near' : 'selected-wrong' : ''
    return `${selectedClass} ${answer && target?.semitone === note.semitone && (!isPractice || isCorrect) ? 'revealed' : ''}`
  }

  async function sound(note) {
    try {
      setAudioError('')
      await playNote(note.semitone)
    } catch (error) {
      setAudioError(error.message || 'Audio could not start. Try again.')
    }
  }

  function stopComparison() {
    if (comparisonTimerRef.current) window.clearTimeout(comparisonTimerRef.current)
    comparisonTimerRef.current = null
    stopNote()
  }

  function playSingle(note) {
    stopComparison()
    void sound(note)
  }

  function compareNotes(guess, original) {
    stopComparison()
    void sound(guess)
    comparisonTimerRef.current = window.setTimeout(() => {
      comparisonTimerRef.current = null
      void sound(original)
    }, 950)
  }

  function clearQuestion() {
    stopComparison()
    targetRef.current = null
    answerRef.current = null
    setTarget(null)
    setAnswer(null)
    setPreciseChoice('')
    setPracticeAttempts(0)
    setAudioError('')
  }

  function nextNote() {
    stopComparison()
    const pool = practiceNotes(modeRef.current, octaveCountRef.current)
    let next
    if (activityRef.current === 'practice') {
      next = pickPracticeNote(focusNotes(pool, focusSizeRef.current), practiceRecentRef.current, missesRef.current)
      practiceRecentRef.current = [...practiceRecentRef.current, next.midi].slice(-2)
    } else {
      const draw = drawTestNote(pool, testBagRef.current, testRecentRef.current)
      next = draw.note
      testBagRef.current = draw.remaining
      testRecentRef.current = [...testRecentRef.current, next.midi].slice(-2)
    }
    targetRef.current = next
    answerRef.current = null
    setTarget(next)
    setAnswer(null)
    setPreciseChoice('')
    setPracticeAttempts(0)
    void sound(next)
  }

  function choose(note) {
    if (!targetRef.current || answerRef.current) return
    if (modeRef.current === 'natural' && note.black) return
    const activeRange = OCTAVE_RANGES.find((option) => option.count === octaveCountRef.current)
    if (note.midi < activeRange.startMidi || note.midi > activeRange.endMidi) return
    const result = scoreAnswer(targetRef.current.semitone, note.semitone)
    if (activityRef.current === 'practice') {
      setPracticeAttempts((value) => value + 1)
      if (result.distance === 0) {
        playSingle(note)
        answerRef.current = note
        setPracticeSolved((value) => value + 1)
      } else {
        missesRef.current[targetRef.current.midi] = (missesRef.current[targetRef.current.midi] || 0) + 1
        compareNotes(note, targetRef.current)
      }
      setAnswer(note)
      setPreciseChoice('')
      return
    }
    playSingle(note)
    answerRef.current = note
    setAnswer(note)
    setRound((value) => value + 1)
    setTotalScore((value) => value + result.points)
    if (note.semitone === targetRef.current.semitone) {
      setCorrect((value) => value + 1)
      setStreak((value) => value + 1)
    } else {
      setStreak(0)
    }
  }

  function resetScore() {
    testBagRef.current = []
    testRecentRef.current = []
    setRound(0)
    setCorrect(0)
    setTotalScore(0)
    setStreak(0)
    clearQuestion()
  }

  function resetPractice() {
    missesRef.current = {}
    practiceRecentRef.current = []
    setPracticeSolved(0)
    clearQuestion()
  }

  function changeActivity(nextActivity) {
    if (nextActivity === activityRef.current) return
    activityRef.current = nextActivity
    setActivity(nextActivity)
    const settings = settingsRef.current[nextActivity]
    modeRef.current = settings.mode
    octaveCountRef.current = settings.octaveCount
    setMode(settings.mode)
    setOctaveCount(settings.octaveCount)
    clearQuestion()
  }

  function changeFocusSize(nextSize) {
    if (nextSize === focusSizeRef.current) return
    focusSizeRef.current = nextSize
    setFocusSize(nextSize)
    resetPractice()
  }

  function changeMode(nextMode) {
    if (nextMode === modeRef.current) return
    modeRef.current = nextMode
    settingsRef.current[activityRef.current].mode = nextMode
    setMode(nextMode)
    if (activityRef.current === 'test') resetScore()
    else resetPractice()
  }

  function changeRange(nextCount) {
    if (nextCount === octaveCountRef.current) return
    octaveCountRef.current = nextCount
    settingsRef.current[activityRef.current].octaveCount = nextCount
    setOctaveCount(nextCount)
    if (activityRef.current === 'test') resetScore()
    else resetPractice()
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
      const focusedControl = event.target instanceof HTMLElement && ['BUTTON', 'A'].includes(event.target.tagName)
      if (event.code === 'Space') {
        if (focusedControl) return
        if (targetRef.current) {
          event.preventDefault()
          playSingle(targetRef.current)
        }
        return
      }
      if (event.key === 'Enter' && answerRef.current) {
        if (focusedControl) return
        nextNote()
        return
      }
      if (octaveCountRef.current !== 1) return
      const note = NOTES.find((item) => item.octave === 4 && item.key.toLowerCase() === event.key.toLowerCase())
      if (note) choose(note)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#top" aria-label="Pitch Practice home"><span class="brand-mark" aria-hidden="true">♪</span><span>Pitch Practice</span></a>
        <span class="topbar-caption">A little listening goes a long way.</span>
      </header>

      <main id="top" class="main-content">
        <div class="intro">
          <div>
            <p class="intro-kicker">Ear training, one note at a time</p>
            <h1>Hear it. <span>Find it.</span></h1>
            <p class="intro-copy">{isPractice ? 'Train your ear one note at a time. Hear what you picked, adjust, and keep going until you find the sound.' : 'Listen to a note, then pick the key you heard. One guess counts toward your score.'}</p>
          </div>
          <div class="practice-count" aria-label={isPractice ? `${practiceSolved} notes found in practice` : `${round} notes answered`}><strong>{String(isPractice ? practiceSolved : round).padStart(2, '0')}</strong><span>{isPractice ? 'notes found' : 'notes tried'}</span></div>
        </div>

        <div class="activity-selector" role="group" aria-label="Choose an activity">
          <button type="button" class={`activity-option ${isPractice ? 'active' : ''}`} aria-pressed={isPractice} onClick={() => changeActivity('practice')}><strong>Practice</strong><span>Listen, adjust, learn</span></button>
          <button type="button" class={`activity-option ${!isPractice ? 'active' : ''}`} aria-pressed={!isPractice} onClick={() => changeActivity('test')}><strong>Test</strong><span>One guess, scored</span></button>
        </div>

        <section class="practice-card" data-activity={activity} aria-labelledby="practice-title">
          <div class="practice-topline">
            <div><p class="section-label">{isPractice ? 'Unscored practice' : 'Scored test'}</p><h2 id="practice-title">{isPractice ? 'Find the note' : 'Name that note'}</h2></div>
            <div class="mode-switch" role="group" aria-label="Note selection">
              <button type="button" class={mode === 'natural' ? 'mode active' : 'mode'} aria-pressed={mode === 'natural'} onClick={() => changeMode('natural')}>White keys</button>
              <button type="button" class={mode === 'chromatic' ? 'mode active' : 'mode'} aria-pressed={mode === 'chromatic'} onClick={() => changeMode('chromatic')}>All notes</button>
            </div>
          </div>

          <div class="range-controls">
            <label class="range-label" for="octave-count">Octaves</label>
            <select id="octave-count" class="range-select" value={octaveCount} onChange={(event) => changeRange(Number(event.currentTarget.value))}>
              {OCTAVE_RANGES.map((option) => <option key={option.count} value={option.count}>{option.count}</option>)}
            </select>
            <span class="range-description">{range.label}{octaveCount === 8 ? ' · 88 keys' : ''}</span>
          </div>

          {isPractice && <div class="focus-controls">
            <div><label class="focus-label" for="focus-size">Focus set</label><p>Start small, then add notes when you’re ready.</p></div>
            <select id="focus-size" class="range-select focus-select" value={focusSize} onChange={(event) => changeFocusSize(event.currentTarget.value === 'all' ? 'all' : Number(event.currentTarget.value))}>
              <option value="3">3 notes</option><option value="5">5 notes</option><option value="all">Full range</option>
            </select>
            {showNoteLabels && focusSize !== 'all' && <span class="focus-note-list">{focusedNotes.map((note) => note.label).join(' · ')}</span>}
          </div>}

          <div class="sound-stage">
            <div class="sound-emblem" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <div class="sound-copy">
              {!target && <><h3>{isPractice ? 'Ready to practice?' : 'Ready to listen?'}</h3><p>Press play to hear your first note.</p></>}
              {target && !answer && <><h3>What note was that?</h3><p>{isPractice ? 'Pick a key. If it’s not right, you can keep trying.' : 'Tap a piano key below. You can replay the sound.'}</p></>}
              {answer && isPractice && !isCorrect && <><h3>{distanceLabel} {roundResult.direction}.</h3><p>Your {answer.label} plays first, then the target. {roundResult.direction === 'low' ? 'Try a higher key.' : 'Try a lower key.'}</p></>}
              {answer && (!isPractice || isCorrect) && <><h3>{isCorrect ? 'That’s the one!' : roundResult.distance <= 2 ? 'Close!' : `That was ${target.label}.`}</h3><p>{isPractice ? `You found ${target.label} in ${practiceAttempts} ${practiceAttempts === 1 ? 'try' : 'tries'}.` : isCorrect ? `You heard ${target.label} correctly.` : `You picked ${answer.label}, ${distanceLabel} ${roundResult.direction}. The note was ${target.label}.`}</p></>}
            </div>
            <div class="sound-actions">
              {!target ? <button class="btn btn-primary" type="button" onClick={() => nextNote()}>▶&nbsp; Play a note</button> : <><button class="btn btn-secondary" type="button" onClick={() => playSingle(NOTES.find((note) => note.semitone === 0))}>Hear C4</button><button class="btn btn-secondary" type="button" onClick={() => playSingle(target)}>↻&nbsp; Replay note</button>{isPractice && answer && !isCorrect && <button class="btn btn-secondary" type="button" onClick={() => compareNotes(answer, target)}>Compare again</button>}</>}
            </div>
          </div>

          {audioError && <p class="audio-error" role="alert">{audioError}</p>}

          <div class="answer-area">
            <div class="answer-heading"><p>Pick a key</p><label class="label-toggle"><input type="checkbox" checked={showNoteLabels} onChange={(event) => setShowNoteLabels(event.currentTarget.checked)} /><span>Show note labels</span></label></div>
            {showNoteLabels && <div class="keyboard-scale" aria-hidden="true">
              {whiteNotes.filter((note) => note.pitchIndex === 0).map((note) => <span key={note.midi} style={{ left: `${(whiteNotes.findIndex((white) => white.midi === note.midi) / whiteNotes.length) * 100}%`, transform: note.midi === range.endMidi ? 'translateX(-100%)' : undefined }}>{note.label}</span>)}
            </div>}
            <div class="piano" data-density={octaveCount === 1 ? 'single' : octaveCount === 2 ? 'medium' : 'dense'} role="group" aria-label={`Piano keys from ${range.label}`}>
              <div class="white-keys" style={{ gridTemplateColumns: `repeat(${whiteNotes.length}, minmax(0, 1fr))` }}>
                {whiteNotes.map((note) => <button key={note.midi} type="button" class={`piano-key white-key ${keyClass(note)}`} aria-label={`${note.label}${answer && target?.midi === note.midi && (!isPractice || isCorrect) ? ', correct note' : ''}`} title={showNoteLabels ? note.label : undefined} disabled={!canGuess} onClick={() => choose(note)}>{showNoteLabels && <><span class="key-name">{note.name}</span>{octaveCount === 1 && <span class="key-shortcut">{note.key}</span>}</>}</button>)}
              </div>
              {blackNotes.map(({ note, whitePosition }) => <button key={note.midi} type="button" class={`piano-key black-key ${mode === 'natural' ? 'unavailable' : ''} ${keyClass(note)}`} style={{ left: `${(whitePosition - 0.31) * 100 / whiteNotes.length}%`, width: `${62 / whiteNotes.length}%` }} aria-label={`${note.label}${answer && target?.midi === note.midi && (!isPractice || isCorrect) ? ', correct note' : ''}`} title={showNoteLabels ? note.label : undefined} disabled={mode === 'natural' || !canGuess} onClick={() => choose(note)}>{showNoteLabels && <><span class="key-name">{note.name}</span>{octaveCount === 1 && <span class="key-shortcut">{note.key}</span>}</>}</button>)}
            </div>
            {octaveCount > 1 && showNoteLabels && <div class="precision-picker">
              <label for="precise-note">Need a larger target? Choose a note here</label>
              <div class="precision-controls"><select id="precise-note" value={preciseChoice} disabled={!canGuess} onChange={(event) => setPreciseChoice(event.currentTarget.value)}><option value="">Select note</option>{answerNotes.map((note) => <option key={note.midi} value={note.midi}>{note.label}</option>)}</select><button class="btn btn-secondary" type="button" disabled={!canGuess || !preciseChoice} onClick={() => choose(NOTES[Number(preciseChoice) - 21])}>Guess note</button></div>
            </div>}
            <div class="answer-footer"><span role="status" aria-live="polite">{isPractice ? answer ? isCorrect ? `Found in ${practiceAttempts} ${practiceAttempts === 1 ? 'try' : 'tries'} · no points counted` : `${distanceLabel} ${roundResult.direction} · keep trying` : target ? 'Listen, choose, and adjust until you find it' : 'Start your unscored practice' : answer ? `+${roundResult.points} points${isCorrect ? ' · exact match' : ` · ${distanceLabel} ${roundResult.direction}`}` : target ? 'Choose the note you heard' : 'Press play to begin'}</span>{answer && (isCorrect || !isPractice) && <button class="btn btn-primary next-button" type="button" onClick={() => nextNote()}>Next note <span aria-hidden="true">→</span></button>}</div>
          </div>
        </section>

        {isPractice ? <div class="practice-summary"><div><p class="section-label">Practice progress</p><h2>{practiceSolved} {practiceSolved === 1 ? 'note' : 'notes'} found in this set</h2><p>Recent notes take a turn off; larger sets revisit missed notes more often. Your test score stays untouched.</p></div>{focusSize !== 'all' && practiceSolved >= (focusSize === 3 ? 3 : 5) && <button class="btn btn-secondary" type="button" onClick={() => changeFocusSize(focusSize === 3 ? 5 : 'all')}>Try {focusSize === 3 ? '5 notes' : 'full range'} →</button>}</div> : <><div class="stats-heading"><h2>Session score</h2><button class="reset-button" type="button" onClick={resetScore} disabled={round === 0 && !target}>Reset score</button></div>
        <div class="stats-row" aria-label="Test statistics">
          <div class="stat"><strong>{totalScore}</strong><p>total points</p></div>
          <div class="stat"><strong>{round ? Math.round(totalScore / round) : 0}<span> / 100</span></strong><p>average score</p></div>
          <div class="stat"><strong>{correct}<span> / {round}</span></strong><p>exact matches</p></div>
          <div class="stat"><strong>{streak}</strong><p>exact streak</p></div>
        </div>
        <p class="score-rule">Scoring: 100 points for an exact match, minus 10 for each semitone away.</p></>}
        <p class="help-line">Keyboard: {octaveCount === 1 && showNoteLabels ? 'use the letters shown on the keys · ' : ''}<kbd>Space</kbd> to replay · <kbd>Enter</kbd> for the next note{isPractice ? ' after finding it' : ''}</p>
      </main>
      <footer class="footer"><span>Pitch Practice</span><span>Made for the small daily habit of listening.</span></footer>
    </div>
  )
}

render(<App />, document.getElementById('app'))
