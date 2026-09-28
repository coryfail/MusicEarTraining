# Pitch Practice

A small Preact app for learning to identify notes by ear. Choose a number from 1 to 8 in the octave dropdown, hear a note, then pick it on the keyboard. The keyboard fits the entire selected range; 8 uses the full 88-key piano from A0 to C8. Start with white keys, or switch to chromatic notes.

Use **Practice** to learn without a score. It starts with a three-note focus set around C4; switch to five notes or the full selected range whenever you are ready. A wrong guess plays your key and then the target, tells you how far high or low you were, and lets you keep trying until you find it. Notes you miss reappear more often. **Test** keeps the original one-guess scoring game. Each activity keeps its own white/all-note and octave settings, so practice never changes your test score.

## Run locally

```sh
npm install
npm run dev
```

The sound is synthesized in the browser with Web Audio, so there are no audio files or external services. Browsers require a click or key press before sound can begin. Your guessed key plays its note so you can compare it with the target using **Replay note** or **Space**. Use **Hear C4** as a pitch reference, and press **Enter** for the next note. Turn off **Show note labels** for an unmarked keyboard; this also hides the labeled note picker used for larger ranges. In one-octave mode, the letters on the keys are answer shortcuts when labels are shown.

In Test, each answer earns 100 points for an exact match, minus 10 points per semitone of distance (minimum 0). The app shows your average score, exact matches, and exact-match streak for the current session. **Reset score** clears the test session and current question while keeping your note mode and range.

## Build

```sh
npm run build
```

Pushes to `main` run the tests and deploy the built app to GitHub Pages. The
relative asset paths also support a custom domain once it is configured in
GitHub Pages and DNS.
