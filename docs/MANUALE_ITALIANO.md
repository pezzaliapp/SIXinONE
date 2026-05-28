# SIXinONE — Manuale d'uso in italiano

> Un tributo non ufficiale al **Moog Memorymoog Plus (1982)**, riscritto come simulatore web. Sei voci polifoniche, diciotto oscillatori, il filtro Moog a 24 dB per ottava, il sequencer a 10 slot e la cassette I/O — tutto nel browser, niente sample, niente librerie audio esterne.

---

## Sommario

- [Introduzione](#introduzione)
- [Guida rapida — cinque minuti per iniziare a suonare](#guida-rapida--cinque-minuti-per-iniziare-a-suonare)
- [Sezione I — Il pannello](#sezione-i--il-pannello)
- [Sezione II — La tastiera e i controlli di esecuzione](#sezione-ii--la-tastiera-e-i-controlli-di-esecuzione)
- [Sezione III — Il System Controller e i preset](#sezione-iii--il-system-controller-e-i-preset)
- [Sezione IV — Il MIDI](#sezione-iv--il-midi)
- [Sezione V — Transport, arpeggiatore e sequencer](#sezione-v--transport-arpeggiatore-e-sequencer)
- [Sezione VI — FX Rack](#sezione-vi--fx-rack)
- [Sezione VII — Cassette I/O (backup preset)](#sezione-vii--cassette-io-backup-preset)
- [Sezione VIII — Le otto demo](#sezione-viii--le-otto-demo)
- [Sezione IX — Scorciatoie da tastiera](#sezione-ix--scorciatoie-da-tastiera)
- [Sezione X — Installazione come app (PWA)](#sezione-x--installazione-come-app-pwa)
- [Sezione XI — Ricette sonore](#sezione-xi--ricette-sonore)
- [Sezione XII — Risoluzione problemi](#sezione-xii--risoluzione-problemi)
- [Sezione XIII — Glossario tecnico](#sezione-xiii--glossario-tecnico)
- [Appendice A — Tabella completa dei 100 preset](#appendice-a--tabella-completa-dei-100-preset)
- [Appendice B — Credits e riferimenti](#appendice-b--credits-e-riferimenti)
- [Appendice C — Versioni e changelog](#appendice-c--versioni-e-changelog)

---

## Introduzione

### Cosa è SIXinONE

SIXinONE è un sintetizzatore web ispirato al **Moog Memorymoog Plus** del 1982. È un'applicazione che gira nel tuo browser, senza nulla da installare nel caso più semplice, costruita in TypeScript vanilla con la Web Audio API. Non usa né campioni né librerie audio esterne: ogni nota che senti è generata in tempo reale da oscillatori, filtri e inviluppi che ricostruiscono — con licenza poetica — il flusso di segnale del Memorymoog originale.

Il nome è una promessa: **sei voci polifoniche** (poly 6), ognuna costruita su **tre oscillatori, un mixer, un filtro Moog ladder, un VCA e un LFO globale che alimenta tutto**.

### Il Memorymoog originale (cenni storici)

Nel 1982 Moog Music lanciò il **Memorymoog**, il primo sintetizzatore polifonico programmabile dell'azienda. Sei voci, tre VCO per voce — diciotto oscillatori analogici — un filtro ladder identico a quello del Minimoog ma sei volte. Costava 4795 dollari dell'epoca, era pesante 22 kg, scaldava come una stufa e aveva una tendenza cronica a sintonizzarsi male. L'azienda lo migliorò nel 1984 con la versione **Plus**, aggiungendo interfaccia MIDI, sequencer 100-passi e arpeggiatore. La fabbrica chiuse poco dopo: il Memorymoog Plus uscì alla fine del ciclo vitale di Moog, e fu prodotto in poche centinaia di esemplari.

Wendy Carlos, Jan Hammer, Don Airey, Tom Coster, Larry Fast e Herbert Deutsch lasciarono i loro nomi sui programmi originali — i preset del Memorymoog erano state scritti da loro stessi. È un manuale di sintesi vintage ad alto livello, ed è la ragione per cui SIXinONE prova a rispettarli archetipo per archetipo.

### Cosa puoi farci

- **Suonare** dal vivo con il mouse, con la tastiera del computer o con un controller MIDI hardware.
- **Modificare** uno dei 100 preset di fabbrica girando i knob, premendo gli switch, ascoltando il risultato in tempo reale.
- **Salvare** le tue versioni nel banco utente — restano nel browser tra una sessione e l'altra.
- **Importare ed esportare** banchi di preset, in formato JSON `.mm-bank` (veloce) o in formato **audio FSK** che suona come un modem del 1995 (più lento, più poetico).
- **Sincronizzare** il sequencer interno con un DAW esterno via MIDI Clock.
- **Sfruttare l'MPE** (MIDI Polyphonic Expression) per controllare ogni nota in modo espressivo se hai un Seaboard, un LinnStrument o un Continuum.
- **Ascoltare le otto demo musicali** integrate, che pilotano il motore reale del simulatore mostrandoti come si muovono i knob durante una performance — è il modo più rapido per imparare la sintesi sottrattiva.
- **Installarlo come app** (PWA) e usarlo anche offline.

### Cosa NON puoi farci (limiti onesti)

- **Non è un emulatore fedele** del Memorymoog Plus. Non ha il character analogico imperfetto, non ricalibra i VCO ogni quindici minuti, non c'è il rumore di fondo della scheda audio del 1982. È una *ricostruzione concettuale* — fa cose che il Memorymoog faceva, con il flusso di segnale che il Memorymoog usava, ma il timbre non è identico al cento per cento.
- **Non registra audio**. SIXinONE non ha un registratore interno. Se vuoi catturare quello che suoni, usa un'utility OS (QuickTime su macOS, OBS su Windows/Linux) o un'altra applicazione che cattura l'output del sistema.
- **Non importa preset da altri sintetizzatori**. I formati sono i nostri `.mm-bank` e `.wav` FSK. Non Sysex Memorymoog reale, non patches V/Synth, niente.
- **Non sostituisce una scheda audio professionale**. Il browser ha una latenza che dipende dal sistema operativo, dall'hardware e da Chrome/Firefox/Safari. Sui Mac moderni è gradevole, su Windows con driver generici può essere fastidiosa.
- **Non funziona su Safari ≤ 16** per la parte MIDI (il Web MIDI è arrivato in Safari 17). Funziona comunque per audio + tastiera, ma il pannello MIDI ti dirà "browser unsupported".

### Crediti

SIXinONE è sviluppato da [Alessandro Pezzali](https://pezzaliapp.it) in collaborazione con Claude (Anthropic) come parte della serie SIXinONE. Le scelte di archetipi sonori e la programmazione dei 100 preset sono ispirate al manuale del Memorymoog Plus del 1982.

### Disclaimer legale

Moog, Memorymoog e il logo Moog sono marchi registrati di **Moog Music Inc.** SIXinONE è un simulatore educativo non ufficiale, non commerciale, non affiliato, non sponsorizzato e non approvato da Moog Music Inc. Il codice è rilasciato sotto licenza MIT. Le demo "in stile" sono composizioni originali; le demo classiche usano spartiti di pubblico dominio (Bach †1750, Mozart †1791).

---

## Guida rapida — cinque minuti per iniziare a suonare

### 1. Apri il sito

Vai su [pezzaliapp.github.io/SIXinONE](https://pezzaliapp.github.io/SIXinONE/). Si apre direttamente nel browser, niente account, niente registrazione.

### 2. Sblocca l'audio

I browser moderni richiedono un gesto dell'utente per far partire l'audio. Clicca su un tasto della tastiera virtuale (o premi un tasto del computer dalla riga `z s x d c v g b h n j m`) e il motore audio si attiva. Se non senti niente, controlla che il volume del sistema sia su.

### 3. Carica un preset

In alto sopra il pannello c'è una **barra di tile** con alcuni preset di test. Cliccane uno (per esempio "01 String 1") — il pannello ricarica i suoi knob alle posizioni del preset e parte automaticamente un piccolo accordo di anteprima per farti sentire il suono.

In alternativa: usa il **keypad numerico** dentro la sezione SYSTEM CONTROLLER del pannello. Digita due cifre (per esempio `2` `7`) e premi **ENTER**. Carica il preset numero 27 (Clav 1).

### 4. Suona con la tastiera

Sulla tastiera virtuale puoi:
- Cliccare con il mouse i singoli tasti.
- Usare la tastiera del computer: **riga inferiore** `z s x d c v g b h n j m` per l'ottava grave, **riga superiore** `q 2 w 3 e r 5 t 6 y 7 u` per l'ottava alta.
- Cambiare ottava con `[` (giù) e `]` (su), oppure con i pulsanti `Oct−` / `Oct+` accanto alla tastiera.

I sei LED rossi sopra la tastiera mostrano le voci attive: a sei note premute insieme li vedi tutti accesi.

### 5. Modifica un suono

Trascina un knob in verticale per cambiare il valore. Tieni premuto **Shift** mentre trascini per una regolazione fine. **Double-click** su un knob per resettarlo al valore di default. La rotellina del mouse funziona come fine-tune.

Cambia per esempio il knob **CUTOFF** (sezione VCF a destra) e ascolta come cambia il timbro mentre tieni un accordo. È il knob più importante di tutto il pannello.

Quando modifichi un parametro, il display in alto a sinistra mostra brevemente `EDIT` per ricordarti che il preset è stato alterato. Per salvarlo come tuo: vedi la [Sezione III](#sezione-iii--il-system-controller-e-i-preset).

---

## Sezione I — Il pannello

### 1. Anatomia del pannello (le tre macro-sezioni)

Il pannello di SIXinONE è diviso in **tre colonne**, come il Memorymoog originale:

| Colonna | Contenuto                                                    |
| ------- | ------------------------------------------------------------ |
| Sinistra | LEFT SIDE CONTROL — performance, modulazioni globali, system controller |
| Centro  | MODULATION — LFO, voice mod, i tre oscillatori, il mixer    |
| Destra  | RIGHT SIDE CONTROL — filtro, contour switches, VCA, output  |

L'estetica è "iperrealistica matte": pannello nero opaco, knob neri con indicatore bianco, LED rossi che si accendono per gli stati attivi. È il modo più diretto per riconoscere a colpo d'occhio quali switch sono attivi.

### 2. LEFT SIDE CONTROL

#### 2.1 Performance: AUTO TUNE, TUNE

##### AUTO TUNE

**Cosa fa**: simula la procedura di ricalibrazione dei sei VCO. Sul Memorymoog reale era necessaria periodicamente perché i VCO analogici derivavano in temperatura.

**Range**: pulsante momentaneo.

**Programmabile**: no.

**Quando usarlo**: ogni volta che ti va. Nello strumento reale era obbligatorio dopo che lo strumento si era riscaldato (~15 minuti dall'accensione).

**Suggerimento**: in SIXinONE è puramente estetico — i nostri oscillatori non derivano. Il pulsante mostra "TUNING" sul display per ~2 secondi, poi "6 TUNED" — è un piccolo omaggio scenico, non una procedura tecnica.

#### 2.2 Modalità di tastiera: MONO, MULTIPLE TRIG, KB OUT

##### MONO

**Cosa fa**: passa dalla modalità polifonica (6 voci) alla modalità monofonica (una nota sola alla volta, l'ultima premuta).

**Range**: on / off.

**Programmabile**: sì.

**Quando usarlo**: per bassi, lead solisti, sequenze in stile TB-303. Nei preset Mono 1-5 (slot 54/64/74/84/94) trovi già configurazioni mono pronte.

**Suggerimento**: in MONO la nota nuova "ruba" la precedente — è il modo classico per fare slide tra note con GLIDE attivo. Su un pad polifonico non c'è glide perché ogni nota nasce nuova.

##### MULTIPLE TRIG

**Cosa fa**: in modalità mono, determina se ogni nuova nota fa ripartire gli inviluppi da capo o se mantiene la fase dell'inviluppo precedente.

**Range**: on (retrigger ogni nota) / off (legato).

**Programmabile**: sì.

**Quando usarlo**: legato per linee melodiche fluide; retrigger per ribattuti percussivi.

#### 2.3 Glide e Hold

##### GLIDE

**Cosa fa**: il portamento — il tempo che il pitch impiega per scivolare dalla nota vecchia alla nota nuova.

**Range**: 0–10 sul knob. Mappato a 10 ms (knob a 1) fino a ~10 secondi (knob a 10), scala logaritmica.

**Programmabile**: sì.

**Quando usarlo**: bassi funk anni '70-'80, lead alla "Apache" dei Shadows, qualunque cosa che voglia un glissando tra le note. Pieno effetto solo se anche GLIDE ON è attivo.

##### GLIDE ON

**Cosa fa**: attiva il glide. Il knob GLIDE può essere impostato a piacere, ma il glide effettivo c'è solo quando questo switch è ON.

**Range**: on / off.

**Programmabile**: sì.

#### 2.4 KB MODE, HOLD, ARPEGGIATOR

##### KB MODE

**Cosa fa**: sceglie la modalità di allocazione delle voci in polifonia. Quattro opzioni:

- **POLY1** — cyclic. La voce successiva è (ultima + 1) mod 6.
- **POLY2** — cyclic with memory. Se ripremi una nota appena rilasciata, riusa la stessa voce (utile per preservare le code di riverbero/release sullo stesso path).
- **POLY3** — reset-to-A. Riparte sempre dalla voce 0 — utile per accordi rapidi che vuoi sentire "in ordine".
- **POLY4** — reset-to-A with memory.

**Programmabile**: sì.

**Suggerimento**: nei pad e negli accordi POLY2 dà un piccolo guadagno musicale (le note ripetute mantengono il proprio inviluppo). Nelle linee monofoniche è irrilevante.

##### HOLD

**Cosa fa**: tiene "premute" tutte le note correnti finché non lo rilasci. Anche se rilasci i tasti, le note continuano a suonare (limitate dal tempo di Sustain dell'inviluppo del VCA).

**Range**: on / off.

**Programmabile**: sì.

**Quando usarlo**: drone, accordi sostenuti per esplorare il filtro con le mani libere, jam con arpeggiatore (vedi sotto).

##### ARPEGGIATOR

**Cosa fa**: attiva l'arpeggiatore — quando suoni un accordo, l'arpeggiatore lo "rompe" in una sequenza melodica che ripete a tempo. Sette posizioni:

| Pos. | Etichetta | Pattern                                            |
| ---- | --------- | -------------------------------------------------- |
| 0    | OFF       | arpeggiatore spento                                |
| 1    | UP        | ascendente (A C E A C E...)                        |
| 2    | DN        | discendente (E C A E C A...)                       |
| 3    | U-D       | su-giù senza ripetere gli estremi (A C E C A C...) |
| 4    | UDI       | su-giù con estremi ripetuti (A C E E C A...)       |
| 5    | RND       | random — sceglie a caso fra le note tenute         |
| 6    | PLY       | as-played — ordine in cui hai premuto i tasti      |

**Programmabile**: sì (l'arpeggiatore patterno è dentro al preset).

Per i dettagli su range (1-4 ottave), step (1/4-1/32) e clock source vedi la [Sezione V.2](#2-arpeggiatore).

#### 2.5 WHEELS & BEND: PITCH BEND AMT, MOD AMOUNT

##### PITCH BEND AMT

**Cosa fa**: scala il range del pitch bend quando arriva da MIDI o dalla mod wheel del controller.

**Range**: 0–10 sul knob, mappato a ±0 fino a ±12 semitoni (un'ottava intera in entrambi i versi al massimo).

**Programmabile**: sì.

**Suggerimento**: per pad e cori 2 semitoni è il limite musicale. Per lead alla Eddie Van Halen o per dive-bomb 12 (un'ottava). Per stile rock blando, 5 semitoni (una quarta) è il classico.

##### MOD AMOUNT

**Cosa fa**: l'ampiezza globale della modulazione dell'LFO. È quanto profondamente l'LFO modula le destinazioni selezionate.

**Range**: 0–10 sul knob.

**Programmabile**: sì.

**Suggerimento**: la mod wheel MIDI (CC1) si somma a questo valore. Quindi un preset con MOD AMOUNT a 0 può comunque avere vibrato se l'utente alza la mod wheel — soluzione elegante che mantiene "puliti" i preset di base.

#### 2.6 SYSTEM CONTROLLER (display + keypad numerico)

Il SYSTEM CONTROLLER occupa la parte bassa della colonna sinistra. Ha:

- Un **display di programma** che mostra il numero del preset corrente (00-99).
- Un **display alphanumerico** con effetto CRT (le tipiche scanline verdi) che mostra il nome del preset, gli stati di edit, i messaggi della cassette (`SYNC...`, `LOADING`, `OK`, `BAD TAPE`...).
- Un **keypad numerico** 0-9 con i tasti **ENTER**, **RECORD INTERLOCK**, **A/B/C/D**.

Vedi [Sezione III](#sezione-iii--il-system-controller-e-i-preset) per il workflow di caricamento e salvataggio.

### 3. MODULATION (sezione centrale)

#### 3.1 LFO MODULATION

##### Cos'è un LFO

Un **LFO** (Low Frequency Oscillator) è un oscillatore che gira molto lentamente — talmente lento che non lo senti come una nota, ma come un movimento ciclico. Pensa alla mano del violinista che fa vibrato: avanti-indietro, avanti-indietro, ~5 volte al secondo. L'LFO è esattamente quella mano, ma applicata elettronicamente all'altezza della nota, al filtro o ad altri parametri. In SIXinONE il knob RATE controlla la velocità (da 0.1 Hz, un movimento ogni 10 secondi, fino a 100 Hz, già nella zona udibile). Il pad d'archi che "respira" lentamente in tanta musica ambient, è LFO che modula il filtro a ~0.3 Hz.

##### Il knob RATE

**Cosa fa**: la frequenza dell'LFO globale.

**Range**: 0–10 sul knob, mappato logaritmicamente da 0.1 Hz a 100 Hz.

**Programmabile**: sì.

##### Le forme d'onda

L'LFO può generare cinque forme d'onda diverse:

| Forma | Etichetta | Quando usarla                                       |
| ----- | --------- | --------------------------------------------------- |
| Triangolo | TRI    | vibrato musicale dolce, pad che respira             |
| Sega salita | SAW+ | scivolata regolare, "auto-pitch up" per glissando   |
| Sega discesa | SAW− | scivolata regolare in giù, sirene                  |
| Quadra | SQR     | trillo a due note, effetti UFO, modulazione binaria |
| S&H    | S&H     | Sample & Hold — valori casuali, computer voice anni '70 |

**Suggerimento**: la S&H è il segreto dei "computer suoni" di tanto sci-fi anni '70. Per UFO/Sirens dei preset 55, 45.

##### Le destinazioni

Sette switch indicano dove l'LFO viene instradato:

- **OSC1, OSC2, OSC3** — modula la frequenza (pitch) dell'oscillatore relativo → vibrato.
- **PW1, PW2, PW3** — modula la pulse width (larghezza dell'impulso) dell'oscillatore relativo → "ondulazione" timbrica tipica dei pad d'archi anni '80.
- **FILTER** — modula la frequenza di taglio del filtro → effetto "auto-wah".

Più destinazioni sono attive simultaneamente, e l'LFO le modula tutte con lo stesso movimento.

#### 3.2 VOICE MODULATION

##### Differenza tra LFO mod e Voice mod

L'**LFO** è un movimento *ciclico* (sinusoidale o simile). La **Voice Modulation** non è ciclica: usa l'inviluppo del filtro (o l'OSC3 quando è in modalità LOW) come *sorgente* di modulazione una tantum — è un movimento che parte alla pressione del tasto, segue l'ADSR e svanisce.

##### I controlli OSC3 AMT, FILTER CONT AMT

- **OSC3 AMT**: l'ampiezza con cui l'OSC3 (quando è in modalità LOW = sub-audio) modula le destinazioni di voice mod.
- **FILTER CONT AMT**: l'ampiezza con cui l'inviluppo del filtro modula le destinazioni di voice mod.

##### CONTOURED OSC3 e INVERT

- **CONTOURED OSC3**: l'output dell'OSC3 viene scalato dall'inviluppo del filtro prima di alimentare la voice mod. Permette modulazioni che iniziano forti e svaniscono nel tempo.
- **INVERT**: inverte la polarità della modulazione. Se "normale" alza il pitch, "invert" lo abbassa.

#### 3.3 OSCILLATORS

I tre oscillatori sono il punto da cui parte tutto il suono. Tutti e tre possono generare contemporaneamente quattro forme d'onda — **pulse, saw, triangle** — sommate insieme.

##### OSC 1

- **OCTAVE**: 16′, 8′, 4′, 2′. Sono le indicazioni storiche delle canne d'organo: 8′ è "concert pitch" (la tua nota suona come la nota che premi), 16′ è un'ottava sotto, 4′ è un'ottava sopra, 2′ due ottave sopra.
- **PULSE WIDTH**: la larghezza dell'impulso dell'onda quadra. Da onda quasi-spike (knob a 0) a onda quadra perfetta (knob a 10). Da impulso stretto a quadra, il timbre passa da "nasale/sottile" a "cavo/pieno".
- **SYNC 2→1**: hard sync con OSC2 come master. Vedi sotto.
- **Waveshape**: tre switch — Pulse / Saw / Tri — attivi simultaneamente. Se accendi tutti e tre, OSC1 somma tutte e tre le forme.

##### OSC 2

- **COARSE**: detune in semitoni rispetto a OSC1. Range −7 a +7 (un'ottava abbondante in entrambi i versi).
- **FINE**: detune in centesimi. Range −100 a +100 cents. Per detune impalpabile tipo "chorus naturale" usa valori 5-20 cents.
- **OCTAVE, Waveshape**: come OSC1.

##### OSC 3

OSC3 ha un ruolo speciale: può funzionare come oscillatore audio o come modulatore (sub-audio, LFO bonus).

- **OCTAVE, Waveshape**: come gli altri.
- **FREQ**: detune libero. Range −9 a +9.
- **LOW**: quando attivo, OSC3 scende sotto la frequenza udibile e diventa un secondo LFO. Combinato con CONTOURED OSC3 in voice mod, è il modo classico per fare modulazioni complesse.
- **KB CTRL**: quando attivo, OSC3 segue la nota suonata. Quando disattivo, OSC3 ha frequenza fissa indipendente dalla nota — usato per effetti FM e ring mod.

##### Cosa significa "hard sync" (la spiegazione del sync scream)

L'**hard sync** è l'effetto sonoro più riconoscibile del Memorymoog. Quando attivi **SYNC 2→1**, OSC2 viene forzato a riazzerare la sua fase ogni volta che OSC1 completa un ciclo. Risultato: OSC2 non oscilla più liberamente, ma viene "tagliato" ritmicamente da OSC1. Se ora ruoti il knob COARSE di OSC2, senti questa cosa magica: il pitch fondamentale resta fisso (è quello di OSC1), ma il *timbro* cambia drasticamente. Compaiono armoniche acute, "formanti" che si muovono dentro al suono — il famoso "sync scream".

È il suono di tanti lead anni '80 ("Brain Damage" dei Pink Floyd, "Owner of a Lonely Heart" — descritti per riferimento, non riprodotti). In SIXinONE l'hard sync è implementato con un AudioWorklet custom, sample-accurato, con anti-aliasing PolyBLEP — non è il sync degradato che senti in molti plugin VST.

I preset 8 (Sync 1), 18 (Sync 2), 28 (Sync 3), 40 (Sync Sweep 1), 43 (Sync 4), 46 (Sync Sweep 2), 48 (Sync Sweep 3), 65 (Sync Sweep 4), 79 (Sync 5) sono tutti basati su questa tecnica.

#### 3.4 MIXER

##### OSC1, OSC2, OSC3, NOISE

Quattro knob, ognuno controlla il volume di una sorgente prima del filtro.

**Range**: 0–10 sul knob. Mappato linearmente fino a "gain 1" intorno al valore 5, oltre il quale entri in zona di guadagno > 1.

**Programmabile**: sì.

##### Il segreto della distorsione da clipping (>5)

Sopra il valore 5, il mixer va in saturazione morbida quando le quattro sorgenti si sommano. Non è un effetto programmato esplicitamente — è il naturale clip del sommatore digitale che imita il comportamento del vero VCA Moog quando saturo. Usalo per dare grinta ai bassi: NOISE a 7 + OSC1 a 8 con filtro chiuso restituisce un attack ringhioso.

**Suggerimento**: la presenza del rumore (NOISE) è il dettaglio che separa i pad piatti dai pad "respirati". Anche solo 0.5-1 di NOISE su un pad d'archi aggiunge l'aria che lo rende organico.

### 4. RIGHT SIDE CONTROL

#### 4.1 VOLTAGE CONTROLLED FILTER

Il **Voltage Controlled Filter** è il cuore del suono Moog. È un filtro passa-basso a quattro stadi, 24 decibel per ottava, brevettato da Robert Moog negli anni '60 e mai uguagliato. SIXinONE lo implementa come AudioWorklet seguendo il modello matematico di Antti Huovilainen del 2004 — con la non-linearità tanh sui quattro stadi che dà al filtro Moog il suo carattere caldo, mai sterile. A livello pratico significa una cosa sola: questo filtro tolto da sopra suona meglio di tutti gli altri filtri passa-basso digitali. Imparalo, ed è il 70% del tuo lavoro di sound design.

##### KB TRACK

**Cosa fa**: quanto la frequenza di taglio del filtro segue la tastiera. Quattro impostazioni codificate da due switch (KB 1/3 + KB 2/3):

| 1/3 | 2/3 | Coefficiente | Effetto                                          |
| --- | --- | ------------ | ------------------------------------------------ |
| OFF | OFF | 0            | il filtro non segue la tastiera — note acute risulteranno scure |
| ON  | OFF | 0.333        | seguito parziale                                 |
| OFF | ON  | 0.667        | seguito quasi pieno                              |
| ON  | ON  | 1.0          | seguito completo (filtro alza di una nota per nota) |

**Suggerimento**: per pad sostenuti tieni KB Track basso così le note alte non bucano. Per lead percussivi tienilo a 2/3 o pieno.

##### CUTOFF

**Cosa fa**: la frequenza di taglio del filtro. Sopra il cutoff, le frequenze vengono attenuate di 24 dB per ottava.

**Range**: 0–10 sul knob, mappato logaritmicamente intorno a 440 Hz con ±5 ottave.

**Programmabile**: sì.

Il knob CUTOFF è il knob che muoverai più spesso in assoluto. È la mano che apre e chiude il timbro: aperto = brillante, chiuso = scuro. Su un pad sostenuto, abbassare CUTOFF mentre la nota suona è il movimento più espressivo della sintesi sottrattiva, ed è precisamente quello che la Filter Workout demo ti fa vedere passo per passo.

##### EMPHASIS (e la self-oscillation)

**Cosa fa**: la resonance del filtro — quanto il filtro enfatizza le frequenze intorno al cutoff.

**Range**: 0–10 sul knob.

**Programmabile**: sì.

Sopra il valore 7, il filtro entra in **self-oscillation**: si comporta come un quinto oscillatore a frequenza CUTOFF, indipendente dalle voci. È un suono peculiare, "fischiante", e nel Memorymoog originale è il modo di ottenere un seno puro (le quattro waveshape native non includono il seno). Sopra il valore 9 si autoecciterà generando una nota anche senza che tu suoni.

**Suggerimento**: per acid bass alla TB-303, EMPHASIS 6-7 + CUTOFF basso + filter envelope decay corto = l'effetto "blub". Provalo sul preset 54 (Mono 1).

##### CONTOUR AMT e l'ADSR del filtro

**CONTOUR AMT** controlla *quanto* l'inviluppo del filtro modula il cutoff. Da 0 (l'inviluppo non fa nulla) a 10 (l'inviluppo apre il filtro di 8 ottave al picco).

L'inviluppo del filtro è un classico ADSR programmabile con i quattro knob successivi:

- **ATTACK**: tempo per arrivare al picco (da 1 ms a 10 s).
- **DECAY**: tempo per scendere al sustain (da 2 ms a 20 s).
- **SUSTAIN**: livello tenuto finché premi il tasto (0–10).
- **RELEASE**: tempo per scendere dopo che rilasci (da 2 ms a 20 s, ma solo se lo switch globale RELEASE è ON).

#### 4.2 CONTOUR CONTROLS

Quattro switch globali che alterano il comportamento di entrambi gli inviluppi (filtro + VCA).

##### RETURN TO ZERO

**Cosa fa**: forza gli inviluppi a tornare a zero prima di ripartire (vs partire dal valore corrente).

**Programmabile**: sì.

##### UNCONDITIONAL

**Cosa fa**: gli inviluppi suonano sempre per intero, indipendentemente da quando rilasci il tasto.

**Programmabile**: sì.

**Suggerimento**: nel motore di SIXinONE l'effetto pratico di RETURN TO ZERO e UNCONDITIONAL è limitato dalla nostra architettura "una voce per nota" (non condividiamo l'inviluppo tra note ribattute). Le switch ci sono per coerenza visiva e per i preset che le impostano, ma il loro impatto è sottile rispetto al Memorymoog reale.

##### KEYBOARD FOLLOW

**Cosa fa**: scala i tempi degli inviluppi in base alla nota: note alte → inviluppi più corti, note basse → inviluppi più lunghi.

**Programmabile**: sì.

**Quando usarlo**: per percussioni che imitano l'attacco corto/lungo dei diversi registri (bell alti staccati vs gong gravi lunghi).

##### RELEASE

**Cosa fa**: abilita la fase di Release degli inviluppi. Se OFF, il rilascio del tasto fa scendere immediatamente l'inviluppo.

**Programmabile**: sì.

#### 4.3 VOLTAGE CONTROLLED AMPLIFIER

##### L'ADSR del VCA

Quattro knob — **ATTACK, DECAY, SUSTAIN, RELEASE** — identici concettualmente a quelli del filtro, ma applicati al volume invece che al cutoff.

- ATTACK lungo = pad che entra dolcemente.
- ATTACK corto + DECAY lungo + SUSTAIN basso = pianissimo, plucks, bells.
- SUSTAIN alto = note sostenute (organi, archi).
- RELEASE lungo = code che svaniscono dopo aver rilasciato.

#### 4.4 OUTPUTS

##### PROGRAMMABLE VOL

**Cosa fa**: il volume "memorizzato" del preset — diverso dal master volume del browser/sistema.

**Range**: 0–10 sul knob.

**Programmabile**: sì.

**Suggerimento**: usalo per livellare i preset tra loro. Un brass loud + un pad soft programmati allo stesso volume risulteranno molto diversi all'orecchio; PROGRAMMABLE VOL ti permette di equilibrarli senza alterare il sound design.

---

## Sezione II — La tastiera e i controlli di esecuzione

### 1. La tastiera virtuale 61 tasti

SIXinONE espone una **tastiera virtuale di 61 tasti**, esattamente come quella del Memorymoog Plus, da F1 (MIDI 29) a F6 (MIDI 89). I tasti bianchi sono in primo piano, quelli neri sopra.

### 2. Suonare con il mouse

Click + trascinamento sui tasti virtuali. Quando trascini fuori da un tasto, il successivo viene premuto automaticamente. Pointer up = note off.

### 3. Suonare con la tastiera del computer (mapping completo)

Il mapping è quello classico dei sintetizzatori virtuali:

| Riga    | Tasti                                                  | Note prodotte                 |
| ------- | ------------------------------------------------------ | ----------------------------- |
| Inferiore | `z s x d c v g b h n j m` + `,` `l` `.` `;` `/`        | una scala cromatica dal Do dell'anchor |
| Superiore | `q 2 w 3 e r 5 t 6 y 7 u` + `i` `9` `o` `0` `p`         | un'ottava sopra              |

L'anchor di default è **C4 (MIDI 60)** — il do centrale del pianoforte. Premi `[` per scendere di un'ottava o `]` per salire. L'etichetta "Anchor" accanto alla tastiera ti mostra dove sei.

### 4. Octave shift OCT− / OCT+

Due pulsanti accanto alla tastiera fanno la stessa cosa di `[` e `]`. Range complessivo dell'anchor: da F1 a F5 (5 ottave di shift possibili).

### 5. I LED voce (le 6 voci attive)

Sopra la tastiera vedi **sei piccoli LED** che si accendono quando una voce è attiva. Quando suoni un accordo di sei note, vedi i sei LED tutti accesi. Quando suoni una settima nota, l'allocator "ruba" la voce più vecchia (oldest-first) — vedrai uno dei LED restare acceso e un altro restart per la nuova nota.

### 6. L'indicatore Anchor

L'indicatore mostra il nome della nota al tasto `z` (la base della riga bassa). Per esempio "Anchor: C4" indica che `z` suonerà C4, `s` suonerà C#4, `x` suonerà D4, e così via.

---

## Sezione III — Il System Controller e i preset

### 1. I 100 preset di fabbrica

SIXinONE ha **100 preset di fabbrica** numerati da 00 a 99. Sono organizzati per archetipo sonoro: cinque famiglie di String, dieci di Brass, cinque di Sync, cinque di Mono, cinque di Clav, tre di E Piano, cinque di Organ, una manciata di Bell/Vibes/Wind Chimes e parecchi effetti. La tabella completa è in [Appendice A](#appendice-a--tabella-completa-dei-100-preset).

### 2. Caricare un preset

#### Dal keypad numerico

1. Clicca sui tasti del keypad numerico per digitare due cifre. Il display mostra il buffer (per esempio `→ 27`).
2. Premi **ENTER**. Il preset 27 (Clav 1) viene caricato.

#### Dai preset tile in alto

In alto sopra il pannello c'è una **barra di tile** con alcuni preset di test. Cliccane uno e parte un'anteprima automatica.

### 3. Modificare un preset

Appena tocchi un knob o uno switch, il display alphanumerico mostra brevemente `EDIT` con il vecchio e il nuovo valore. Le modifiche sono in RAM — non vengono salvate finché non lo dici esplicitamente.

### 4. Salvare un preset (RECORD INTERLOCK)

Il workflow vintage:

1. Modifica liberamente il preset come vuoi.
2. Sul keypad, premi **RECORD INTERLOCK**. Il LED rosso del pulsante si accende — sei in "modalità salvataggio".
3. Digita due cifre per il numero di slot di destinazione (può essere lo stesso del preset di partenza o uno diverso).
4. Premi **ENTER**.

Il preset viene salvato in IndexedDB del browser. Il salvataggio "shadow-overlay" il preset di fabbrica: prossima volta che carichi quel numero, vedrai la tua versione. Il preset di fabbrica resta disponibile come fallback — non viene mai cancellato dalla memoria.

### 5. I bank A/B/C/D

I quattro pulsanti A/B/C/D sul keypad sono **selettori di bank visivi**. Sul Memorymoog originale servivano per la paginazione (A = preset 1-25, B = 26-50, eccetera). In SIXinONE abbiamo un solo bank a 100 slot, quindi questi pulsanti sono attualmente puramente estetici — sono lì per fedeltà visiva al pannello.

### 6. Reset al preset di fabbrica

Se hai sovrascritto un preset di fabbrica e vuoi tornare all'originale:

- **Singolo preset**: non c'è un comando dedicato. Carica un altro preset e poi ricarica quello: la prossima esecuzione partirà dal banco di fabbrica solo se elimini l'override in IndexedDB (vedi `EJECT` per il reset totale).
- **Tutti i preset**: usa il pulsante **EJECT** della cassette I/O (vedi [Sezione VII](#sezione-vii--cassette-io-backup-preset)). Cancella tutti gli override e ti riporta al banco di fabbrica vergine.

---

## Sezione IV — Il MIDI

### 1. Abilitare il MIDI (permesso del browser)

Sotto il pannello principale trovi la striscia **MIDI**. Clicca **Enable MIDI**. Il browser ti chiederà il permesso di accedere ai dispositivi MIDI. Se accetti, la lista degli input/output disponibili apparirà nei dropdown.

Su browser senza Web MIDI (Safari ≤ 16) il pannello mostrerà `browser unsupported` e ti farà solo suonare dal computer keyboard. Su Firefox e Chrome moderni funziona out of the box.

### 2. Selezionare input e output

- **IN**: il dispositivo MIDI da cui vuoi ricevere note (la tua tastiera fisica, una DAW, un loopback come IAC su Mac).
- **OUT**: il dispositivo a cui SIXinONE invia le note suonate dalla tastiera virtuale o dal sequencer.

### 3. Canale MIDI (Omni e canali 1-16)

Il dropdown **CH** filtra i messaggi in ingresso per canale:

- **Omni** (= 0) — accetta tutto.
- **Ch 1** fino a **Ch 16** — accetta solo il canale specifico.

Se sei in modalità MPE (vedi sotto), il filtro canale viene automaticamente bypassato perché MPE richiede di ricevere su più canali simultaneamente.

### 4. MIDI Thru

Lo switch **Thru** inoltra i byte raw del MIDI input all'output. Utile se vuoi che SIXinONE faccia da "hub" tra un controller e un altro strumento.

### 5. Messaggi supportati

| Messaggio                  | Effetto                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| Note On / Note Off         | suona/rilascia la nota; velocity scala il picco del VCA                          |
| Pitch Bend                 | scalato dal knob PITCH BEND AMT                                                  |
| Channel Pressure (After-touch) | usato in MPE (vedi sotto)                                                     |
| CC 1 (Mod Wheel)           | si somma al MOD AMOUNT del preset corrente                                       |
| CC 64 (Sustain Pedal)      | hold dei note-off finché il pedal è giù                                           |
| CC 74 (Timbre/Slide)       | usato in MPE per modulare il filtro                                              |
| CC 123 (All Notes Off)     | panic                                                                            |
| Program Change             | carica il preset 0-99 (program change > 99 ignorato)                             |

### 6. Indicatori live: MOD bar, BEND bar, SUSTAIN LED, EXT CLK

A destra del pannello MIDI vedi quattro indicatori:

- **MOD** — barra verde-arancio che si riempie con il valore del CC1.
- **BEND** — barra bipolare centrata che mostra il pitch bend corrente (negativo a sinistra, positivo a destra).
- **SUSTAIN** — LED rosso acceso quando il pedale è giù.
- **EXT CLK** — LED + display BPM acceso quando arriva MIDI Clock da un master esterno (vedi Sezione V.1).

### 7. MPE (MIDI Polyphonic Expression)

#### 7.1 Cos'è l'MPE e quando ti serve

L'**MPE** è uno standard MIDI relativamente recente (2018) che permette di controllare ogni nota *individualmente*. Su un MIDI normale, se fai pitch bend, tutte le note che stai tenendo si piegano insieme. Con MPE, ogni nota viene assegnata a un canale MIDI proprio (canali 2-16 di default, ch 1 master), così il pitch bend di una nota non tocca le altre. È lo standard che fa funzionare controller espressivi come ROLI Seaboard, LinnStrument, Haken Continuum, Sensel Morph.

#### 7.2 Mode (Auto / On / Off)

Dropdown **Mode** nel box MPE:

- **Off** — disattivato, il MIDI viene trattato in modo classico.
- **Auto** — SIXinONE rileva automaticamente se sta ricevendo MPE (basato su pitch bend su 3+ canali diversi entro 500 ms, oppure ricezione del messaggio RPN 6 MCM) e attiva la modalità.
- **On** — sempre attivo, indipendentemente da cosa arriva.

#### 7.3 Zone (Lower / Upper)

- **Lower** — canale 1 master, canali 2-16 voci. Standard nei controller ROLI.
- **Upper** — canale 16 master, canali 1-15 voci. Più raro.

#### 7.4 Bend range

Quanti semitoni copre il pitch bend per-nota. Default **±48** (4 ottave) — è lo standard MPE che ti permette di fare slide molto ampi sul Seaboard.

#### 7.5 Routing Pressure (VCA, LFO depth, Filter)

I tre checkbox sotto **Pressure →** decidono cosa fa la pressione canale (channel pressure / aftertouch) per-nota:

- **VCA** — boosta il volume della singola voce.
- **LFO depth** — aumenta la profondità della modulazione (visualmente moves the mod barebone).
- **Filter** — apre il filtro localmente sulla voce.

Default: VCA + LFO depth attivi, Filter spento — è il default del Seaboard.

#### 7.6 Routing Timbre CC74 (Filter)

L'unico routing del CC74 è **Filter** — il "slide" del Seaboard apre il filtro della voce. È programmato come default ON.

### 8. MIDI Clock IN/OUT (sincronizzazione con DAW)

Vedi [Sezione V.1](#1-transport-il-cuore-del-tempo) per i dettagli su come usare il MIDI clock IN (master esterno → SIXinONE come slave) e OUT (SIXinONE come master → DAW slave).

---

## Sezione V — Transport, arpeggiatore e sequencer

### 1. TRANSPORT (il cuore del tempo)

Il pannello **Transport** è il punto di controllo unico del tempo per arpeggiatore + sequencer. Tutto quello che ha a che fare con BPM è qui.

#### BPM

Il campo numerico **BPM** imposta il tempo globale. Range 30-360.

#### TAP TEMPO

Il pulsante **TAP** ti permette di stabilire il BPM picchiettando. Schiacciaci sopra al tempo desiderato (almeno 4 tap consecutivi per una stima affidabile, ma anche 2 funzionano). Se aspetti più di 2 secondi tra un tap e l'altro, la serie si resetta — quindi se sbagli ricomincia dopo una pausa.

#### SOURCE INT vs EXT

- **INT**: il transport usa il BPM del pannello.
- **EXT**: il transport segue il MIDI Clock esterno che arriva via cavo MIDI o IAC virtuale. Il BPM viene stimato in tempo reale dai 24 PPQN che il master invia.

In EXT, anche **start/stop** vengono dal master: quando premi PLAY sul DAW, partono arpeggiatore e sequencer; quando premi STOP, si fermano.

#### PLAY / STOP globali

Due pulsanti che avviano e fermano il transport. In INT iniziano la propagazione dei tick a tutti i consumatori (sequencer + arp). In EXT vengono ignorati — comanda il master MIDI.

#### CLK OUT (slave del DAW al tuo computer)

Il pulsante **CLK OUT** abilita l'invio del MIDI Clock (24 PPQN, byte 0xF8) al MIDI output. Quando attivo:

- Ogni tick del transport interno viene trasmesso come 0xF8 al device MIDI selezionato.
- Quando premi PLAY/STOP, vengono trasmessi 0xFA (start) e 0xFC (stop).

In questo modo SIXinONE può fare da master a un DAW o a un drum machine slave.

### 2. Arpeggiatore

#### 2.1 Cos'è un arpeggiatore

Un **arpeggiatore** è un dispositivo che prende l'accordo che stai tenendo e lo "arpeggia" — lo trasforma in una sequenza di note che escono una dopo l'altra a tempo. Se tieni Do-Mi-Sol e premi UP a 1/16, sentirai Do-Mi-Sol-Do-Mi-Sol-Do-Mi-Sol... ripetuto a velocità di una nota ogni sedicesimo.

#### 2.2 I 6 pattern (OFF, UP, DN, U-D, UDI, RND, PLY)

Vedi la tabella nella [Sezione I.2.4](#24-kb-mode-hold-arpeggiator).

#### 2.3 RANGE (1-4 ottave)

Il dropdown **RANGE** estende l'arpeggio su 1, 2, 3 o 4 ottave. Se tieni Do-Mi-Sol con RANGE 2, sentirai Do-Mi-Sol-Do'-Mi'-Sol'-Do-Mi-Sol-Do'-Mi'-Sol'... dove l'apice indica un'ottava sopra.

#### 2.4 STEP (1/4, 1/8, 1/16, 1/32)

La suddivisione del beat in cui l'arpeggiatore avanza:

| Etichetta | Significato                                |
| --------- | ------------------------------------------ |
| 1/4       | una nota per pulsazione                    |
| 1/8       | due note per pulsazione                    |
| 1/16      | quattro note per pulsazione (default)      |
| 1/32      | otto note per pulsazione                   |

#### 2.5 RATE BPM (e il legame col Transport)

Il campo **RATE BPM** è una copia del BPM globale del transport. Modificare uno aggiorna l'altro (bidirezionale). È esposto qui per comodità — può essere utile cambiare BPM senza aprire il pannello transport.

#### 2.6 Combinare arpeggiatore + HOLD

Se attivi **HOLD** + arpeggiatore, le note tenute restano "latchate" anche dopo che rilasci i tasti. È perfetto per esplorare il filtro e gli FX mentre l'arpeggio gira in loop. Per uscire dal latch, spegni HOLD.

### 3. Sequencer

#### 3.1 I 10 slot

Dieci slot numerati 0-9, ognuno può contenere una sequenza di note. Solo uno alla volta è "selezionato" — clicca un slot button per selezionarlo.

#### 3.2 Registrazione real-time (REC)

1. Seleziona un slot.
2. Latch **REC**. Il LED si accende.
3. Suona alla tastiera. Ogni nota viene aggiunta come step della sequenza.
4. Unlatch REC.
5. Premi **PLAY**: la sequenza parte in loop.

La registrazione è quantizzata: ogni nota viene registrata come uno step di durata 1 beat. Non è registrazione MIDI con timing perfetto — è registrazione "step-by-step".

#### 3.3 Riproduzione (PLAY)

PLAY avvia il transport (se non già partito) e suona gli step della sequenza corrente uno dopo l'altro al BPM del transport.

#### 3.4 Step mode (STEP)

Il pulsante **STEP** avanza la sequenza di una nota alla volta — utile per debug o per esecuzioni a tempo libero.

#### 3.5 Sincronia esterna (CONTINUOUS vs SYNC_EXT)

Il dropdown della modalità del sequencer:

- **CONTINUOUS** — segue il transport interno (INT mode).
- **STEP** — avanzamento manuale.
- **SYNC_EXT** — forza il transport in modalità EXT. La sequenza avanza al MIDI Clock esterno, e la suddivisione è scelta dal dropdown ("STEP" 1/4 / 1/8 / 1/16 / 1/32).

#### 3.6 Cancellare un slot (CLR)

Il pulsante **CLR** svuota lo slot selezionato. Non chiede conferma — se sei nel mezzo di una sequenza importante, registrala prima di pasticciare con CLR.

---

## Sezione VI — FX Rack

### 1. La catena: voci → CHORUS → PLATE REVERB → TAPE DELAY → master

Sotto il pannello principale c'è il **FX Rack** — tre moduli di effetti applicati al segnale somma di tutte le voci, in ordine fisso:

```
voci → [CHORUS] → [PLATE REVERB] → [TAPE DELAY] → master output
```

Ogni modulo ha un **bypass LED** (clicca per attivare/disattivare) e una manciata di knob. I valori sono **per-preset**: si salvano dentro al programma.

### 2. CHORUS

#### Cos'è il chorus

Il **chorus** è un effetto che fa sembrare un suono "raddoppiato" — come se più strumenti suonassero la stessa nota leggermente sfasati. Tecnicamente è una linea di ritardo (5-25 ms) modulata da un LFO lento, mixata con il segnale dry. È l'effetto che ha definito il suono pad anni '80 — gli archi del Roland Juno, i pad del Korg M1.

#### Knob

- **RATE**: la velocità dell'LFO del chorus (0.1–10 Hz).
- **DEPTH**: l'ampiezza della modulazione del delay.
- **FBK**: il feedback — quanto del segnale ritardato torna nel ritardo. Tieni basso (sotto 30%) per evitare il "rumore di nastro che si attorciglia".
- **MIX**: dry/wet.

### 3. PLATE REVERB

#### Cos'è il riverbero plate

Il **plate reverb** è il riverbero che le sale di registrazione anni '70-'80 facevano artificialmente: una lastra di acciaio sospesa, scossa elettromagneticamente, raccolta da un pickup. Caratteristica: denso, brillante, attacco rapido. Diverso dall'**hall reverb** (lungo e diffuso, simula stanze) e dallo **spring reverb** (caratteristico, "boing-boing", tipo amplificatore Fender).

SIXinONE lo implementa con un ConvolverNode + una impulse response generata proceduralmente (senza asset esterni).

#### Knob

- **SIZE**: 0=small (1s di coda), 1=medium (2.5s), 2=large (5s).
- **DAMP**: smorzamento delle alte frequenze nella coda. 0=brillante, 10=scuro.
- **MIX**: dry/wet.

### 4. TAPE DELAY

#### Cos'è il tape delay

Un **tape delay** simula un'unità a nastro (tipo Roland RE-201 Space Echo): il segnale viene "scritto" su un nastro che gira, e una serie di testine ne legge la copia ritardata. La modulazione del nastro produce due effetti caratteristici: **wow** (drift lento, ~0.5 Hz) e **flutter** (jitter veloce, ~6 Hz). Inoltre il nastro si satura — non hai un eco "pulito", hai un eco caldo.

SIXinONE implementa tutto: delay line + waveshaper tanh + due LFO per wow/flutter.

#### Knob

- **TIME**: il delay time (50-1500 ms).
- **FBK**: feedback — quanto del segnale ritardato torna nel delay. Sopra 80% genera ritardi infiniti (drone).
- **TONE**: la frequenza di taglio del low-pass nel feedback path (800 Hz-12 kHz). Bassa = ripetizioni che si scuriscono velocemente, alta = ripetizioni brillanti.
- **MIX**: dry/wet.
- **PING**: attiva il ping-pong stereo — le ripetizioni alternano destra e sinistra.

### 5. FX per-preset

Tutti i valori degli FX, **incluso il bypass on/off di ogni modulo**, vengono salvati dentro al preset. Caricare String 1 ti darà chorus + plate reverb già attivi. Caricare Mono 1 ti darà tutti gli FX bypassati (il basso si vuole asciutto).

Quando modifichi un knob di un FX modulo, il preset corrente viene marcato come edited.

---

## Sezione VII — Cassette I/O (backup preset)

### 1. Cos'è la cassette

La **cassette I/O** è la sezione di backup/restore dei preset di SIXinONE. È pensata come omaggio al **jack CASSETTE** sul retro del Memorymoog Plus reale: nel 1982 ci collegavi un registratore a cassette portatile e salvavi il banco preset come segnale audio modulato. Il nostro fa più o meno la stessa cosa, in due flavor:

- **Formato TEXT** — file JSON `.mm-bank`, veloce e affidabile.
- **Formato AUDIO** — segnale FSK che suona come un modem 1995, lento e drammatico (l'easter egg storico).

### 2. Formato TEXT (.mm-bank JSON)

#### REC: esportare il bank

Clicca **REC**. Si scarica un file `sixinone-presets-YYYYMMDD.mm-bank` con tutti i tuoi 100 preset (factory + le tue modifiche shadow). È testo umano-leggibile con un header in stile manuale Memorymoog + un checksum SHA-256.

#### PLAY: importare un bank

Clicca **PLAY**. Si apre un file picker. Scegli un `.mm-bank` precedentemente esportato. Le bobine girano per ~2 secondi (omaggio al tempo di caricamento reale della cassetta del 1982), poi il bank viene importato.

#### Merge mode (importare solo i cambiamenti)

Spunta la checkbox **Merge (only changed presets)** prima di cliccare PLAY. Con merge attivo, solo i preset che *differiscono* dal banco corrente vengono sovrascritti. È il modo sicuro per importare le tue modifiche di un'altra sessione senza buttare via quello che stai facendo adesso.

#### EJECT (reset al banco di fabbrica)

Clicca **EJECT** + conferma. Cancella tutti gli override utente da IndexedDB. Torni al banco di fabbrica vergine. È irreversibile — se hai modifiche che ti piacciono, esportale prima con REC.

#### BAD TAPE (cosa fare se l'import fallisce)

Se il file `.mm-bank` è corrotto (checksum sbagliato, JSON malformato), il display mostra `BAD TAPE` — il messaggio esatto del Memorymoog del 1982 quando la cassetta era illeggibile. Significa che il file non è valido. Riprova con un altro file o ricreane uno nuovo.

### 3. Formato AUDIO (l'easter egg storico)

#### 3.1 Perché esiste questa modalità

Sul Memorymoog Plus reale, il "salva preset" non era JSON — era audio modulato Kansas City Standard (300 baud, FSK 1200/2400 Hz). Ci collegavi un registratore portatile, premevi REC sulla cassetta + SAVE sul synth, e per ~3-4 minuti la cassetta riceveva una serie di "vrrr-vrr" che codificavano i 100 programmi.

Nel 2026 questa è una feature totalmente inutile (il JSON `.mm-bank` esiste, fa la stessa cosa in un secondo). Ma è anche totalmente perfetta come omaggio. La modalità AUDIO di SIXinONE ricrea l'esperienza, non per fare backup veri ma per farti sentire come ci si sentiva nel 1982.

#### 3.2 SCOPE: singolo preset vs tutti i 100

- **Single preset (current)** — esporta solo il preset attualmente caricato. Tempo di trasmissione: ~12 secondi.
- **All 100** — esporta tutto il banco. Tempo: ~3 minuti (gzip + Hamming overhead).

Default: Single. È più poetico, più veloce, e segue meglio l'uso reale (chi vuole davvero condividere il banco completo? Si vuole condividere "guarda che pad ho fatto").

#### 3.3 SOURCE: file .wav vs live mic/speaker

- **.wav file** — REC scarica un file `.wav`, PLAY apre un file picker.
- **Live (mic / speaker)** — REC suona attraverso gli speaker, PLAY ascolta dal microfono.

#### 3.4 Trasferire via file .wav

##### REC: scarica il .wav

In modalità AUDIO + SOURCE .wav, clicca **REC**. Si scarica un file `sixinone-preset-NN-YYYYMMDD.wav` (o `sixinone-bank-YYYYMMDD.wav`). Puoi spedirlo via mail, Discord, AirDrop — è solo un file audio.

##### PLAY: carica un .wav

Clicca **PLAY**, scegli il file `.wav`. Il browser lo decodifica con `AudioContext.decodeAudioData`, poi il demodulatore estrae i byte e ricostruisce il preset (o il banco).

#### 3.5 Trasferire live (telefono + microfono PC)

Il caso d'uso più poetico: due utenti su due computer diversi che si scambiano un preset usando solo il telefono come "vettore audio".

##### Setup ambiente

- Ambiente silenzioso. Stanza chiusa, ventole basse, niente musica di fondo.
- Distanza speaker-microfono: 20-40 cm.
- Volume del computer che trasmette: medio-alto (ma non al massimo, per evitare distorsione).

##### REC: speaker → telefono

1. Utente A: imposta SCOPE = Single, SOURCE = Live.
2. Clicca **REC**. Senti ~12 secondi di vrr-vrr-vrr dagli speaker.
3. Utente B: registra l'audio con l'app voice recorder del telefono.

##### PLAY: telefono → microfono → preset caricato

1. Utente B sul proprio computer: imposta SCOPE = Single, SOURCE = Live.
2. Clicca **PLAY**. Il browser chiede il permesso microfono — concedilo.
3. Utente B avvicina il telefono al microfono del computer (20-30 cm) e preme PLAY sull'app voice recorder.
4. Il display di SIXinONE narra la storia: `SYNC...` → `LOADING` → `CHECK...` → `OK`.
5. Il preset appare nello slot corrente del banco utente B.

##### Cosa fare se vedi BAD TAPE

- Rumore di fondo troppo alto — chiudi la finestra, spegni il ventilatore.
- Volume troppo basso — alza il telefono e/o il volume.
- Microfono che fa noise suppression — alcuni browser disabilitano la nostra richiesta. Prova un altro browser.
- Il file è troppo lungo per essere catturato senza glitch del registratore — passa a SOURCE .wav.

#### 3.6 Il protocollo (cenni tecnici per curiosi)

- **Modulazione**: 2-FSK (Frequency Shift Keying a due toni). Mark (binario 1) = 1200 Hz, Space (binario 0) = 2200 Hz. È lo standard **AT&T Bell 202** del 1976.
- **Baud rate**: 1200 simboli al secondo.
- **ECC**: Hamming(7,4) per nibble. Ogni 4 bit di dato diventano 7 bit codificati che permettono di correggere fino a 1 errore di bit per nibble.
- **Integrità**: CRC-32 (IEEE 802.3) sul payload — se il checksum non torna alla fine, è `BAD TAPE`.

Net throughput: ~85 byte/secondo di payload utile. Un preset (~1 KB JSON) → ~12 secondi di audio. Il banco intero (~15 KB gzipped) → ~3 minuti.

Per i dettagli completi, vedi [`docs/CASSETTE.md`](./CASSETTE.md).

---

## Sezione VIII — Le otto demo

### 1. Aprire il pannello DEMOS

In alto a destra dell'header, accanto al pulsante `?` di help, c'è un pulsante **DEMOS**. Cliccalo: si apre un pannello fluttuante che lista le otto demo organizzate in tre categorie.

### 2. IN STILE

Quattro demo originali (nessuna melodia coperta da copyright) che dimostrano archetipi sonori di un'epoca.

#### Arena Sync Lead

Preset 8 (Sync 1), 120 BPM, La minore. Riff lead monofonico early-80s con una coda di "sync scream" — il knob COARSE di OSC2 si muove davanti ai tuoi occhi mentre il pitch oscilla. Durata: 20 secondi.

#### Neon Drive

Presets 2 (Brass 1) + 54 (Mono 1), 100 BPM, Dm–F–C–G. Stab di brass synthwave alternati a bassline mono in sedicesimi. Le bobine cambiano tra i due preset bar per bar. Durata: 21 secondi.

#### Cinematic Sweep

Preset 0 (Synth Sweep), 60 BPM. Accordo Em7 sostenuto per 15 secondi mentre CUTOFF e EMPHASIS salgono dolcemente, poi modulazione a Cmaj9 per altri 15 secondi. Plate reverb attivo per la coda. Mostra la sintesi sottrattiva nella sua forma più pura. Durata: 30 secondi.

#### Funk Bass Workout

Preset 54 (Mono 1), 110 BPM, Mi minore. Bassline sincopata in sedicesimi con glide attivo — lo slide tra una nota e l'altra è il "tlek" del basso synth funk. Durata: 20 secondi.

### 3. CLASSICAL (Pubblico Dominio)

#### Bach — Invention No. 1 (BWV 772)

Preset 49 (Harpsichord 1), 96 BPM. L'incipit dell'invenzione a due voci in Do maggiore: prima la voce destra, una battuta dopo la sinistra (omaggio diretto al canone bachiano). È un tributo a Wendy Carlos, *Switched-On Bach* (1968). Durata: 30 secondi.

#### Mozart — Eine kleine Nachtmusik (K.525)

Preset 1 (String 1), 130 BPM. Le prime otto battute del primo movimento, polifoniche a tre voci (melodia + armonia + basso). Sol maggiore, l'incipit più famoso di tutta la musica classica. Durata: 20 secondi.

### 4. TECHNICAL

#### Filter Workout

Preset 0, 25 secondi. Tieni un Do basso (C2) per tutta la durata, e guarda i knob CUTOFF / EMPHASIS muoversi attraverso cinque fasi:

| Sec. | Fase                                |
| ---- | ----------------------------------- |
| 0–5  | CUTOFF apre da 0 a 10               |
| 5–10 | EMPHASIS sale da 0 a 9 fino alla self-oscillation |
| 10–15 | CUTOFF wow-wow (10 → 2 → 10)       |
| 15–20 | EMPHASIS scende, LFO sul filtro    |
| 20–25 | EMPHASIS al massimo — filter screams |

È il modo più veloce per capire la fisica del filtro Moog.

#### 100 Presets Tour

Tutti i 100 preset, due secondi ciascuno. Per ogni preset SIXinONE suona una frase musicale appropriata alla categoria (accordi per pad/string/brass, nota grave per bass/mono, staccato per bell, eccetera). Il display mostra il numero + nome del preset corrente. Pulsanti **PREV/NEXT** ti permettono di saltare da preset a preset. Durata: 3 minuti 20 secondi.

È il modo più pigro per esplorare il banco. Lascialo girare in cuffia mentre cucini, e a fine sessione avrai un'idea decente di cosa offrono i 100 slot.

### 5. Auto-pause su interazione utente

Mentre una demo gira, se clicchi un knob della UI o premi un tasto del computer per suonare, la demo va automaticamente in **pausa** e appare un toast: "Demo paused — controls active". È pensato così tu possa interrompere una demo per provare al volo una variazione, senza fermare-e-ricominciare manualmente.

Se vuoi disattivare questo comportamento (per ascoltare la demo senza distrazioni), spunta **Lock controls during demo** nella parte bassa del pannello DEMOS.

### 6. Controlli prev/next (per i tour lunghi)

Le demo brevi hanno solo PLAY/PAUSE/STOP. Quelle "lunghe" (`isLong: true`, ovvero solo il 100 Presets Tour) abilitano anche **PREV** e **NEXT**, che saltano tra le marker di preset change. Le frecce sinistra/destra fanno lo stesso da tastiera.

---

## Sezione IX — Scorciatoie da tastiera

### Tastiera del computer per suonare

| Range          | Tasti                                                              |
| -------------- | ------------------------------------------------------------------ |
| Ottava bassa   | `z s x d c v g b h n j m` (continua: `,` `l` `.` `;` `/`)          |
| Ottava alta    | `q 2 w 3 e r 5 t 6 y 7 u` (continua: `i` `9` `o` `0` `p`)          |
| Octave shift   | `[` giù · `]` su                                                   |

### Tasti di sistema

| Tasto    | Effetto                                                         |
| -------- | --------------------------------------------------------------- |
| `?`      | Apre l'help overlay                                             |
| `Esc`    | Chiude help / ferma demo (lascia il pannello aperto)            |
| `Space`  | Play / pause demo (quando il pannello DEMOS è aperto)           |
| `←` `→`  | Prev / Next demo (solo per le demo `isLong`)                    |

### Knob (mouse)

| Azione              | Effetto                                                  |
| ------------------- | -------------------------------------------------------- |
| Drag verticale      | regolazione del valore                                   |
| Drag + `Shift`      | fine — sensibilità 4× minore                             |
| Double-click        | reset al valore di default                               |
| Rotellina mouse     | step ±0.1 (con `Shift` ±0.01)                            |

---

## Sezione X — Installazione come app (PWA)

SIXinONE è una **Progressive Web App**: puoi installarlo come app sul desktop e sul telefono, e funziona anche offline.

### 1. Su Mac (Chrome / Safari)

**Chrome**: clicca l'icona "Install" nella barra degli indirizzi (≡ a forma di monitor con freccia in giù) → conferma. SIXinONE appare nel Dock e nel Launchpad.

**Safari**: File → Aggiungi alla Dock (Safari 17+) → conferma.

### 2. Su Windows (Chrome / Edge)

Clicca l'icona "Install" nella barra degli indirizzi (computer con freccia) → conferma. Appare nello Start Menu.

### 3. Su iPhone / iPad (Safari → Aggiungi a Home)

1. Apri SIXinONE in Safari.
2. Tocca il pulsante Condividi (quadrato con freccia su).
3. Scorri fino a "Aggiungi a Home".
4. Conferma il nome ("SIXinONE") e tocca Aggiungi.

### 4. Su Android (Chrome → Installa app)

1. Apri SIXinONE in Chrome.
2. Menu (tre puntini in alto) → "Installa app".
3. Conferma.

### 5. Funzionamento offline

Una volta installata, l'app funziona anche senza connessione. Il service worker tiene in cache tutto il codice, i font, le icone e gli script — la prima volta che apri SIXinONE online, il browser scarica e archivia tutto. Dalla seconda visita in poi, anche offline, parte.

L'unica feature che non funziona offline è il caricamento del font Google Fonts (VT323 + Inconsolata) — se sei offline al primo avvio, vedrai una fallback monospaziata. Dalla seconda volta, il font è in cache.

### 6. Come aggiornare all'ultima versione

Quando rilasciamo una nuova versione, il service worker rileva l'update automaticamente al prossimo avvio online. Per forzare un update manuale:

- Chrome / Edge: F12 → Application → Service Workers → Unregister, poi ricarica.
- Safari: Sviluppo → Vuota cache.
- Telefono: chiudi e riapri l'app.

---

## Sezione XI — Ricette sonore

Sei tutorial pratici step-by-step. Ogni ricetta parte da un preset e ti porta a un suono nuovo modificando knob specifici. Le istruzioni sono granulari — anche se non sai nulla di sintesi, segui i passi e ottieni il risultato.

### Ricetta 1 — Bass per house anni '90

**Cosa otterrai**: un basso solido, asciutto, con un piccolo "punch" sull'attacco. Stile classico Roland JX-8P / Korg M1 dei bassi club anni '90.

**Quando usarlo**: linee di basso per house, deep house, garage.

**Preset di partenza**: **54 (Mono 1)**.

**Procedura**:
1. Carica preset 54. Verifica che MONO sia ON, GLIDE ON sia OFF.
2. **VCF**: porta CUTOFF a 3, EMPHASIS a 4, CONTOUR AMT a 5. ATTACK del filtro a 0, DECAY a 4, SUSTAIN a 2, RELEASE a 2.
3. **VCA**: ATTACK a 0, DECAY a 3, SUSTAIN a 8, RELEASE a 1.
4. **MIXER**: OSC1 a 7, OSC2 a 7, OSC3 a 0, NOISE a 0.
5. **OSC1**: octave 16′, waveshape Saw (spegni Pulse e Tri).
6. **OSC2**: octave 16′, COARSE 0, FINE 0.05 (un pelo di detune).
7. **FX RACK**: tutto bypassato. Il basso deve essere asciutto.

**Risultato**: suona Do2 con la tastiera del computer (premi `q` con anchor C3 — premi `[` due volte per scendere). Senti un basso solido, focalizzato sotto i 200 Hz, con un piccolo "wob" dato dal filter envelope.

**Variazioni**:
- Per un suono più "acido", alza EMPHASIS a 7. Se sale troppo, abbassa CUTOFF a 2.
- Per un wobble più ampio, aggiungi LFO su FILTER con MOD AMOUNT 4 e LFO RATE 6.
- Aggiungi un tape delay sottilissimo (TIME 350 ms, FBK 25%, MIX 15%) per dare profondità.

### Ricetta 2 — Pad d'archi cinematografico

**Cosa otterrai**: un pad d'archi denso e "respirato" che cresce dolcemente, con chorus + reverb. Perfetto per soundtrack ambient.

**Quando usarlo**: scene contemplative, intro di brani lenti, transizioni emotive.

**Preset di partenza**: **1 (String 1)**.

**Procedura**:
1. Carica preset 1.
2. **OSC1**: octave 8′, waveshape Saw.
3. **OSC2**: octave 8′, COARSE 0, FINE 0.15. Waveshape Saw.
4. **OSC3**: octave 16′, FREQ −0.3, KB CTRL ON, LOW OFF. Waveshape Saw.
5. **MIXER**: OSC1 a 6, OSC2 a 6, OSC3 a 4, NOISE a 1 (l'aria!).
6. **VCF**: CUTOFF 5.5, EMPHASIS 1, CONTOUR AMT 2. ATTACK 5, DECAY 5, SUSTAIN 8, RELEASE 6.
7. **VCA**: ATTACK 6, DECAY 4, SUSTAIN 9, RELEASE 7.
8. **LFO**: RATE 3, wave TRI, destinazioni OSC1 + OSC2. MOD AMOUNT 2.
9. **FX**: CHORUS ON (RATE 0.5, DEPTH 4, FBK 1, MIX 5). PLATE REVERB ON (SIZE 2 = large, DAMP 4, MIX 3.5).

**Risultato**: suona un Do maggiore con la mano sinistra (tieni `z` `c` `g` simultaneamente). Senti un pad che entra dopo 600 ms circa, si stabilizza, e ha una coda di riverbero ~5 secondi.

**Variazioni**:
- Per un suono "più 90s techno", spegni il PLATE REVERB e accendi un TAPE DELAY (TIME 480 ms, FBK 30%, MIX 25%, PING ON).
- Per un suono più "Vangelis Blade Runner", alza il MOD AMOUNT a 5 e la LFO RATE a 1.5 — la modulazione diventa drammatica.
- Aggiungi un filtro che si apre lentamente: porta CUTOFF a 3 all'inizio e alza a 7 mentre tieni l'accordo.

### Ricetta 3 — Lead sintetico con sync scream (stile arena rock anni '80)

**Cosa otterrai**: il lead "vocalizzato" che si sente in tanti ritornelli di arena rock dell'epoca — molto acuto, con un timbro "che urla" dato dal hard sync.

**Quando usarlo**: assoli, lead acuti, melodie principali.

**Preset di partenza**: **8 (Sync 1)**.

**Procedura**:
1. Carica preset 8.
2. **OSC1**: octave 8′. SYNC 2→1 deve essere ON.
3. **OSC2**: COARSE 3 (questo è il segreto — è qui che il sync inizia a urlare).
4. **MIXER**: OSC1 a 2, OSC2 a 8 (vogliamo sentire principalmente OSC2 modulato).
5. **VCF**: CUTOFF 5, EMPHASIS 5, CONTOUR AMT 7. ATTACK 0.5, DECAY 4, SUSTAIN 5, RELEASE 3.
6. **VCA**: ATTACK 0, DECAY 3, SUSTAIN 8, RELEASE 4.
7. **MONO**: ON. GLIDE 1, GLIDE ON: ON.

**Risultato**: suona dal Sol4 in su con velocità (`y` con anchor C5). Senti un lead "che urla", molto vocale. Se sposti il COARSE di OSC2 mentre tieni una nota, senti il sync scream cambiare in tempo reale — è il movimento che il preset Filter Workout dimostra in automatico.

**Variazioni**:
- Aumenta COARSE a 5 per uno scream più aggressivo (e più stonato — è quello l'effetto voluto).
- Aggiungi un TAPE DELAY ping-pong (TIME 350 ms, FBK 30%, MIX 30%, PING ON) per il classico slap-back rock.
- Per un effetto "dive bomb", suona alto e fai pitch bend in giù con la mod wheel (CC1).

### Ricetta 4 — Bell elettronica anni '80

**Cosa otterrai**: un campanello sintetico cristallino, con attacco breve e coda lunga. Perfetto per chime, intro nostalgiche, jingle anni '80.

**Quando usarlo**: melodie cristalline, layer sopra un pad, intro di brani.

**Preset di partenza**: **15 (Bells)**.

**Procedura**:
1. Carica preset 15.
2. **OSC1**: octave 4′ (un'ottava sopra il concert pitch), waveshape Tri.
3. **OSC2**: octave 2′, COARSE 7 (un'ottava + una quinta sopra — produce le armoniche da campana). Waveshape Tri.
4. **OSC3**: octave 4′, FREQ 0, KB CTRL ON. Waveshape Tri.
5. **MIXER**: OSC1 a 7, OSC2 a 5, OSC3 a 4, NOISE a 0.
6. **VCF**: CUTOFF 8 (apertissimo — vogliamo le armoniche acute), EMPHASIS 0, CONTOUR AMT 0.
7. **VCA**: ATTACK 0.2, DECAY 6, SUSTAIN 0, RELEASE 7. Attack super-corto + sustain zero = il "ting" che svanisce.
8. **FX**: PLATE REVERB ON (SIZE 1 = medium, DAMP 5, MIX 4).

**Risultato**: suona Do6 (`p` con anchor C5). Senti un "ting" cristallino con una coda lunga e brillante.

**Variazioni**:
- Per vibes (preset 39 originale), alza LFO RATE a 5 con destinazione OSC1 + MOD AMOUNT 2.
- Per glockenspiel più scuro, abbassa CUTOFF a 5.
- Per chime cathedral, alza PLATE REVERB SIZE a 2 e DAMP a 2 — coda lunga e brillante di chiesa.

### Ricetta 5 — Effetto sirena di space-rock

**Cosa otterrai**: una sirena alien che sale e scende lentamente, con tanto noise e modulazione casuale. Effetto sonoro psichedelico.

**Quando usarlo**: SFX, intro psichedeliche, breakdown sperimentali.

**Preset di partenza**: **45 (Sirens)**.

**Procedura**:
1. Carica preset 45.
2. **LFO**: RATE 0.8, wave SAW+, destinazioni OSC1 + OSC2 + FILTER. MOD AMOUNT 8.
3. **OSC1**: octave 8′, waveshape Saw.
4. **OSC2**: octave 4′, COARSE 5, FINE 0.1. Waveshape Pulse.
5. **OSC3**: octave 16′, FREQ 3, KB CTRL OFF, LOW OFF. Waveshape Saw.
6. **MIXER**: OSC1 a 6, OSC2 a 5, OSC3 a 3, NOISE a 2.
7. **VCF**: CUTOFF 5, EMPHASIS 6, CONTOUR AMT 5. ATTACK 4, DECAY 6, SUSTAIN 4, RELEASE 5.
8. **VCA**: ATTACK 1, DECAY 5, SUSTAIN 7, RELEASE 5.

**Risultato**: suona un La4 e tieni (`y` con anchor C4). Senti una sirena alien che sale e scende ciclicamente. Aspetta 3-4 secondi per sentire l'intero ciclo.

**Variazioni**:
- Cambia wave LFO a S&H per un effetto "computer impazzito".
- Aumenta NOISE a 5 per più sporcizia "trasmissione radio".
- Aggiungi TAPE DELAY con FBK 60%, TIME 350 ms — diventa cosmico.

### Ricetta 6 — Basso wobble per dubstep

**Cosa otterrai**: il classico bass wobble — un basso con LFO sul filtro a velocità musicale. È un suono anacronistico per un sintetizzatore del 1982 ma è divertente.

**Quando usarlo**: drop di dubstep, drum & bass, riempitivi elettronici.

**Preset di partenza**: **64 (Mono 2)**.

**Procedura**:
1. Carica preset 64.
2. **OSC1**: octave 16′, waveshape Saw.
3. **OSC2**: octave 16′, COARSE 0, FINE 0.3. Waveshape Saw.
4. **MIXER**: OSC1 a 8, OSC2 a 8, OSC3 a 0, NOISE a 0.
5. **VCF**: CUTOFF 2, EMPHASIS 7, CONTOUR AMT 0. ATTACK 0, DECAY 0, SUSTAIN 10, RELEASE 0.
6. **LFO**: RATE 4 (sincronizza poi al transport), wave TRI, destinazione FILTER. MOD AMOUNT 8.
7. **TRANSPORT**: setta BPM a 140. (Il wobble è di 4 cicli al secondo, perfetto per dubstep half-time.)
8. **MONO**: ON. GLIDE 0, GLIDE ON: OFF.

**Risultato**: suona un Mi2 (`v` con anchor C3 dopo aver premuto `[` due volte). Senti un basso che "wob-wob-wob" 4 volte al secondo. Pieno effetto se layer-i sopra una batteria 140 BPM half-time.

**Variazioni**:
- Cambia LFO wave a SQR per un wobble più "binario", a SAW per un wobble più "tagliente".
- Aumenta LFO RATE a 6-7 per un wobble più veloce — entri in zona drum & bass.
- Aggiungi TAPE DELAY con TIME 214 ms (= 1/8 a 140 BPM) e FBK 40% per il tap-delay classico dubstep.

---

## Sezione XII — Risoluzione problemi

### Non sento niente

1. **Audio sbloccato?** Clicca un tasto della tastiera virtuale o premi un tasto del computer (per esempio `z`). I browser moderni richiedono un gesto utente prima di partire l'audio.
2. **Volume di sistema?** Controlla il volume del Mac/PC, dell'altoparlante/cuffia.
3. **Mute della scheda audio?** Se hai cuffie collegate, sono attive? La scheda audio non è in mute?
4. **Preset corrente?** Se hai un preset con OSC1/OSC2/OSC3 tutti a 0 nel mixer, non sentirai nulla. Carica preset 0 (Synth Sweep) per ripartire da una base ragionevole.
5. **Refresh hard?** Talvolta il service worker tiene cache un bug. `Cmd+Shift+R` su Mac, `Ctrl+Shift+R` su Windows/Linux.

### L'audio è distorto/clippa

- **Mixer troppo alto?** Se OSC1+OSC2+OSC3+NOISE sommano oltre 25-30, vai in clipping del mixer. Riduci i singoli knob.
- **EMPHASIS troppo alto?** Sopra 9 la self-oscillation può aggiungersi rumorosamente al segnale. Abbassa a 7.
- **PROGRAMMABLE VOL?** Se è a 10, prova a 7.

### Il MIDI non funziona

1. **Permesso del browser?** Riavvia il browser, riapri SIXinONE, riprova ad abilitare il MIDI.
2. **Browser supportato?** Safari ≤ 16 non ha il Web MIDI. Aggiorna a Safari 17+ o usa Chrome/Firefox.
3. **Dispositivo MIDI selezionato?** Il dropdown IN deve indicare un dispositivo, non "— none —".
4. **Canale corretto?** Se hai impostato CH = 5 ma il controller manda su CH = 1, niente arriva. Prova **Omni** (CH = 0).
5. **Cavi e USB?** Sostituisci il cavo USB, prova un'altra porta.

### La cassette audio dice sempre BAD TAPE

- **Rumore ambientale**: chiudi finestre, spegni ventilatori e altri rumori, prova in una stanza silenziosa.
- **Distanza**: troppo vicino o troppo lontano? 20-40 cm tra speaker e microfono è il dolce punto.
- **Volume**: se il volume è bassissimo, il segnale è coperto dal rumore di fondo. Alza un filo. Se è al massimo, la distorsione dell'altoparlante danneggia il carrier.
- **Browser**: alcuni mobile browser fanno noise suppression aggressiva sul mic anche quando chiediamo di non farla. Prova un browser desktop.
- **Velocità del file `.wav`**: alcuni servizi (WhatsApp Audio) ricomprimono i `.wav` in `.opus` perdendo info. Usa AirDrop / Google Drive / email come trasporto.

Se proprio non va: passa a **Formato TEXT** + condividi il `.mm-bank` JSON. Funziona sempre.

### Il browser dice "MIDI non supportato"

Stai usando Safari ≤ 16. Soluzione: aggiorna a Safari 17, oppure usa Chrome o Firefox.

### Il sito è lento o glitcha

- **CPU**: se hai molte tab aperte e il computer è carico, SIXinONE può ridurre la priorità del rendering. Chiudi alcune tab.
- **Service worker vecchio**: forza un refresh hard.
- **Numero di voci attive**: se suoni 6 voci contemporaneamente con FX rack pieno + sequencer + arpeggiatore, è tanta CPU. Spegni quello che non ti serve.

### Ho perso i miei preset

I preset utente sono in **IndexedDB** del browser. Se hai cancellato i cookies/cache del browser, possono essere stati cancellati anche loro.

Per evitare di perderli in futuro:
- Esporta regolarmente il banco come `.mm-bank` (Sezione VII) e tienilo da parte.
- Su iCloud Sync / Time Machine: i database IndexedDB non vengono in backup automatico — devi esportare tu.

---

## Sezione XIII — Glossario tecnico

**ADSR** — Attack, Decay, Sustain, Release. I quattro segmenti di un inviluppo: quanto ci mette il suono ad arrivare al massimo (A), quanto a scendere al livello di tenuta (D), quanto sta tenuto (S), quanto ci mette a sparire dopo che rilasci il tasto (R).

**Aliasing** — Distorsione che appare quando un oscillatore digitale genera frequenze più alte della metà della frequenza di campionamento. Suona come "fischi inarmonici" sopra le note acute. In SIXinONE è prevenuto dall'algoritmo PolyBLEP nel PWM oscillator.

**Anchor** — La nota MIDI di riferimento per la tastiera del computer. Default C4 (MIDI 60). Si sposta con `[` e `]`.

**Arpeggiator** — Dispositivo che prende le note tenute e le suona una dopo l'altra a ritmo, secondo un pattern (UP, DOWN, ecc.).

**Baud** — Numero di simboli al secondo trasmessi su un canale (modem, FSK). SIXinONE usa 1200 baud per la cassette audio.

**Bell 202** — Standard AT&T del 1976 per modem 1200 baud. Usa 1200 Hz mark, 2200 Hz space.

**Cassette** — Backup/restore dei preset. Due flavor: TEXT (file JSON) e AUDIO (FSK Bell 202).

**Chorus** — Effetto che simula la sovrapposizione di più strumenti che suonano la stessa nota leggermente sfasati. Linea di ritardo (5-25 ms) modulata da un LFO lento.

**Clipping** — Distorsione che avviene quando il segnale supera l'ampiezza massima rappresentabile. Soft clipping = saturazione dolce (musicale), hard clipping = taglio digitale (sgradevole).

**CRC-32** — Cyclic Redundancy Check a 32 bit. Codice usato per rilevare errori di trasmissione. In SIXinONE è il checksum della cassette audio.

**CPFSK** — Continuous-Phase FSK. FSK in cui la fase del carrier resta continua tra simboli, evitando click audibili.

**Cutoff** — La frequenza di taglio di un filtro passa-basso. Sopra cutoff, le frequenze vengono attenuate.

**Detune** — Stonatura controllata di un oscillatore rispetto a un altro, per ottenere un effetto chorus naturale.

**ECC** — Error Correction Code. Algoritmo che aggiunge ridondanza ai dati permettendo di rilevare e correggere errori. In SIXinONE: Hamming(7,4) per nibble.

**Envelope (inviluppo)** — Profilo che modella come un parametro (volume, cutoff) varia nel tempo dopo che premi un tasto. Vedi ADSR.

**EQ** — Equalizzazione. Filtri che alterano il bilanciamento spettrale (gravi, medi, acuti). Non è una feature di SIXinONE.

**Filter (filtro)** — Modulo che attenua selettivamente certe frequenze. SIXinONE ha solo un filtro passa-basso (ladder Moog 24 dB/oct).

**Filter sweep** — Movimento del cutoff in tempo reale per creare un'evoluzione timbrica. Tecnica classica del sound design.

**Forma d'onda (waveshape)** — La "forma" della singola oscillazione: triangolo, sega, quadra. Determina lo spettro armonico del suono.

**FSK** — Frequency Shift Keying. Modulazione che usa due (o più) frequenze diverse per rappresentare bit. In SIXinONE: 1200 Hz / 2200 Hz.

**Glide / Portamento** — Slittamento graduale di pitch tra due note. Tempo controllato dal knob GLIDE.

**Goertzel** — Algoritmo di rilevazione di una singola frequenza in un segnale audio. Usato dal decoder FSK di SIXinONE.

**Hamming(7,4)** — Codice di correzione errori. Trasforma 4 bit di dato in 7 bit codificati, permettendo di correggere 1 errore per nibble.

**Hard sync** — Sincronizzazione forzata di un oscillatore (slave) alla fase di un altro (master). Produce il caratteristico "sync scream".

**Hold** — Switch che tiene "premute" tutte le note finché non lo rilasci.

**Hz** — Hertz, cicli al secondo. Unità di misura della frequenza.

**KB Track** — Quanto la frequenza di taglio del filtro segue la tastiera. 0 = non segue, 1 = segue completamente.

**LFO** — Low Frequency Oscillator. Oscillatore sub-audio (0.1-100 Hz) usato per modulare altri parametri.

**MIDI** — Musical Instrument Digital Interface. Protocollo standard per comunicare tra strumenti musicali digitali.

**MIDI Clock** — Segnale di sincronizzazione (24 ticks per quarter, byte 0xF8) per coordinare BPM tra dispositivi.

**Mod wheel** — Controller CC 1. Solitamente usato per modulare la profondità di vibrato.

**Mono mode** — Modalità monofonica, una nota alla volta.

**MPE** — MIDI Polyphonic Expression. Standard del 2018 per controllare ogni nota individualmente via canali MIDI dedicati.

**NRZ** — Non-Return-to-Zero. Codifica binaria in cui ogni livello del segnale rappresenta direttamente un bit.

**Octave** — Intervallo musicale di rapporto 2:1. La stessa nota un'ottava sopra ha frequenza doppia.

**Oscillatore (VCO)** — Generatore di una forma d'onda periodica. Voltage Controlled Oscillator nel mondo analogico.

**PCM** — Pulse Code Modulation. Rappresentazione audio digitale come serie di campioni numerici.

**PolyBLEP** — Polynomial Band-Limited Step. Tecnica di anti-aliasing per oscillatori digitali (Välimäki & Huovilainen, 2007).

**Polifonia** — Capacità di un sintetizzatore di suonare più note contemporaneamente. SIXinONE: 6 voci.

**Preset (programma)** — Configurazione salvata di tutti i parametri. SIXinONE: 100 di fabbrica + override utente.

**PWM** — Pulse Width Modulation. Modulazione della larghezza dell'impulso di un'onda quadra. Produce il caratteristico "chorus" anni '80 sui pad d'archi.

**Quadratura** — Due segnali sfasati di 90 gradi (sin e cos). Usato per creare stereo da una sorgente mono (chorus stereo).

**Reed-Solomon** — Algoritmo di ECC più potente di Hamming. Non usato in SIXinONE (Hamming è sufficiente).

**Reverb** — Effetto che simula la riverberazione di una stanza. SIXinONE ha un plate reverb procedurale.

**RPN 6** — Registered Parameter Number 6 (MCM, MIDI Configuration Message). Messaggio MIDI standard per attivare la modalità MPE.

**S&H** — Sample & Hold. Generatore di valori casuali a intervalli regolari. Una delle waveshape dell'LFO.

**Self-oscillation** — Quando un filtro con resonance molto alta entra in oscillazione spontanea generando un tono puro (un seno).

**Sequencer** — Registratore di sequenze di note che le riproduce a tempo. SIXinONE: 10 slot.

**Sostain** — Pedale (CC 64) che tiene le note suonate anche dopo che rilasci i tasti.

**Sync 2→1** — Hard sync di OSC2 al ciclo di OSC1 (in SIXinONE OSC1 è il master, ma il nome storico è "2→1" perché significa "OSC2 viene resettato da OSC1").

**VCA** — Voltage Controlled Amplifier. Modulo che controlla il volume in funzione dell'inviluppo.

**VCF** — Voltage Controlled Filter. Filtro controllato in tensione. SIXinONE: ladder Moog 24 dB/oct.

**Voice stealing** — Quando tutte le voci sono attive e arriva una nuova nota, una voce viene "rubata" per ospitarla. SIXinONE ruba la più vecchia (oldest-first).

**Wow** — Drift lento del nastro magnetico (~0.5 Hz). Simulato dal tape delay.

**Flutter** — Jitter veloce del nastro magnetico (~6 Hz). Simulato dal tape delay.

---

## Appendice A — Tabella completa dei 100 preset

I 100 preset di fabbrica di SIXinONE seguono la nomenclatura del Memorymoog originale del 1982. Le descrizioni e i suggerimenti musicali sono frutto dell'archetipo programmato — non sono i preset originali bit-perfetti, ma rispettano la "DNA sonora" del nome.

| #  | Nome              | Categoria  | Descrizione sonora                                          | Suggerimento musicale                    |
| -- | ----------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- |
| 00 | Synth Sweep       | SYNTH      | pad versatile con filter sweep lento + glide               | tappeto introduttivo, pad ambient        |
| 01 | String 1          | STRINGS    | archi anni '80 con due saw detunate + chorus + plate       | pad cinematografico, layer di violini    |
| 02 | Brass 1           | BRASS      | brass synth pulse con bite del filter envelope             | stab di brass funky, sezione fiati       |
| 03 | Vocal Chorus      | SYNTH      | tre saw lente + chorus pronunciato                          | pad vocale "Vangelis"                    |
| 04 | Organ 1           | ORGAN/MONO | tri + saw stack, sustain alto, attack veloce               | organo rock-jazz                         |
| 05 | Filter Trill      | SYNTH      | LFO sul filtro = trillo a filtro                            | effetto suspense, intro psichedelica     |
| 06 | Synth Sq 1        | SYNTH      | onda quadra pura + filtro chiuso                            | lead 8-bit                               |
| 07 | E Piano 1         | KB         | tri + saw con filter envelope dolce                         | piano elettrico mid-period               |
| 08 | Sync 1            | SYNTH      | hard sync OSC2→OSC1 — "sync scream" classico                | lead arena rock, assolo                  |
| 09 | Harp              | KB         | saw + tri con attack veloce, sustain zero                   | arpeggi cristallini, harp gentle         |
| 10 | Octave Trill      | SYNTH      | LFO veloce su OSC = trillo a ottave                         | effetto computer anni '70                |
| 11 | String 2          | STRINGS    | come String 1 ma più scuro e sostenuto                     | pad d'archi maestoso                     |
| 12 | Brass 2           | BRASS      | brass più aggressivo con sostegno                           | brass rock, lead orchestrale             |
| 13 | Tuned Perc        | EFFECTS    | percussioni tonali con S&H sul filtro                       | percussion sintetiche, fill              |
| 14 | Organ 2           | ORGAN/MONO | organo più rotondo, jazz                                     | accompagnamento jazz, ballad             |
| 15 | Bells             | EFFECTS    | campanelli triangolari + plate reverb                       | jingle, intro nostalgico, layer chime    |
| 16 | Recorder          | STRINGS    | onda triangolare pulita, attack moderato                    | flauto dolce, suono pastorale            |
| 17 | Power Synth       | SYNTH      | saw + pulse stack con drive del mixer                       | lead potente, power chord                |
| 18 | Sync 2            | SYNTH      | variante del Sync 1 più aggressiva                          | assolo arena rock alternativo            |
| 19 | Steel Drums       | EFFECTS    | tri + triangolo con attack veloce + plate reverb            | caraibico, tropicale, intro luminoso     |
| 20 | Sync S&H          | SYNTH      | sync + S&H LFO sul filtro                                   | effetto "computer impazzito"             |
| 21 | String 3          | STRINGS    | archi più brillanti                                          | violini orchestrali, sezione                |
| 22 | Brass 3           | BRASS      | brass corti per stab                                         | stab funk, riff brass                    |
| 23 | Octave Syn        | SYNTH      | due OSC a un'ottava di distanza                              | basso ottavato, lead rotondo             |
| 24 | Organ 3           | ORGAN/MONO | organo "draw bar" 1+4'                                       | organo soul, blues                       |
| 25 | Take-Off          | EFFECTS    | SAW LFO su pitch + filter = decollo aereo                   | SFX transitorio                          |
| 26 | Butterflies       | EFFECTS    | LFO veloce + filtro stretto = farfalle elettroniche          | atmosfera magica, transizione            |
| 27 | Clav 1            | KB         | pulse stretto + filter env percussivo = clavinet           | funk Stevie Wonder vibe                  |
| 28 | Sync 3            | SYNTH      | sync brillante con coda                                      | lead synth-pop                           |
| 29 | Clav 2            | KB         | variante più scura del Clav 1                               | reggae bass-clav                         |
| 30 | Poly Glide        | SYNTH      | poly con glide attivo                                        | accordo che scivola                      |
| 31 | String 4          | STRINGS    | archi morbidi, attack lento                                  | pad film noir                            |
| 32 | Brass 4           | BRASS      | brass legato                                                  | melodie brass                            |
| 33 | Sizzle            | EFFECTS    | rumore + filter envelope = effetto sfrigolio                | SFX, hi-hat sintetico                    |
| 34 | Calliope          | STRINGS    | triangolari con attack medio                                 | giostra, fiera                           |
| 35 | Log Drum          | EFFECTS    | bassi corti pizzicati                                        | percussion tribale                       |
| 36 | Flutes            | STRINGS    | triangolari con piccolo noise                                | flauto sintetico                         |
| 37 | Clav Wah          | KB         | Clav + LFO sul filtro = wah-wah                              | funk wah-clav                            |
| 38 | Uncond Cont       | SYNTH      | dimostra UNCONDITIONAL contour                               | esempio didattico                        |
| 39 | Vibes             | EFFECTS    | bell con LFO vibrato                                          | vibrafono jazz                           |
| 40 | Sync Sweep 1      | SYNTH      | sync con filtro che si apre lentamente                       | assolo evolutivo                         |
| 41 | String 5          | STRINGS    | archi ricchi                                                  | pad full orchestra                       |
| 42 | Brass 5           | BRASS      | brass alti                                                    | fanfara                                  |
| 43 | Sync 4            | SYNTH      | sync con detune più ampio                                    | lead progressive rock                    |
| 44 | Organ 5           | ORGAN/MONO | organo rock                                                   | rock blues                                |
| 45 | Sirens            | EFFECTS    | LFO lento + S&H = sirena                                     | SFX urgenza, intro thriller              |
| 46 | Sync Sweep 2      | SYNTH      | sync sweep con filtro chiuso                                 | basso assolo                              |
| 47 | Celeste           | KB         | bell soft + reverb                                            | celesta da carillon                       |
| 48 | Sync Sweep 3      | SYNTH      | sync sweep medium                                             | lead lirico                                |
| 49 | Harpsichord 1     | KB         | pulse stretto + attack rapido = clavicembalo                | barocco, Bach                             |
| 50 | Wind Chimes       | EFFECTS    | bell random + reverb lungo                                    | atmosfera meditativa                      |
| 51 | String 6          | STRINGS    | archi sostenuti morbidi                                       | adagio                                    |
| 52 | Brass 6           | BRASS      | brass progressivi                                              | tema epico                                |
| 53 | Double Reed       | STRINGS    | triangolari + piccolo noise = oboe/clarinetto                | woodwind                                  |
| 54 | Mono 1            | ORGAN/MONO | mono con saw stack + filter env                              | basso funk, lead house                    |
| 55 | UFO               | EFFECTS    | LFO + filter resonance alto                                   | SFX sci-fi                                |
| 56 | Chorus Syn        | STRINGS    | string con chorus pronunciato                                  | pad anni '80                              |
| 57 | Clav 3            | KB         | clav con tone più caldo                                       | funk old-school                           |
| 58 | Echo Whistle      | EFFECTS    | triangolare + delay = fischio echo                            | SFX cartoon                               |
| 59 | E Piano 2         | KB         | piano elettrico con più tine                                  | ballad, soul                              |
| 60 | FM 1              | SYNTH      | due OSC che si modulano (faux FM)                            | DX7-vibe                                  |
| 61 | String 7          | STRINGS    | archi più scuri                                               | basso strings                             |
| 62 | Brass 7           | BRASS      | brass con bite                                                | rock brass                                |
| 63 | Synth Organ       | ORGAN/MONO | organo elettronico chiaro                                     | pop-funk organ                            |
| 64 | Mono 2            | ORGAN/MONO | mono più filtrato                                              | basso wobble (vedi Ricetta 6)             |
| 65 | Sync Sweep 4      | SYNTH      | sync con range esteso                                          | lead intenso                              |
| 66 | Sq Waves 2        | SYNTH      | onde quadre pure                                              | lead 8-bit                                |
| 67 | Quint Hpscd       | KB         | clavicembalo + quinta                                          | barocco audace                            |
| 68 | Wind Chimes 2     | EFFECTS    | variante più scura del Wind Chimes                            | atmosfera notturna                        |
| 69 | E Piano 3         | KB         | piano elettrico brillante                                     | piano jazz                                |
| 70 | Bowed Octaves     | STRINGS    | string + ottava up                                            | violini stratosferici                     |
| 71 | String 8          | STRINGS    | archi compatti                                                | quartetto                                 |
| 72 | Brass 8           | BRASS      | brass sostenuti                                                | tema heroic                               |
| 73 | Release Voice     | SYNTH      | esempio didattico release                                      | n/a                                       |
| 74 | Mono 3            | ORGAN/MONO | mono brillante                                                 | lead funky                                |
| 75 | Q Filter Trill    | SYNTH      | filter trill con resonance                                     | tensione                                  |
| 76 | Q Osc Trill       | SYNTH      | osc trill                                                     | melodia drammatica                        |
| 77 | Accordion         | ORGAN/MONO | organo + tremolo                                              | folk, polka                                |
| 78 | Synth Plectrum    | KB         | pluck con noise                                               | basso pluck                                |
| 79 | Sync 5            | SYNTH      | sync extra-acuto                                              | scream finale                              |
| 80 | Synth Woodwind    | STRINGS    | triangolare + filtro chiuso                                   | woodwind sintetico                        |
| 81 | String 9          | STRINGS    | archi voluminosi                                              | orchestra                                  |
| 82 | Brass 9           | BRASS      | brass corti percussivi                                         | hit                                       |
| 83 | Surprise          | EFFECTS    | LFO con pattern erratico                                       | SFX comedy                                |
| 84 | Mono 4            | ORGAN/MONO | mono caldo                                                     | basso vintage                              |
| 85 | Drop Off          | EFFECTS    | filter envelope inverso = "tuffo" sonoro                       | SFX caduta                                 |
| 86 | Ring Mod          | EFFECTS    | sync + intervalli dissonanti                                   | suono campana metallica                    |
| 87 | Harpsichord 2     | KB         | clavicembalo variante                                          | barocco                                   |
| 88 | Synth Plec 2      | KB         | pluck variante                                                | bass-pluck                                 |
| 89 | Clav 4            | KB         | clav variante                                                  | funk                                       |
| 90 | Quint Synth       | SYNTH      | sintesi con quinta                                             | pad esotico                                |
| 91 | String 10         | STRINGS    | archi finali                                                  | gran finale d'archi                        |
| 92 | Brass 10          | BRASS      | brass finali                                                   | fanfare conclusive                         |
| 93 | Triangle Wv       | KB         | onda triangolare sola                                          | seno-like (puoi usarlo per layer)          |
| 94 | Mono 5            | ORGAN/MONO | mono finale                                                    | basso "killer"                             |
| 95 | Ring Mod 2        | EFFECTS    | ring mod variante                                              | dissonanze                                  |
| 96 | Dupe No. 75       | SYNTH      | copia di Filter Trill (intentional duplicate del 1982)         | esempio storico                            |
| 97 | Octave Syn 2      | SYNTH      | ottava synth variante                                          | lead potente                                |
| 98 | Synth Plec 2      | KB         | duplicato Synth Plec                                          | (slot di overflow)                          |
| 99 | Clav 5            | KB         | clav finale                                                    | funk                                       |

---

## Appendice B — Credits e riferimenti

### Bob Moog e Moog Music Inc.

Robert Arthur Moog (1934-2005) ha inventato il **filtro ladder a transistor** brevettato nel 1968, e ha co-fondato Moog Music Inc. Il Memorymoog Plus del 1982 è uno dei suoi strumenti più ambiziosi: il primo polifonico programmabile della linea. Moog, Memorymoog e il logo Moog sono marchi registrati di Moog Music Inc.

### I programmatori dei preset originali

Il manuale del Memorymoog del 1982 cita esplicitamente come autori dei 100 preset di fabbrica:

- **Wendy Carlos** — pionieira della musica elettronica, autrice di *Switched-On Bach* (1968).
- **Jan Hammer** — tastierista jazz fusion (Mahavishnu Orchestra, Miami Vice).
- **Don Airey** — tastierista rock (Rainbow, Deep Purple).
- **Tom Coster** — tastierista jazz fusion (Santana).
- **Larry Fast** — programmatore di Synergy, collaboratore di Peter Gabriel.
- **Herbert Deutsch** — co-inventore del Minimoog con Bob Moog.

I loro nomi compaiono in calce a vari preset originali. SIXinONE rispetta gli archetipi sonori che hanno definito, anche se le programmazioni non sono bit-perfette.

### Riferimenti tecnici

- **Antti Huovilainen** (2004) — "Non-linear digital implementation of the Moog ladder filter". È il modello matematico del nostro filtro: ladder a 4 stadi con saturazione tanh, 2× oversampling.
- **Vesa Välimäki & Antti Huovilainen** (2007) — "Antialiasing oscillators in subtractive synthesis". L'algoritmo PolyBLEP usato per generare l'onda quadra band-limitata.
- **AT&T Bell 202** (1976) — Specifica del modem 1200 baud FSK 1200/2200 Hz. Usata per la cassette audio.
- **IEEE 802.3 CRC-32** — Polynomial standard (0xEDB88320). Usato per integrità della cassette.

### Sviluppo

SIXinONE è sviluppato da [Alessandro Pezzali](https://pezzaliapp.it) in collaborazione con Claude (Anthropic) come parte della serie SIXinONE. Il sorgente è disponibile su [GitHub](https://github.com/pezzaliapp/SIXinONE).

---

## Appendice C — Versioni e changelog

| Versione | Data        | Highlights                                                                                  |
| -------- | ----------- | ------------------------------------------------------------------------------------------- |
| v1.0     | maggio 2026 | Sei voci, filtro Moog ladder AudioWorklet, 100 preset di fabbrica, sequencer 10-slot, PWA. |
| v2.0     | maggio 2026 | PWM oscillator con PolyBLEP, hard sync sample-accurato, MPE, FX bus (chorus + reverb + delay), mod wheel + sustain, MIDI clock IN/OUT. |
| v2.1     | maggio 2026 | Arpeggiatore 6-pattern.                                                                     |
| v2.2     | maggio 2026 | TransportClock condiviso + tap tempo.                                                       |
| v2.3     | maggio 2026 | 8 demo musicali integrate.                                                                  |
| v2.4     | maggio 2026 | Cassette audio FSK Bell 202 (easter egg) — `.wav` + live mic/speaker.                      |

Per il dettaglio commit-per-commit vedi il [git log su GitHub](https://github.com/pezzaliapp/SIXinONE/commits/main).

---

*Suona bene.*
