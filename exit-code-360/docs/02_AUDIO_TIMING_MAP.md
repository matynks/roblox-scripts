# EXIT CODE — Audio Timing Map (approved narration)

* Source: `ElevenLabs_Your_little_sister_tiptoes_up_behind_.mp3` — MP3, 44,100 Hz, mono, 192 kbps.
* Decoded duration: **439.722 s** (container header: 439.771 s; the extra 0.049 s is MP3 encoder padding).
* Frame rate: 30 fps → **13,192 frames** (439.733 s) for the full film, so the narration ends inside the final frame.
* Timing method: NeMo Parakeet-TDT 0.6B v2 (sherpa-onnx) on ≤12 s pause-aligned chunks, token timestamps → words → phrases; word ends refined with RMS energy; coverage check confirms **no voiced audio is left without a word**.
* Text is the ASR transcript, used here for timing only. Punctuation may differ from the approved script; items marked ⚠ should be checked against it.

## Sequence overview

| Seq | Time | Dur | Title | Environment | Visual plan |
|---|---|---|---|---|---|
| S01 |    0.08–  23.26 |  23.2s | Cold open: the untouchable walk | Seaside promenade, sunset (purple/pink) | Mia's failed cardboard-mask scare; pigeon dive and duck; cyclist dodge 'like a dancer'; Mia stares, 'How?' |
| S02 |   23.26–  29.34 |   6.1s | Seagull vs sandwich | Same promenade, closer two-shot | Gull dives from behind; Leo lifts sandwich without looking; offended gull leaves |
| S03 |   29.34–  43.34 |  14.0s | Field of view: 200° vs 360° | Navy infographic space (top-down heads) | Match transition from Leo's head to top-down diagram; 200° wedge, 160° blind zone, 360° sweep (HYPOTHETICAL) |
| S04 |   43.34–  59.10 |  15.8s | The rule: wider eyes, same brain | Navy infographic + thumb-at-arm's-length shot | Eye → brain diagram; foveal patch = thumb width; saccade dots (~3/s); brain 'stitching' tiles; 'see everything / look at one thing' |
| S05 |   59.10–  62.30 |   3.2s | Title card | Sunset sea title (gold type) | WHAT IF YOU HAD / 360° VISION? title with bloom, ring motif |
| S06 |   62.30–  73.72 |  11.4s | Perk 1: no surprise party | Night living room | Lights on, 40 people behind couch all 'spotted' with ring pings; 'Mate, you could at least pretend' |
| S07 |   73.72–  82.55 |   8.8s | Perk 2: pickpocket | Busy street, dusk | Hand slides to bag; Leo's rear-vision ping; thief apologises and runs |
| S08 |   82.55–  95.86 |  13.3s | Perk 3: driving lesson | Car interior / road, day-to-dusk | Blind-spot diagram vs Leo; instructor stares; 'Dude, you didn't even look once' |
| S09 |   95.86– 106.99 |  11.1s | Perk 4: dodgeball | School gym, warm windows | 12 balls from all angles, Leo facing the wall dodging; scoreboard; complaint letter |
| S10 |  106.99– 115.83 |   8.8s | Perk 5: basketball | Gym court | Top-down court with 9 vision lines; behind-the-back pass; coach drops clipboard |
| S11 |  115.83– 125.62 |   9.8s | Perk 6: football referee | Stadium pitch, floodlights | Referee blind zone vs Leo; foul / shove / dive spotted with flags |
| S12 |  125.62– 136.52 |  10.9s | Nature: prey animals | Meadow at dawn + line-art infographic | Horse and rabbit top-down FOV wedges (~350°); prey-animal label; 'Welcome to the club' |
| S13 |  136.52– 151.23 |  14.7s | The catch: nothing is background | Promenade/street; attention spotlight graphic | Attention cursor jumps: moth left, car right, flag behind; 'distracted by everything' |
| S14 |  151.23– 157.95 |   6.7s | Class: thirty faces | Classroom, warm windows | 30 faces each with glance/smirk/whisper pings around Leo |
| S15 |  157.95– 175.92 |  18.0s | Mr. Black's offer | Classroom doorway → corridor (cool light) | Mr. Black introduction; 'human security camera'; 40,000 / 1 / €10,000 figures; 'Just watch' |
| S16 |  175.92– 184.62 |   8.7s | The cost: a busier mind | Leo close-up + overload graphic | Buzzing signal clutter around head; 'amazing and overwhelming' |
| S17 |  184.62– 207.57 |  22.9s | Surprises and dopamine | Vignettes + navy science graphic | Gift / party / scare vignettes; prediction-error graph (reward vs prediction); spark never lights |
| S18 |  207.57– 212.77 |   5.2s | No off switch | Night, Leo's room | Eyes can't close the circle; transition to the night it 'costs far more' |
| S19 |  212.77– 242.60 |  29.8s | Mia's notebook | Night living room (lamp + moon) | Notebook: SCARES 0 / TRIES 412; 'Just once, Leo'; tired laugh; 'Are you okay?' |
| S20 |  242.60– 251.61 |   9.0s | Concert ticket | Same room | Ticket reveal, mask on; 'Watch your back, Leo… oh wait' |
| S21 |  251.61– 268.70 |  17.1s | Concert night: Gate Four | Stadium concert, night (stage lights) | 'Mia?' look; 40,000 crowd; earpiece crackle; GATE 4 framing |
| S22 |  268.70– 280.99 |  12.3s | The light fails | Rig above crowd | Shaking stage light; bolt snaps; eye-instant vs brain-late timeline (0.25 s) |
| S23 |  280.99– 286.19 |   5.2s | Mia under the light | Crowd close-up | Cardboard mask spotted directly underneath |
| S24 |  286.19– 302.28 |  16.1s | Physics: can you reach her? | Navy infographic | 8 m drop → ~1.25 s fall (free fall: √(2·8/9.81) ≈ 1.28 s), minus 0.25 s = 1 s; 15 m at 5 m/s = 3 s; NOT EVEN CLOSE |
| S25 |  302.28– 314.01 |  11.7s | The choice | Concert, slow motion | Gate 4 vs Mia split; 'You look at Mia'; scream; 40,000 heads turn |
| S26 |  314.01– 321.45 |   7.4s | The rescue | Concert | Freeze; stranger yanks her back; crash; silence |
| S27 |  321.45– 346.77 |  25.3s | Fired / the bolts | Concert rig | 'You're fired'; money gone; Leo points bolt after bolt (6 rings); engineers; show stops; applause |
| S28 |  346.77– 352.37 |   5.6s | I always look at you | Concert aftermath, warm work-lights | Mia hugging; 'How did you know?' / 'I always look at you' |
| S29 |  352.37– 379.09 |  26.7s | Epilogue: the scare lands | Sunset promenade (callback to S01) | New mask; Leo closes eyes; BOO; real jump; notebook SCARES 1 / TRIES 413; 'only look at her' |
| S30 |  379.09– 386.10 |   7.0s | Reality check | Navy infographic | REALITY CHECK card; no human sees 360°; limit is real |
| S31 |  386.10– 398.99 |  12.9s | Invisible gorilla study | Navy infographic + gym line art | Simons & Chabris 1999: count passes; ~50% miss gorilla; SEEING ≠ NOTICING |
| S32 |  398.99– 414.34 |  15.3s | Fact vs fiction | Navy infographic | Dopamine real; overload/surprises fiction; brain ≈ 1/5 of body energy ring |
| S33 |  414.34– 427.49 |  13.2s | Cliffhanger | Leo's room, night, phone glow | Phone buzzes: UNKNOWN NUMBER — 'We saw what you did…', 'You're not the only one.' |
| S34 |  427.49– 439.72 |  12.2s | Outro / CTA | Sunset sea, characters line-up | Question to audience; comment / like / subscribe; EXIT CODE end card |

## Phrase-level map

Columns: phrase ID, start/end in seconds (narration time, 0 = first sample), duration, words, sequence.
The per-phrase visual / character / camera / SFX / transition columns are filled in **for the POC window** in `docs/04_POC_SHOT_BREAKDOWN.md`, and will be filled for every sequence in full production after the style is approved.

### S01 — Cold open: the untouchable walk

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P001 | 0.08 | 2.23 | 2.15 | Your little sister tiptoes up behind you, |
| P002 | 2.48 | 3.66 | 1.18 | cardboard mask on, |
| P003 | 3.92 | 4.80 | 0.88 | arms raised, |
| P004 | 5.04 | 5.46 | 0.42 | ready. |
| P005 | 5.84 | 7.10 | 1.26 | You don't even turn around. |
| P006 | 7.36 | 9.30 | 1.94 | Hi, Mia she groans. |
| P007 | 9.76 | 11.43 | 1.67 | A pigeon dives at your head, |
| P008 | 11.83 | 12.27 | 0.44 | you duck, |
| P009 | 12.63 | 13.43 | 0.80 | without looking. |
| P010 | 13.91 | 16.06 | 2.15 | A cyclist rings his bell from behind. |
| P011 | 16.39 | 17.33 | 0.94 | You step aside, |
| P012 | 17.75 | 18.68 | 0.93 | like a dancer. |
| P013 | 19.19 | 20.63 | 1.44 | Mia stares. |
| P014 | 20.63 | 21.00 | 0.37 | How |
| P015 | 21.59 | 22.66 | 1.07 | how did you do that? |

### S02 — Seagull vs sandwich

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P016 | 23.26 | 25.36 | 2.10 | Then a seagull swoops for your sandwich. |
| P017 | 25.66 | 26.61 | 0.95 | You hold it high. |
| P018 | 26.86 | 28.02 | 1.16 | The sea gull leaves, ⚠ |
| P019 | 28.22 | 28.82 | 0.60 | offended. |

### S03 — Field of view: 200° vs 360°

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P020 | 29.34 | 31.93 | 2.59 | A normal human sees about two hundred degrees, |
| P021 | 32.30 | 33.11 | 0.81 | everything ahead, |
| P022 | 33.42 | 34.62 | 1.20 | and a little to each side. |
| P023 | 35.26 | 35.79 | 0.53 | Behind you? |
| P024 | 36.54 | 36.96 | 0.42 | Nothing. |
| P025 | 37.42 | 37.75 | 0.33 | You? |
| P026 | 38.22 | 39.38 | 1.16 | Three hundred and sixty. |
| P027 | 39.74 | 40.66 | 0.92 | The whole circle. |
| P028 | 41.02 | 41.92 | 0.90 | No blindside. |
| P029 | 42.22 | 42.81 | 0.59 | No back. |

### S04 — The rule: wider eyes, same brain

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P030 | 43.34 | 44.01 | 0.67 | Here's the rule. |
| P031 | 44.30 | 45.34 | 1.04 | Your eyes got wider. |
| P032 | 45.58 | 46.61 | 1.03 | Your brain did not. |
| P033 | 47.14 | 48.52 | 1.38 | Hold up a thumb at arm's length. |
| P034 | 48.98 | 50.89 | 1.91 | Only that patch is truly sharp. |
| P035 | 51.38 | 53.59 | 2.21 | Your eyes jump about three times a second. |
| P036 | 53.94 | 55.42 | 1.48 | Your brain stitches the rest. |
| P037 | 55.86 | 56.90 | 1.04 | You can see everything. |
| P038 | 57.26 | 58.63 | 1.37 | but you can only look at one thing. |

### S05 — Title card

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P039 | 59.10 | 61.67 | 2.57 | So what if you had three hundred and sixty degree vision? |

### S06 — Perk 1: no surprise party

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P040 | 62.30 | 62.76 | 0.46 | Plus, |
| P041 | 63.10 | 64.45 | 1.35 | nobody sneaks up on you |
| P042 | 64.94 | 65.30 | 0.36 | ever. |
| P043 | 65.82 | 67.38 | 1.56 | Your surprise party is ruined. |
| P044 | 67.88 | 69.61 | 1.73 | Forty people hide behind the couch, |
| P045 | 69.96 | 70.82 | 0.86 | all spotted. |
| P046 | 71.32 | 71.76 | 0.44 | Mate, |
| P047 | 72.20 | 73.35 | 1.15 | you could at least pretend. |

### S07 — Perk 2: pickpocket

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P048 | 73.72 | 74.92 | 1.20 | Pickpockets are doomed. |
| P049 | 75.32 | 77.00 | 1.68 | A hand slips toward your bag. |
| P050 | 77.40 | 77.96 | 0.56 | You see it, |
| P051 | 78.28 | 79.31 | 1.03 | before it arrives. |
| P052 | 79.75 | 81.01 | 1.26 | The thief apologizes, |
| P053 | 81.35 | 82.04 | 0.69 | then runs. |

### S08 — Perk 3: driving lesson

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P054 | 82.55 | 83.63 | 1.08 | Driving lessons. |
| P055 | 84.07 | 87.35 | 3.28 | Normal drivers turn their heads to check blind spots. |
| P056 | 87.35 | 87.71 | 0.36 | You |
| P057 | 88.31 | 88.74 | 0.43 | never |
| P058 | 89.43 | 91.24 | 1.81 | The instructor stares in silence. |
| P059 | 91.86 | 92.36 | 0.50 | Dude |
| P060 | 92.82 | 94.18 | 1.36 | You didn't even look once |
| P061 | 94.82 | 95.41 | 0.59 | No need. |

### S09 — Perk 4: dodgeball

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P062 | 95.86 | 96.52 | 0.66 | Dodge ball. ⚠ |
| P063 | 96.98 | 98.58 | 1.60 | Twelve balls from every angle. |
| P064 | 98.98 | 99.84 | 0.86 | You dodge them all, |
| P065 | 100.18 | 101.02 | 0.84 | facing the wall. |
| P066 | 101.46 | 102.86 | 1.40 | Game over in four minutes. |
| P067 | 103.39 | 104.34 | 0.95 | Teammates cheer. |
| P068 | 104.75 | 106.40 | 1.65 | The other team is writing a complaint. |

### S10 — Perk 5: basketball

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P069 | 106.99 | 107.77 | 0.78 | Basketball. |
| P070 | 108.11 | 109.41 | 1.30 | Ten players on the court. |
| P071 | 109.79 | 111.20 | 1.41 | You see the other nine at once. |
| P072 | 111.47 | 112.79 | 1.32 | A behind the back pass. |
| P073 | 113.07 | 113.63 | 0.56 | Perfect. |
| P074 | 113.99 | 115.40 | 1.41 | The coach drops his clipboard. |

### S11 — Perk 6: football referee

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P075 | 115.83 | 116.69 | 0.86 | Football next. |
| P076 | 117.11 | 118.62 | 1.51 | Twenty two players on the pitch. |
| P077 | 119.03 | 120.69 | 1.66 | A referee can't see behind him. |
| P078 | 121.03 | 121.57 | 0.54 | You can. |
| P079 | 121.99 | 122.77 | 0.78 | Every foul, |
| P080 | 123.11 | 123.88 | 0.77 | every shove, |
| P081 | 124.23 | 125.06 | 0.83 | every dive. |

### S12 — Nature: prey animals

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P082 | 125.62 | 127.33 | 1.71 | Nature already tried this once. |
| P083 | 127.70 | 129.71 | 2.01 | Horses see almost all the way around. |
| P084 | 130.18 | 131.09 | 0.91 | So do rabbits. |
| P085 | 131.38 | 132.69 | 1.31 | They're both prey animals. |
| P086 | 132.98 | 134.40 | 1.42 | Danger can come from anywhere. |
| P087 | 134.90 | 135.97 | 1.07 | Welcome to the club. |

### S13 — The catch: nothing is background

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P088 | 136.52 | 137.14 | 0.62 | The catch? |
| P089 | 137.64 | 138.84 | 1.20 | Nothing is background. |
| P090 | 139.24 | 140.61 | 1.37 | A moth flutters left. |
| P091 | 140.92 | 142.01 | 1.09 | Attention jumps. |
| P092 | 142.28 | 143.48 | 1.20 | A car honks right. |
| P093 | 143.88 | 144.34 | 0.46 | Jump. |
| P094 | 144.76 | 146.18 | 1.42 | A flag flaps behind. |
| P095 | 146.68 | 147.11 | 0.43 | Jump. |
| P096 | 147.79 | 150.70 | 2.91 | Seeing everything means getting distracted by everything |

### S14 — Class: thirty faces

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P097 | 151.23 | 153.04 | 1.81 | in class thirty faces |
| P098 | 153.47 | 154.37 | 0.90 | every glance, |
| P099 | 154.67 | 155.53 | 0.86 | every smirk, |
| P100 | 155.95 | 157.47 | 1.52 | every whisper behind a hand, |

### S15 — Mr. Black's offer

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P101 | 157.95 | 159.89 | 1.94 | Then a man in a gray suit finds you. |
| P102 | 160.35 | 161.17 | 0.82 | mister Black. ⚠ |
| P103 | 161.63 | 162.40 | 0.77 | He smiles. |
| P104 | 162.91 | 164.61 | 1.70 | We need a human security camera. |
| P105 | 165.31 | 166.62 | 1.31 | Forty thousand fans, |
| P106 | 166.91 | 167.71 | 0.80 | one concert, |
| P107 | 167.95 | 169.21 | 1.26 | ten thousand Euros. |
| P108 | 169.68 | 170.34 | 0.66 | Just watch. |
| P109 | 171.04 | 172.38 | 1.34 | Just watch? |
| P110 | 173.12 | 173.84 | 0.72 | Just watch. |
| P111 | 174.16 | 175.43 | 1.27 | And never leave your post. |

### S16 — The cost: a busier mind

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P112 | 175.92 | 176.84 | 0.92 | But there's a cost. |
| P113 | 177.28 | 179.30 | 2.02 | A busier picture means a busier mind. |
| P114 | 179.76 | 180.46 | 0.70 | By noon, |
| P115 | 180.78 | 181.72 | 0.94 | your head is buzzing, |
| P116 | 182.22 | 184.24 | 2.02 | amazing and overwhelming, |

### S17 — Surprises and dopamine

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P117 | 184.62 | 186.46 | 1.84 | and sneaky surprises are ruined, |
| P118 | 186.86 | 188.15 | 1.29 | the gift behind a back, |
| P119 | 188.62 | 190.07 | 1.45 | the party behind a couch, |
| P120 | 190.46 | 191.72 | 1.26 | the scare from behind, |
| P121 | 192.33 | 194.52 | 2.19 | Ever wonder why surprises feel so good? |
| P122 | 195.13 | 198.82 | 3.69 | Dopamine cells fire hardest when life beats the prediction. |
| P123 | 199.37 | 200.64 | 1.27 | You can't predict everything, |
| P124 | 200.97 | 202.12 | 1.15 | but you see these coming. |
| P125 | 202.61 | 203.97 | 1.36 | so the spark never lights |
| P126 | 204.37 | 205.71 | 1.34 | you smile a second late, |
| P127 | 206.13 | 206.93 | 0.80 | or not at all. |

### S18 — No off switch

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P128 | 207.57 | 208.09 | 0.52 | Worse, |
| P129 | 208.29 | 209.42 | 1.13 | there's no off switch. |
| P130 | 209.89 | 212.25 | 2.36 | And one night it costs far more. |

### S19 — Mia's notebook

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P131 | 212.77 | 213.80 | 1.03 | Mia notices. |
| P132 | 214.27 | 215.06 | 0.79 | Of course she does. |
| P133 | 215.63 | 216.11 | 0.48 | She |
| P134 | 217.79 | 218.86 | 1.07 | keeps a little note book. ⚠ |
| P135 | 219.55 | 220.23 | 0.68 | Scares |
| P136 | 220.75 | 221.24 | 0.49 | zero. |
| P137 | 221.95 | 222.63 | 0.68 | Tries |
| P138 | 223.23 | 224.61 | 1.38 | four hundred and twelve. |
| P139 | 225.25 | 226.10 | 0.85 | She holds it up, |
| P140 | 226.29 | 226.79 | 0.50 | hopeful. |
| P141 | 227.41 | 228.51 | 1.10 | Just once, Leo. |
| P142 | 228.85 | 230.05 | 1.20 | Let me win once. |
| P143 | 230.53 | 231.89 | 1.36 | You never mean to ruin it. |
| P144 | 231.89 | 232.20 | 0.31 | You just |
| P145 | 232.85 | 233.75 | 0.90 | always see her. |
| P146 | 234.29 | 234.85 | 0.56 | You laugh. |
| P147 | 235.33 | 236.34 | 1.01 | The tired laugh. |
| P148 | 236.76 | 237.44 | 0.68 | not the real one. |
| P149 | 237.88 | 238.89 | 1.01 | She hears the difference. |
| P150 | 239.48 | 240.25 | 0.77 | Are you okay? |
| P151 | 240.84 | 242.02 | 1.18 | Just tired, you say. |

### S20 — Concert ticket

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P152 | 242.60 | 243.64 | 1.04 | She grins anyway. |
| P153 | 244.12 | 245.16 | 1.04 | Tomorrow's concert. |
| P154 | 245.48 | 246.29 | 0.81 | I got a ticket. |
| P155 | 246.68 | 247.41 | 0.73 | Mask on. |
| P156 | 247.85 | 248.88 | 1.03 | Watch your back, Leo. |
| P157 | 249.69 | 250.10 | 0.41 | Oh |
| P158 | 250.49 | 250.90 | 0.41 | wait. |

### S21 — Concert night: Gate Four

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P159 | 251.61 | 252.96 | 1.35 | Everyone else you just see. |
| P160 | 253.37 | 253.87 | 0.50 | Mia? |
| P161 | 254.49 | 254.99 | 0.50 | You look. |
| P162 | 255.61 | 256.34 | 0.73 | The concert. |
| P163 | 256.73 | 257.92 | 1.19 | Forty thousand people. |
| P164 | 258.51 | 260.76 | 2.25 | mister Black's voice crackles in your earpiece. ⚠ |
| P165 | 261.23 | 262.23 | 1.00 | Watch Gate Four. |
| P166 | 262.67 | 263.68 | 1.01 | Only Gate Four. |
| P167 | 264.19 | 264.82 | 0.63 | Look away, |
| P168 | 265.15 | 266.16 | 1.01 | and the deal is over. |
| P169 | 266.75 | 268.19 | 1.44 | So you stare at Gate Four. |

### S22 — The light fails

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P170 | 268.70 | 270.16 | 1.46 | Behind you metal groans. |
| P171 | 270.46 | 271.62 | 1.16 | High above the crowd, |
| P172 | 271.82 | 273.12 | 1.30 | a stage light shakes. |
| P173 | 273.42 | 274.54 | 1.12 | A bolt snaps. |
| P174 | 274.94 | 276.28 | 1.34 | Your eyes see it instantly. |
| P175 | 276.62 | 277.28 | 0.66 | Your brain? |
| P176 | 277.66 | 278.80 | 1.14 | A quarter second late. |
| P177 | 279.31 | 280.46 | 1.15 | Noticing takes time. |

### S23 — Mia under the light

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P178 | 280.99 | 281.86 | 0.87 | Then you see her |
| P179 | 282.27 | 284.59 | 2.32 | a cardboard mask, right underneath. |
| P180 | 285.23 | 285.69 | 0.46 | Mia. |

### S24 — Physics: can you reach her?

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P181 | 286.19 | 288.06 | 1.87 | The light hangs eight metres up. |
| P182 | 288.43 | 290.60 | 2.17 | It falls in about one and a quarter seconds. |
| P183 | 291.09 | 292.13 | 1.04 | Take away your quarter. |
| P184 | 292.61 | 293.64 | 1.03 | One second left. |
| P185 | 294.05 | 295.78 | 1.73 | Mia is fifteen meters away. |
| P186 | 296.21 | 298.00 | 1.79 | You run five meters per second. |
| P187 | 298.45 | 299.22 | 0.77 | Three seconds. |
| P188 | 299.57 | 300.39 | 0.82 | Can you reach her? |
| P189 | 300.85 | 301.79 | 0.94 | Not even close. |

### S25 — The choice

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P190 | 302.28 | 303.21 | 0.93 | You can see everything, |
| P191 | 303.48 | 305.03 | 1.55 | but you can only look at one thing |
| P192 | 305.48 | 307.14 | 1.66 | Gate Four or Mia? |
| P193 | 307.64 | 308.46 | 0.82 | You look at Mia, |
| P194 | 308.76 | 309.90 | 1.14 | you scream her name |
| P195 | 310.28 | 310.76 | 0.48 | Mia |
| P196 | 311.24 | 311.57 | 0.33 | Up |
| P197 | 312.12 | 313.64 | 1.52 | Forty thousand heads turn, |

### S26 — The rescue

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P198 | 314.01 | 314.70 | 0.69 | She looks up, |
| P199 | 315.05 | 315.68 | 0.63 | freezes. |
| P200 | 316.01 | 317.52 | 1.51 | A stranger yanks her back. |
| P201 | 317.93 | 320.25 | 2.32 | The light crashes where she stood. |
| P202 | 320.25 | 320.87 | 0.62 | Silence. |

### S27 — Fired / the bolts

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P203 | 321.45 | 323.57 | 2.12 | mister Black snarls through the earpiece. ⚠ |
| P204 | 324.09 | 324.87 | 0.78 | You're fired. |
| P205 | 325.37 | 325.82 | 0.45 | The money? |
| P206 | 326.41 | 326.81 | 0.40 | Gone. |
| P207 | 327.53 | 328.74 | 1.21 | Silence would be easy. |
| P208 | 329.21 | 329.78 | 0.57 | Instead, |
| P209 | 330.09 | 330.69 | 0.60 | you point. |
| P210 | 331.13 | 332.40 | 1.27 | Bolt after bolt. |
| P211 | 332.97 | 333.64 | 0.67 | Six more, |
| P212 | 333.93 | 335.02 | 1.09 | loose across the rig. |
| P213 | 335.45 | 336.64 | 1.19 | Engineers climb up. |
| P214 | 337.25 | 338.86 | 1.61 | every one is loose. |
| P215 | 339.33 | 340.29 | 0.96 | The show stops. |
| P216 | 340.69 | 341.99 | 1.30 | Nobody else gets hurt. |
| P217 | 342.37 | 343.76 | 1.39 | The whole crowd claps. |
| P218 | 344.13 | 346.10 | 1.97 | For the kid with eyes in the back of his head. |

### S28 — I always look at you

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P219 | 346.77 | 348.20 | 1.43 | Mia clings to your jacket. |
| P220 | 348.77 | 349.53 | 0.76 | How did you know? |
| P221 | 350.05 | 351.74 | 1.69 | I always look at you, you say. |

### S29 — Epilogue: the scare lands

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P222 | 352.37 | 353.12 | 0.75 | Weeks later, |
| P223 | 353.33 | 354.94 | 1.61 | Mia tiptoes up behind you, |
| P224 | 355.33 | 356.62 | 1.29 | a brand new mask. |
| P225 | 357.01 | 358.08 | 1.07 | You close your eyes. |
| P226 | 358.53 | 359.02 | 0.49 | Boo |
| P227 | 359.57 | 360.18 | 0.61 | You jump. |
| P228 | 360.71 | 361.46 | 0.75 | Really jump, |
| P229 | 361.83 | 362.86 | 1.03 | a real scream. |
| P230 | 363.35 | 364.22 | 0.87 | Then you laugh, |
| P231 | 364.63 | 365.49 | 0.86 | right on time. |
| P232 | 365.99 | 367.73 | 1.74 | The spark finally lights up. |
| P233 | 368.31 | 369.16 | 0.85 | In her notebook, |
| P234 | 369.59 | 370.19 | 0.60 | Scares, |
| P235 | 370.63 | 370.98 | 0.35 | one, |
| P236 | 371.65 | 372.22 | 0.57 | Tries |
| P237 | 372.69 | 374.02 | 1.33 | four hundred and thirteen. |
| P238 | 374.61 | 375.65 | 1.04 | You open your eyes. |
| P239 | 376.13 | 377.06 | 0.93 | You can see everything, |
| P240 | 377.41 | 378.48 | 1.07 | but you only look at her. |

### S30 — Reality check

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P241 | 379.09 | 380.12 | 1.03 | Is any of this real? |
| P242 | 380.69 | 381.47 | 0.78 | Not the power. |
| P243 | 382.02 | 383.72 | 1.70 | no human sees the full circle, |
| P244 | 384.18 | 385.35 | 1.17 | but the limit is real. |

### S31 — Invisible gorilla study

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P245 | 386.10 | 387.42 | 1.32 | In 1999, |
| P246 | 387.70 | 392.39 | 4.69 | Daniel Simons and Christopher Chabris asked volunteers to count basketball passes. |
| P247 | 392.99 | 396.28 | 3.29 | About half never noticed a person in a gorilla suit walking through. |
| P248 | 396.99 | 398.45 | 1.46 | Seeing isn't noticing. |

### S32 — Fact vs fiction

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P249 | 398.99 | 400.99 | 2.00 | The dopamine spark is real, too. |
| P250 | 401.55 | 404.13 | 2.58 | The overload and the spoiled surprises are fiction. |
| P251 | 404.67 | 407.24 | 2.57 | Your brain uses about a fifth of your body's energy. |
| P252 | 407.79 | 409.70 | 1.91 | Thinking harder barely changes that. |
| P253 | 410.19 | 412.12 | 1.93 | Extra vision wouldn't make you starving, |
| P254 | 412.35 | 413.70 | 1.35 | or let you predict everything. |

### S33 — Cliffhanger

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P255 | 414.34 | 416.79 | 2.45 | So could a mind ever watch everything at once? |
| P256 | 417.62 | 419.48 | 1.86 | That night your phone buzzes. |
| P257 | 420.10 | 421.02 | 0.92 | Unknown number. |
| P258 | 421.78 | 423.33 | 1.55 | We saw what you did at the concert. |
| P259 | 424.02 | 425.12 | 1.10 | Then a second message |
| P260 | 425.73 | 426.75 | 1.02 | You're not the only one. |

### S34 — Outro / CTA

| ID | Start | End | Dur | Narration |
|---|---:|---:|---:|---|
| P261 | 427.49 | 430.30 | 2.81 | So what would you do with three hundred and sixty degree vision? |
| P262 | 430.93 | 433.79 | 2.86 | Tell us the sneakiest prank you'd spot coming in the comments. |
| P263 | 434.53 | 435.95 | 1.42 | And if you'd look at Mia too, |
| P264 | 436.45 | 437.07 | 0.62 | hit like. |
| P265 | 437.26 | 439.06 | 1.80 | and subscribe for more what ifs. |

⚠ = ASR spelling to normalise in captions (Mr. Black, seagull, dodgeball, notebook).
