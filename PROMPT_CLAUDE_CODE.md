# Prompt per Claude Code — SIXinONE Memorymoog

## Contesto del progetto

Sei in `~/Progetti/SixinONE/` (repo GitHub `pezzaliapp/SIXinONE`).
Costruisci da zero un **simulatore web fedele del Moog Memorymoog Plus** (Model 345, 1982–1985), inclusi audio polifonico, sequencer e MIDI in/out.
Devi lavorare in **piena autonomia**: leggere il README appena lo creo, decidere le scelte tecniche giuste, implementare tutto, fare commit incrementali.

Il proprietario del repo è Alessandro Pezzali (pezzaliapp.it). Lo stile dei suoi progetti precedenti è PWA leggera, vanilla-JS dove possibile, niente build pesanti se evitabili. Tieni questo come bias di default ma scegli liberamente se un tool ti fa risparmiare settimane.

## Cosa è il Memorymoog (per chi lo costruisce)

- Polisintetizzatore analogico Moog, 6 voci, 18 oscillatori (3 per voce), filtro low-pass 24dB/oct (lo stesso del Minimoog), tastiera 61 tasti.
- Tutti i parametri sono memorizzati in 100 program (0–99), richiamabili da tastierino numerico.
- Variante "Plus" (1984): aggiunge sequencer integrato + MIDI in/thru/out.
- Suono iconico: lead caldi, brass ricchi, sync screams stile Van Halen "Jump"-era, sweep filtrici cinematografici, basso enorme.

## Stack tecnico — scelta consigliata (motiva se devii)

- **Vanilla TypeScript + Vite + PWA plugin.** Niente React/Vue. Audio puro Web Audio API + AudioWorklet per oscillatori e filtro. Web MIDI API nativa. Persistenza preset utente in IndexedDB (Dexie o nativa). Tone.js è VIETATO: il suono Moog si fa con DSP custom, non con sample/preset di libreria.
- TypeScript strict mode. ESLint + Prettier configurati.
- File audio worklet separati per: voce (3 osc + mixer + filtro + 2 envelope + LFO), e per il filtro Moog (Huovilainen o Stilson-Smith, 24dB/oct, con resonance auto-oscillante a Emphasis ≥ 7 come da manuale).
- PWA: manifest, service worker, installabile, funziona offline (eccetto MIDI hardware).
- Repo a singolo branch `main`, commit chiari in inglese ("feat: ...", "fix: ...").

Se preferisci una variante (es. Web Components nativi, no Vite), motiva in 2 righe nel commit di setup e procedi.

## Architettura audio — non negoziabile

```
[Keyboard / MIDI / Sequencer]
        ↓ note + velocity
[Voice Allocator: 6 voci poly, allocazione cyclic / cyclic-w-memory / reset-to-A / reset-to-A-w-memory]
        ↓
[Voice × 6]:
   OSC1 (Saw / Tri / Pulse-width var) ─┐
   OSC2 (Saw / Tri / Pulse, ±semitoni, fine ±) ─┤→ [MIXER 4 livelli: OSC1, OSC2, OSC3, Noise (pink)]
   OSC3 (Saw / Tri / Pulse, ±semitoni, LOW switch = LFO mode, KB-track switch) ─┘
   SYNC 2→1 hard sync OSC1↔OSC2
        ↓
   [VCF Moog 24dB/oct, cutoff, emphasis (resonance), KB-track 0/1/3/2/3/full]
        ↓
   [VCA con envelope ADSR dedicato]
        ↓
[Voice Mixer]
        ↓
[Master Volume + Headphone]
        ↓
[Output stereo]

Modulazione:
- LFO globale (.1–100 Hz), waveshape: Tri / Saw+ / Saw− / Square / S&H
  → destinazioni (switch toggle, anche multiple): OSC1 freq, OSC2 freq, OSC3 freq, PW1, PW2, PW3, Filter cutoff
- Voice modulation (per-voce, sorgente = Filter Contour OPPURE OSC3)
  → destinazioni: OSC1 freq, OSC2 freq, PW1, PW2, Filter
  → Contoured OSC3 Amount: il filter envelope shape-a la modulazione di OSC3
  → INVERT switch: inverte filter contour applicato a OSC3 amount e l'output di OSC3
- Pitch Bend wheel (range programmabile ±1 ottava max)
- Mod wheel (additiva all'amount programmabile)
```

Glide: lineare, max ~10 sec end-to-end, poly (un circuito per voce) o mono (circuito master).

## Pannello frontale — layout fisico fedele

Riproduci il layout originale (vedi `docs/panel-reference.jpg` se l'utente lo aggiunge; altrimenti basati sulla descrizione qui sotto). Tre macro-sezioni da sinistra a destra:

### LEFT SIDE CONTROL (sezione sinistra)
```
PERFORMANCE row 1: [Auto Tune btn] [Tune knob ±3 semitoni, non programmabile]
PERFORMANCE row 2: [Mono btn] [Multiple Trigger btn] [KB Out btn]
PERFORMANCE row 3: [Glide knob 0–10] [Glide On/Off btn]
PERFORMANCE row 4: [KB Mode btn] [Hold btn] [Arpeggiator btn]
PERFORMANCE row 5: [Pitch Bend Amount knob 0–10] [Modulation Amount knob 0–10]

LEFT-HAND CONTROLLERS: [Octave Down btn] [Octave Up btn]  +  [Pitch Wheel] [Mod Wheel]

SYSTEM CONTROLLER:
  [PROGRAM LED display 2-digit, mostra 0–99]
  [ALPHANUMERIC display ~12 char: "TUNING", "6 TUNED", "EDIT", "LOCK", "RECORDED", "MOOG", "SEQUENCE", etc.]
  [Numeric keypad 1-2-3 / 4-5-6 / 7-8-9 / 0]
  [A B C D prefix buttons]
  [RECORD INTERLOCK btn] [ENTER btn]

FOOTPEDALS:
  AMOUNT 1 knob + dest btns [Pitch] [Volume] [Filter]
  AMOUNT 2 knob + dest btns [Mod Amt] [OSC 2]
```

### MODULATION (sezione centrale)
```
LFO MODULATION:
  [Rate knob .1–100 Hz log scale]
  Waveshape (radio, one only): [Tri] [Saw+] [Saw−] [Square] [S&H]
  Destination (multi-toggle): [OSC1 Freq] [OSC2 Freq] [OSC3 Freq] [PW1] [PW2] [PW3] [Filter]

VOICE MODULATION:
  [OSC 3 amount knob 0–10]
  [Filter Contour amount knob 0–10]
  [Contoured OSC 3 Amount btn]
  [Invert btn]
  Destination (multi-toggle): [OSC1 Freq] [OSC2 Freq] [PW1] [PW2] [Filter]

OSCILLATORS:
  OSC 1: [16'] [8'] [4'] [2'] octave radio  +  [Sync 2→1 btn]  +  [Pulse Width 0–100% knob]  +  Waveshape multi-toggle [Pulse] [Saw] [Tri]
  OSC 2: stesso layout + [Frequency dual-concentric coarse ±semitoni / fine]
  OSC 3: stesso layout + [Frequency knob ±minor sixth] + [LOW btn] + [Keyboard Control btn]

MIXER:
  [OSC1 Level 0–10] [OSC2 Level 0–10] [OSC3 Level 0–10] [Noise Level 0–10]
  (>5 = clipping/distorsione tipica Moog: implementa soft-clip nel mix)
```

### RIGHT SIDE CONTROL (sezione destra)
```
VOLTAGE CONTROLLED FILTER:
  [KB Track btns: 1/3] [2/3]  (entrambi off = 0, solo 1/3 = 33%, solo 2/3 = 66%, entrambi = 100%)
  [Cutoff knob −5 a +5 oct]
  [Emphasis knob 0–10] (autoresonance da ~7)
  [Contour Amount knob 0–10]
  Filter ADSR: [Attack 1ms–10s] [Decay 2ms–20s] [Sustain 0–10] [Release 2ms–20s]

CONTOUR CONTROLS (4 switch globali, agiscono su ENTRAMBI gli envelope):
  [Return to Zero] [Unconditional Contour] [Keyboard Follow] [Release]

VOLTAGE CONTROLLED AMPLIFIER:
  VCA ADSR: [Attack] [Decay] [Sustain] [Release] (stessi range del filter)

OUTPUTS:
  [Master Volume non-programmabile]
  [Programmable Volume per-patch]
  [Headphone Volume]
```

### Back panel (rappresentato semplificato in UI):
- Audio out balanced/unbalanced — simulato come selettore stereo/mono
- Footpedal 1 + 2 (5V), cross-coupled se solo uno presente
- Footswitch in (release, hold, program advance, program backstep, glide)
- Cassette in/out (puoi sostituire con import/export JSON dei preset utente)
- **MIDI In / Thru / Out** (via Web MIDI API): note, velocity, pitch bend, mod wheel, program change, sustain pedal. Channel selezionabile.
- **Clock in / out + Click out** (per il sequencer)

## I 100 program di fabbrica — fedeli al manuale

Crea `src/data/factory-presets.ts` con tutti e 100. Sono raggruppati per categoria a step di 10 (vedi pag. 50 del manuale utente):

```
0  Synth Sweep w/ Glide   |  10 Octave Trill           |  20 Sync Sample & Hold     |  30 Poly Glide             |  40 Sync Sweep 1
1  String 1               |  11 String 2               |  21 String 3               |  31 String 4               |  41 String 5
2  Brass 1                |  12 Brass 2                |  22 Brass 3                |  32 Brass 4                |  42 Brass 5
3  Vocal Chorus           |  13 Tuned Percussion       |  23 Octave Synth           |  33 Sizzle                 |  43 Sync 4
4  Organ 1                |  14 Organ 2 (Pipes)        |  24 Organ 3                |  34 Calliope               |  44 Organ 5
5  Filter Trill           |  15 Bells                  |  25 Take-Off               |  35 Log Drum               |  45 Sirens
6  Synth (Sq. Waves 1)    |  16 Recorder               |  26 Butterflies in Space   |  36 Flutes                 |  46 Sync Sweep 2
7  Electric Piano 1       |  17 Power Synth            |  27 Clav 1                 |  37 Clav Wah               |  47 Celeste
8  Sync 1                 |  18 Sync 2                 |  28 Sync 3                 |  38 Unconditional Contour  |  48 Sync Sweep 3
9  Harp                   |  19 Steel Drums            |  29 Clav 2                 |  39 Vibes                  |  49 Harpsichord 1

50 Wind Chimes            |  60 FM 1                   |  70 Bowed Octaves          |  80 Synth Woodwinds        |  90 Quint Synth
51 String 6               |  61 String 7               |  71 String 8               |  81 String 9               |  91 String 10
52 Brass 6                |  62 Brass 7                |  72 Brass 8                |  82 Brass 9                |  92 Brass 10
53 Double Reed            |  63 Synth Organ            |  73 Release Voice          |  83 Surprise               |  93 Triangle Waves
54 Mono 1                 |  64 Mono 2                 |  74 Mono 3                 |  84 Mono 4                 |  94 Mono 5
55 UFO                    |  65 Sync Sweep 4           |  75 Quint Filter Trill     |  85 Drop Off               |  95 Ring Mod 2
56 Chorus Synth           |  66 Square Waves 2         |  76 Quint Oscillator Trill |  86 Ring Mod               |  96 Dupe No. 75
57 Clav 3                 |  67 Quint Harpsichord      |  77 Accordion              |  87 Harpsichord 2          |  97 Octave Synth 2
58 Echo Whistle           |  68 Wind Chimes 2          |  78 Synth Plectrum         |  88 Synth Plectrum 2       |  98 Synth Plectrum 2
59 Electric Piano 2       |  69 Electric Piano 3       |  79 Sync 5                 |  89 Clav 4                 |  99 Clav 5
```

Programma ogni preset basandoti sull'ARCHETIPO sonoro del nome. Esempi guida:

- **String 1–10**: OSC1 saw 8', OSC2 saw 8' detune +0.3 cents, OSC3 saw 16' detune −0.3, mixer ~6-7 ciascuno, filter cutoff medio-alto, emphasis 2–3, slow attack 200–800ms, slow release, KB-track full, LFO mod su OSC freq leggero.
- **Brass 1–10**: OSC1+OSC2 pulse-width 30–50%, OSC3 saw 16', filter env mod alto (Contour Amount 6–8), attack del filtro medio (50–100ms), VCA snappy.
- **Sync 1–5 + Sync Sweep**: OSC2 sync to OSC1, OSC2 frequency in spazzata, filter env mod molto alto su pitch oppure su filter cutoff.
- **Bass / Mono**: monophonic mode, OSC1+OSC2 saw 16'/8', filter resonance ~4-5, breve release.
- **Vibes / Bells**: triangle waves, no filter env, VCA con attack rapido e release medio.
- **Harp**: saw + tri 8'/4', filter env percussivo, VCA con attack rapido decay medio, no sustain.
- **Clav 1–5**: pulse-width stretto (15–25%), filter env percussivo, KB-track full.
- **Electric Piano 1–3**: tri + saw 8', filter env morbido, VCA AD-style, slight vibrato LFO.
- **Organ 1–5**: tri + saw fissi 16'/8'/4', no envelope mod (sustain 10 ovunque), attack/release rapidi.
- **Effects (Take-Off, UFO, Sirens, Butterflies, Log Drum)**: LFO veloce/lento estremi, sample&hold, pitch sweep su filter env applicato a OSC.
- **Calliope, Recorder, Flutes**: triangle prevalente, filter chiuso, no resonance.
- **Mono 1–5**: mono mode con detune massimo per spessore (più OSC sullo stesso tono leggermente scordati).

**Non inventare valori a caso**: per ogni preset rispetta l'archetipo del nome. È meglio un preset "plausibile" che uno random.

Il file `factory-presets.ts` deve esportare un array `FACTORY_PRESETS: Preset[]` lungo 100, ogni voce con tutti i campi del modello dati (sotto).

## Modello dati Preset (TypeScript)

```ts
export interface Preset {
  number: number;        // 0–99
  name: string;
  category: 'SYNTH' | 'STRINGS' | 'BRASS' | 'KB' | 'EFFECTS' | 'ORGAN/MONO';
  // Performance
  glide: number;         // 0–10
  glideOn: boolean;
  mono: boolean;
  multipleTrigger: boolean;
  kbMode: 1 | 2 | 3 | 'POLY1' | 'POLY2' | 'POLY3' | 'POLY4';
  hold: boolean;
  arpeggiator: 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = off, 1..6 modi manuale
  pitchBendAmount: number;     // 0–10, mappato a max ±1 ottava
  modulationAmount: number;    // 0–10
  programmableVolume: number;  // 0–10
  // Footpedals
  pedal1Amount: number;
  pedal1Dest: { pitch: boolean; volume: boolean; filter: boolean };
  pedal2Amount: number;
  pedal2Dest: { modAmt: boolean; osc2: boolean };
  // LFO
  lfoRate: number;             // 0.1–100 Hz, salvato come 0–10 col mapping log del manuale
  lfoWave: 'TRI' | 'SAW+' | 'SAW-' | 'SQR' | 'S&H';
  lfoDest: { osc1: boolean; osc2: boolean; osc3: boolean; pw1: boolean; pw2: boolean; pw3: boolean; filter: boolean };
  // Voice Mod
  osc3ModAmount: number;
  filterContourModAmount: number;
  contouredOsc3: boolean;
  invert: boolean;
  voiceModDest: { osc1: boolean; osc2: boolean; pw1: boolean; pw2: boolean; filter: boolean };
  // Oscillators
  osc1: { octave: 16 | 8 | 4 | 2; sync2to1: boolean; pulseWidth: number; waves: { pulse: boolean; saw: boolean; tri: boolean } };
  osc2: { octave: 16 | 8 | 4 | 2; coarse: number /* ±semitones */; fine: number /* ±cents */; pulseWidth: number; waves: { pulse: boolean; saw: boolean; tri: boolean } };
  osc3: { octave: 16 | 8 | 4 | 2; frequency: number /* ±minor sixth or wider */; pulseWidth: number; waves: { pulse: boolean; saw: boolean; tri: boolean }; low: boolean; keyboardControl: boolean };
  // Mixer
  mixer: { osc1: number; osc2: number; osc3: number; noise: number };  // 0–10 each
  // Filter
  filter: { kbTrack: 0 | 1/3 | 2/3 | 1; cutoff: number; emphasis: number; contourAmount: number; attack: number; decay: number; sustain: number; release: number };
  // VCA
  vca: { attack: number; decay: number; sustain: number; release: number };
  // Contour global
  contour: { returnToZero: boolean; unconditional: boolean; keyboardFollow: boolean; release: boolean };
}
```

Per valori di tempo: salva sempre 0–10 nel preset (come la posizione del knob fisico) e converti runtime con le scale del manuale:
- Attack: 1ms → 10s, log
- Decay/Release: 2ms → 20s, log
- LFO Rate: .1Hz → 100Hz, log
- Filter Cutoff: −5 a +5 ottave da una baseline (calibra a piacere ~440Hz @ 0)

## Sequencer

Implementa il sequencer del Memorymoog Plus (Bulletin 841A):
- 10 sequence slot, ogni sequence è una catena di program numbers (program sequence) + opzionalmente note registrate.
- Modalità: STEP (un footswitch o pulsante avanza una nota), CONTINUOUS (clock interno), SYNC EXT (clock in).
- Rate clock interno calibrato: ~3072 Hz nominale come scrive il bulletin (= clock di scansione). Per il tempo musicale tipico esponi un BPM 30–300.
- Controls: START/STOP, CLOCK IN, CLOCK DISABLE, CLOCK OUT, CLICK OUT (impulso 1ms ogni step).
- Real-time recording: l'utente suona, il sequencer registra note + timing. Step recording: l'utente preme un tasto alla volta.
- Display dedicato che mostra "SEQUENCE", "B IF SEQ" durante il loading, "*MOOG*" come logo idle.

## MIDI (Web MIDI API)

- **In**: note on/off + velocity (mappare velocity → VCA env amount opzionale, il vero MM non aveva velocity), pitch bend, mod wheel CC1, sustain CC64, program change 0–99, all-notes-off.
- **Out**: stessi messaggi quando si suona dalla tastiera virtuale o si esegue una sequence.
- **Thru**: passthrough.
- Channel selector 1–16.
- Permission request al primo click del MIDI panel, fallback "MIDI non supportato" se browser non lo offre (Safari ≤16).

## Tastiera virtuale + interazione

- Tastiera 61 tasti (C2–C7) renderizzata in basso, click + drag, computer-keyboard mapping standard (z-m = ottava bassa, q-i = ottava alta, etc.).
- Touch-friendly su mobile (no `300ms delay`).
- Octave switch (±1) come sul Memorymoog reale, applicato globalmente.
- Visual feedback: tasto premuto cambia colore + LED voce attiva (6 LED che si accendono in ordine cyclic).
- Polifonia voce-stealing: quando arrivano > 6 note insieme, ruba la voce più vecchia.

## Knob, switch, display — comportamento UI

- Knob: mouse drag verticale + Shift = fine, doppio click = reset al valore di default del preset corrente.
- Numeric input on Alt+click che mostra valore preciso e permette typing.
- Switch: click toggle, multi-toggle dove indicato (destination switches LFO/Voice Mod sono multi-toggle, octave OSC è radio).
- Display Alphanumeric: simula display 7-seg/LCD vintage con font monospaced retro (es. "VT323", "Major Mono Display", "DSEG14") e leggero glow CRT.
- LED PROGRAM display: 2 cifre a 7 segmenti, rosso/arancio.
- Auto-Tune: quando premuto mostra "TUNING" per ~2-3 sec poi "6 TUNED".
- Tutte le animazioni knob fluide (CSS `transform: rotate`).
- **EDIT indicator**: appena tocchi un controllo dopo aver caricato un preset, l'alphanumeric mostra "EDIT" + il vecchio valore a sinistra e il nuovo a destra (vedi manuale 3.2).

## Estetica

Non fare il solito clone Photoshop. Riferimento visivo: pannello reale del Memorymoog — frontalino nero opaco, scritte serigrafate bianche, knob neri con linea bianca indicatrice, pulsanti quadrati con LED rosso sopra ciascuno quando attivo, ringhiera in legno scuro intorno (puoi stilizzare o omettere).

Possibili direzioni (scegli UNA, motiva):
1. **Iperrealistico** — texture pannello, ombre soft, knob 3D in SVG, riflessi sottili.
2. **Editorial / blueprint** — bianco e nero, linee tecniche, screen-printed look, omaggio ai manuali Moog originali.
3. **Brutalista didattico** — tipografia massiccia, etichette grandi, focus sull'educare alla synthesi sottrattiva.

Vai per la 1 se hai tempo, la 2 se preferisci eleganza e velocità. Niente "purple gradient on white". Niente Inter/Roboto.

## Documentazione e UX

- README con: screenshot, lista preset, scorciatoie tastiera, guida MIDI, crediti al manuale Moog 1982 e a Wendy Carlos / Jan Hammer / Don Airey / Tom Coster / Larry Fast / Herbert Deutsch citati nel manuale come programmatori dei preset.
- In-app: pannello "?" che mostra le scorciatoie e una mini-guida alla sintesi sottrattiva.
- LICENSE: MIT.
- Niente loghi Moog registrati, niente "Memorymoog" come brand commerciale: usa "SIXinONE — A Tribute to the Moog Memorymoog (1982)" con disclaimer "Unofficial educational simulator. Moog, Memorymoog, and Moog logos are trademarks of Moog Music Inc."

## Test

- Test unitari su: voice allocator (cyclic / reset modes), envelope curves, MIDI message parsing, preset serialization.
- Test manuale per audio (non automatizzabile bene): documenta in CONTRIBUTING.md una checklist (suona ogni 100 preset, verifica autotune, verifica sequencer playback).

## Ordine di lavoro suggerito

1. **Setup repo**: Vite + TS strict, struttura cartelle (`src/audio/`, `src/ui/`, `src/midi/`, `src/sequencer/`, `src/data/`, `src/state/`), CI minima (lint + build).
2. **Modello dati Preset** + 5 preset hardcoded per testing (String 1, Brass 1, Sync 1, Bass-like Mono 1, Bells).
3. **Audio engine**: voice graph con Web Audio nativo (oscillator → biquad lowpass) per primo prototipo. Far suonare 1 voce, poi 6 voci.
4. **AudioWorklet filter Moog**: sostituisci il biquad con il filtro 24dB/oct ladder, una volta che la pipeline funziona. Algoritmo: ladder filter di Stilson-Smith o Huovilainen (cerca le formule, non inventare).
5. **UI pannello**: HTML+CSS+SVG knob, layout fedele. Stato globale (proposto: signal store custom o nanostores, niente Redux).
6. **Tastiera virtuale + computer keyboard input**. Suona qualcosa di vero ora.
7. **LFO + modulation routing** (entrambe le sezioni).
8. **Envelope generators** + contour controls globali (Return to Zero, Unconditional, KB Follow, Release).
9. **Auto-tune dummy** (animazione + display, no detuning reale ma puoi simulare leggero drift random e poi "ricalibrare").
10. **System Controller**: keypad, ENTER, A/B/C/D prefix, RECORD/INTERLOCK. Persistenza preset utente in IndexedDB.
11. **Tutti i 100 preset di fabbrica** programmati a mano seguendo gli archetipi sopra.
12. **MIDI** in/out/thru.
13. **Sequencer** completo.
14. **PWA**: manifest, service worker, installabilità, asset cache.
15. **Polish estetico**, animazioni Auto-Tune, display CRT effect, micro-interazioni knob.
16. **README + GitHub Pages deploy** (`gh-pages` branch o action).

Fai commit dopo ogni step. Push frequente. Se un punto ti blocca > 30 min, lascia un TODO chiaro nel codice e vai avanti.

## Vincoli e divieti

- Niente Tone.js, Tonejs-Instruments, soundfont, sample.
- Niente librerie UI pesanti (no Tailwind UI, no Material). Tailwind core OK se vuoi.
- Niente analytics, niente tracking, niente cookie.
- Niente CDN-only: il progetto deve buildare e girare offline senza rete (eccetto MIDI hardware).
- Niente claim "fedele al 100%": è una *replica funzionale e affettuosa*, non un'emulazione bit-perfect.

## Quando hai finito

Apri una pull request da `develop` a `main` con:
- Demo URL (GitHub Pages)
- Screenshot animato del pannello
- Lista delle scorciatoie tastiera
- Note su cosa non hai potuto fare (sii onesto)
- Suggerimenti per v2 (es. effetti aggiuntivi, MPE, modwheel-to-aftertouch)

Buon lavoro. Costruisci qualcosa di cui Alessandro possa essere orgoglioso.
