# SIXinONE — A Tribute to the Moog Memorymoog (1982)

> Unofficial educational web simulator inspired by the Moog Memorymoog Plus (Model 345, 1982–1985).
> Vanilla TypeScript + Web Audio API + Web MIDI API. No Tone.js, no samples.
> 6 voices, 18 oscillators, 24 dB/oct ladder filter, 100 archetypal factory presets, sequencer, MIDI in/thru/out, PWA.

**Status**: in active construction. See [PROMPT_CLAUDE_CODE.md](./PROMPT_CLAUDE_CODE.md) for the full design brief.

> Moog, Memorymoog, and the Moog logo are trademarks of Moog Music Inc.
> This project is an unofficial, non-commercial educational simulator. Not affiliated with Moog Music Inc.

## Quick start

```bash
npm install
npm run dev          # local dev server
npm run build        # production build (typechecked)
npm run preview      # preview the production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
```

## Stack

- Vite + TypeScript (strict)
- Web Audio API + AudioWorklet (custom Moog ladder filter, no third-party DSP)
- Web MIDI API (in / thru / out)
- IndexedDB (via `idb`) for user-preset persistence
- `vite-plugin-pwa` for installable offline PWA
- Vitest + ESLint + Prettier

## Roadmap

See PROMPT_CLAUDE_CODE.md for the 16-step build plan. Progress is tracked through incremental commits on `main`.

## License

[MIT](./LICENSE). Trademark notice in `LICENSE`.

## Credits

Built with reverence for the design work of Bob Moog, Tom Rhea, Herbert Deutsch, and the preset programmers credited in the 1982 Memorymoog user manual: Wendy Carlos, Jan Hammer, Don Airey, Tom Coster, Larry Fast, and others.
