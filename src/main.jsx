import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { NOTES, OCTAVE_RANGES, pickNote, playNote, practiceNotes } from './audio.js'
import { scoreAnswer } from './scoring.js'
import './styles.css'

function App() {
  const [mode, setMode] = useState('natural')
  const [octaveCount, setOctaveCount] = useState(1)
  const [showNoteLabels, setShowNoteLabels] = useState(true)
  const [preciseChoice, setPreciseChoice] = useState('')
  const [target, setTarget] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [audioError, setAudioError] = useState('')
  const targetRef = useRef(null)
  const answerRef = useRef(null)
  const modeRef = useRef(mode)
  const octaveCountRef = useRef(octaveCount)

  const range = OCTAVE_RANGES.find((option) => option.count === octaveCount)
  const rangeNotes = practiceNotes('chromatic', octaveCount)
  const answerNotes = practiceNotes(mode, octaveCount)
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

  function keyClass(note) {
    const selected = answer?.semitone === note.semitone
    const selectedClass = selected ? isCorrect ? 'selected-correct' : roundResult.distance <= 2 ? 'selected-near' : 'selected-wrong' : ''
    return `${selectedClass} ${answer && target?.semitone === note.semitone ? 'revealed' : ''}`
  }

  async function sound(note) {
    try {
      setAudioError('')
      await playNote(note.semitone)
    } catch (error) {
      setAudioError(error.message || 'Audio could not start. Try again.')
    }
  }

  function nextNote() {
    const next = pickNote(practiceNotes(modeRef.current, octaveCountRef.current), targetRef.current?.semitone)
    targetRef.current = next
    answerRef.current = null
    setTarget(next)
    setAnswer(null)
    setPreciseChoice('')
    void sound(next)
  }

  function choose(note) {
    if (!targetRef.current || answerRef.current) return
    if (modeRef.current === 'natural' && note.black) return
    const activeRange = OCTAVE_RANGES.find((option) => option.count === octaveCountRef.current)
    if (note.midi < activeRange.startMidi || note.midi > activeRange.endMidi) return
    void sound(note)
    answerRef.current = note
    setAnswer(note)
    setRound((value) => value + 1)
    setTotalScore((value) => value + scoreAnswer(targetRef.current.semitone, note.semitone).points)
    if (note.semitone === targetRef.current.semitone) {
      setCorrect((value) => value + 1)
      setStreak((value) => value + 1)
    } else {
      setStreak(0)
    }
  }

  function resetScore() {
    setRound(0)
    setCorrect(0)
    setTotalScore(0)
    setStreak(0)
    targetRef.current = null
    answerRef.current = null
    setTarget(null)
    setAnswer(null)
    setPreciseChoice('')
    setAudioError('')
  }

  function changeMode(nextMode) {
    if (nextMode === modeRef.current) return
    modeRef.current = nextMode
    setMode(nextMode)
    resetScore()
  }

  function changeRange(nextCount) {
    if (nextCount === octaveCountRef.current) return
    octaveCountRef.current = nextCount
    setOctaveCount(nextCount)
    resetScore()
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
          void sound(targetRef.current)
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
            <p class="intro-copy">Listen to a note, then pick the key you heard. Choose how many octaves to practice, up to the full piano.</p>
          </div>
          <div class="practice-count" aria-label={`${round} notes answered`}><strong>{String(round).padStart(2, '0')}</strong><span>notes tried</span></div>
        </div>

        <section class="practice-card" aria-labelledby="practice-title">
          <div class="practice-topline">
            <div><p class="section-label">Practice room</p><h2 id="practice-title">Name that note</h2></div>
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

          <div class="sound-stage">
            <div class="sound-emblem" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <div class="sound-copy">
              {!target && <><h3>Ready to listen?</h3><p>Press play to hear your first note.</p></>}
              {target && !answer && <><h3>What note was that?</h3><p>Tap a piano key below. You can replay the sound.</p></>}
              {answer && <><h3>{isCorrect ? 'That’s the one!' : roundResult.distance <= 2 ? 'Close!' : `That was ${target.label}.`}</h3><p>{isCorrect ? `You heard ${target.label} correctly.` : `You picked ${answer.label}, ${distanceLabel} ${roundResult.direction}. The note was ${target.label}.`}</p></>}
            </div>
            <div class="sound-actions">
              {!target ? <button class="btn btn-primary" type="button" onClick={() => nextNote()}>▶&nbsp; Play a note</button> : <><button class="btn btn-secondary" type="button" onClick={() => void sound(NOTES.find((note) => note.semitone === 0))}>Hear C4</button><button class="btn btn-secondary" type="button" onClick={() => void sound(target)}>↻&nbsp; Replay note</button></>}
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
                {whiteNotes.map((note) => <button key={note.midi} type="button" class={`piano-key white-key ${keyClass(note)}`} aria-label={`${note.label}${answer && target?.midi === note.midi ? ', correct note' : ''}`} title={showNoteLabels ? note.label : undefined} disabled={!target || !!answer} onClick={() => choose(note)}>{showNoteLabels && <><span class="key-name">{note.name}</span>{octaveCount === 1 && <span class="key-shortcut">{note.key}</span>}</>}</button>)}
              </div>
              {blackNotes.map(({ note, whitePosition }) => <button key={note.midi} type="button" class={`piano-key black-key ${mode === 'natural' ? 'unavailable' : ''} ${keyClass(note)}`} style={{ left: `${(whitePosition - 0.31) * 100 / whiteNotes.length}%`, width: `${62 / whiteNotes.length}%` }} aria-label={`${note.label}${answer && target?.midi === note.midi ? ', correct note' : ''}`} title={showNoteLabels ? note.label : undefined} disabled={mode === 'natural' || !target || !!answer} onClick={() => choose(note)}>{showNoteLabels && <><span class="key-name">{note.name}</span>{octaveCount === 1 && <span class="key-shortcut">{note.key}</span>}</>}</button>)}
            </div>
            {octaveCount > 1 && showNoteLabels && <div class="precision-picker">
              <label for="precise-note">Need a larger target? Choose a note here</label>
              <div class="precision-controls"><select id="precise-note" value={preciseChoice} disabled={!target || !!answer} onChange={(event) => setPreciseChoice(event.currentTarget.value)}><option value="">Select note</option>{answerNotes.map((note) => <option key={note.midi} value={note.midi}>{note.label}</option>)}</select><button class="btn btn-secondary" type="button" disabled={!target || !!answer || !preciseChoice} onClick={() => choose(NOTES[Number(preciseChoice) - 21])}>Guess note</button></div>
            </div>}
            <div class="answer-footer"><span role="status" aria-live="polite">{answer ? `+${roundResult.points} points${isCorrect ? ' · exact match' : ` · ${distanceLabel} ${roundResult.direction}`}` : target ? 'Choose the note you heard' : 'Press play to begin'}</span>{answer && <button class="btn btn-primary next-button" type="button" onClick={() => nextNote()}>Next note <span aria-hidden="true">→</span></button>}</div>
          </div>
        </section>

        <div class="stats-heading"><h2>Session score</h2><button class="reset-button" type="button" onClick={resetScore} disabled={round === 0 && !target}>Reset score</button></div>
        <div class="stats-row" aria-label="Practice statistics">
          <div class="stat"><strong>{totalScore}</strong><p>total points</p></div>
          <div class="stat"><strong>{round ? Math.round(totalScore / round) : 0}<span> / 100</span></strong><p>average score</p></div>
          <div class="stat"><strong>{correct}<span> / {round}</span></strong><p>exact matches</p></div>
          <div class="stat"><strong>{streak}</strong><p>exact streak</p></div>
        </div>
        <p class="score-rule">Scoring: 100 points for an exact match, minus 10 for each semitone away.</p>
        <p class="help-line">Keyboard: {octaveCount === 1 && showNoteLabels ? 'use the letters shown on the keys · ' : ''}<kbd>Space</kbd> to replay · <kbd>Enter</kbd> for the next note</p>
      </main>
      <footer class="footer"><span>Pitch Practice</span><span>Made for the small daily habit of listening.</span></footer>
    </div>
  )
}

render(<App />, document.getElementById('app'))
