# Script audit — What If Humans Never Needed Sleep? · script v3

Computed by `tools/script_audit.py` from `script_v3.json`, the [claim ledger](../docs/02_CLAIM_LEDGER.md), the [research sources](../docs/01_RESEARCH.md) and the [Story Lock](../docs/04_STORY_LOCK.md). Nothing here is estimated by hand. The checker first passes its own 29 known-answer tests.

## Result

* **Errors (fail): 0** — every check passed.
* **Warnings (review): 7**
  * ⚠️ chapter 2: +14.4 % — within 2 points of the ±15 % limit
  * ⚠️ chapter 4: +14.2 % — within 2 points of the ±15 % limit
  * ⚠️ script metric: Average words per sentence = 6.25 (target 4–5 (flag above 5.5))
  * ⚠️ script metric: Sentences of 4 words or fewer = 39.0 % (target 45–55 %)
  * ⚠️ script metric: you / your per 100 words = 3.6 (target ~5–8 (documentary chapters lower))
  * ⚠️ 2.2 sentence 18: 19 words — check breath and delivery → “In one study, people sleeping six hours or less… had about four times the odds of catching a cold.”
  * ⚠️ 4.4 sentence 67: 23 words — check breath and delivery → “In twenty sixteen, RAND estimated that lack of sleep cost the US economy… up to four hundred and eleven billion dollars a year.”

**Totals:** 172 sentences · 1075 spoken words (1028 narration, 47 dialogue) · planned runtime 7:56.6 · 62 beats · paste text 6,307 characters (also split into 2 parts under 5,000).

---

## 1 · Sentence-level script audit

### Script metrics (reference engine targets, Production Standard §6)

| Metric | This script | Narration only | Target | Video #1 | Result |
|---|---|---|---|---|---|
| Average words per sentence | 6.25 | 6.51 | 4–5 (flag above 5.5) | 5.4 | ⚠️ off target |
| Sentences of 4 words or fewer | 39.0 % | 35.4 % | 45–55 % | 49.5 % | ⚠️ off target |
| Questions | 16 | 15 | ~14–20 | 18 | ✅ |
| Ellipses (pause cues) | 18 | 18 | ~12–24 | n/a | ✅ |
| you / your per 100 words | 3.6 | 3.7 | ~5–8 (documentary chapters lower) | 7.9 | ⚠️ off target |
| Words | 1075 | 1028 | ≈ 1,050 for 7:30 | 1,036 | ✅ |
| Sentences | 172 | 158 | — | — | — |

**Compared with v2:** words 1082 → 1075 · sentences 174 → 172 · avg 6.22 → 6.25 · short_pct 39.08 → 38.95 · questions 16 → 16 · ellipses 18 → 18 · you_per100 3.70 → 3.63 · runtime 7:58.1 → 7:56.6

**By chapter:**

| Ch | Sentences | Words | Avg words | ≤ 4 words | Questions | Ellipses | you/your per 100 |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 87 | 6.2 | 50 % | 1 | 2 | 2.3 |
| 2 | 22 | 157 | 7.1 | 23 % | 4 | 2 | 4.5 |
| 3 | 20 | 117 | 5.8 | 35 % | 2 | 1 | 6.8 |
| 4 | 27 | 169 | 6.3 | 44 % | 3 | 3 | 1.8 |
| 5 | 26 | 162 | 6.2 | 38 % | 1 | 2 | 1.2 |
| 6 | 26 | 150 | 5.8 | 50 % | 2 | 2 | 6.0 |
| 7 | 21 | 133 | 6.3 | 24 % | 2 | 4 | 2.3 |
| 8 | 16 | 100 | 6.2 | 50 % | 1 | 2 | 5.0 |

### Every sentence

Role = what the sentence does for the story (every sentence must have one).

| # | Beat | Speaker | Sentence | Words | Role | Claims | Class |
|---|---|---|---|---|---|---|---|
| 1 | 1.1 | NARRATOR | It's three a.m. — and the playground is full. | 8 | HOOK | HR1 · SP-07 | speculative |
| 2 | 1.3 | NARRATOR | The schools are open. | 4 | HOOK | SP-07 | speculative |
| 3 | 1.3 | NARRATOR | Traffic's jammed. | 2 | HOOK | SP-15 | speculative |
| 4 | 1.3 | NARRATOR | And nobody here has slept… in ten years. | 8 | PREMISE | HR1 | hypothetical |
| 5 | 1.4 | NARRATOR | Tonight, almost everyone on Earth will lie down in the dark and sleep. | 13 | FACT | A01 | established |
| 6 | 1.4 | NARRATOR | About a third of your life. | 6 | FACT | A01 | established |
| 7 | 1.4 | NARRATOR | More than twenty years. | 4 | FACT | CALC-01 | established |
| 8 | 1.5 | NARRATOR | So what if you never needed to sleep again? | 9 | QUESTION | HR1 | hypothetical |
| 9 | 1.5 | NARRATOR | Not tired. | 2 | RULE | HR2 | hypothetical |
| 10 | 1.5 | NARRATOR | No harm done. | 3 | RULE | HR3 | hypothetical |
| 11 | 1.5 | NARRATOR | Just… awake. | 2 | RULE | HR1 | hypothetical |
| 12 | 1.6 | NARRATOR | This is the first twenty-four hours. | 6 | PROMISE | FRAME | frame |
| 13 | 1.6 | NARRATOR | The next ten years. | 4 | PROMISE | FRAME | frame |
| 14 | 1.6 | NARRATOR | And why, in this world, a whole generation of kids has never had a single dream. | 16 | PROMISE | HR5 | hypothetical |
| 15 | 2.1 | MUM | Goodnight, you two. | 3 | SETUP | STORY | story |
| 16 | 2.1 | NARRATOR | First, what does sleep actually do? | 6 | QUESTION | FRAME | frame |
| 17 | 2.2 | NARRATOR | Studies suggest it helps lock in what you learned. | 9 | EVIDENCE | C01 | research |
| 18 | 2.2 | NARRATOR | In one study, people sleeping six hours or less… had about four times the odds of catching a cold. | 19 | EVIDENCE | C03 | research |
| 19 | 2.2 | NARRATOR | In another, after six short nights, young men handled blood sugar worse. | 12 | EVIDENCE | C05 | research |
| 20 | 2.3 | NARRATOR | Some of it, nobody fully understands. | 6 | UNKNOWN | D01 | unknown |
| 21 | 2.3 | NARRATOR | What's REM sleep for? | 4 | QUESTION | D02 | unknown |
| 22 | 2.3 | NARRATOR | Does sleep really clean the brain? | 6 | QUESTION | D04 | unknown |
| 23 | 2.4 | NARRATOR | But two systems decide when you get sleepy. | 8 | FACT | B01 | established |
| 24 | 2.4 | NARRATOR | An hourglass — pressure that builds while you're awake. | 8 | FACT | B01 | established |
| 25 | 2.4 | NARRATOR | Caffeine blocks adenosine receptors, so the hourglass feels emptier than it is. | 12 | FACT | B03 · B01 | established |
| 26 | 2.4 | NARRATOR | And a body clock, reset every day, mainly by light. | 10 | FACT | B05 | established |
| 27 | 2.5 | NARRATOR | A breakthrough would have to stop the hourglass. | 8 | RULE | HR2 | hypothetical |
| 28 | 2.5 | NARRATOR | And do all of sleep's work while you're awake. | 9 | RULE | HR3 | hypothetical |
| 29 | 2.5 | NARRATOR | Even the parts we don't understand. | 6 | UNKNOWN | HR3 · D01 | unknown |
| 30 | 2.5 | NARRATOR | How? | 1 | QUESTION | HR8 | hypothetical |
| 31 | 2.5 | NARRATOR | That's the thought experiment. | 4 | RULE | HR8 | hypothetical |
| 32 | 2.6 | NARRATOR | In this world, you're never tired. | 6 | RULE | HR2 | hypothetical |
| 33 | 2.6 | NARRATOR | Going without sleep never hurts. | 5 | RULE | HR3 | hypothetical |
| 34 | 2.6 | NARRATOR | Your body clock keeps ticking. | 5 | RULE | HR4 | hypothetical |
| 35 | 2.6 | NARRATOR | And with no sleep… the dreams go too. | 8 | RULE | HR5 | hypothetical |
| 36 | 2.6 | NARRATOR | Daydreams stay. | 2 | RULE | HR5 · HR7 | hypothetical |
| 37 | 3.1 | MIA | Look — it's us, on the hill! | 6 | DIALOGUE | STORY | story |
| 38 | 3.1 | MIA | Can we go? | 3 | DIALOGUE | STORY | story |
| 39 | 3.1 | LEO | Sure. | 1 | DIALOGUE | STORY | story |
| 40 | 3.1 | LEO | When I have time. | 4 | SETUP | STORY | story |
| 41 | 3.2 | NARRATOR | That night, nobody gets tired. | 5 | RULE | HR2 | hypothetical |
| 42 | 3.2 | NARRATOR | Not you. | 2 | RULE | HR2 | hypothetical |
| 43 | 3.2 | NARRATOR | Not Mum. | 2 | RULE | HR2 | hypothetical |
| 44 | 3.2 | NARRATOR | Not anyone. | 2 | RULE | HR2 | hypothetical |
| 45 | 3.3 | NARRATOR | So what do you do with eight extra hours? | 9 | QUESTION | CALC-02 | hypothetical |
| 46 | 3.3 | NARRATOR | By one a.m., the city is training, gaming, painting, studying. | 10 | CONSEQUENCE | SP-22 | speculative |
| 47 | 3.3 | NARRATOR | And one man in a grey suit is booking meetings for three a.m. | 13 | SETUP | STORY · SP-01 | speculative |
| 48 | 3.5 | NARRATOR | At night, a tiny gland in your brain still releases melatonin. | 11 | FACT | B06 · HR4 | hypothetical |
| 49 | 3.5 | NARRATOR | Your body's signal of night. | 5 | FACT | B06 · HR4 | hypothetical |
| 50 | 3.5 | NARRATOR | Switch on a bright light, and it fades. | 8 | FACT | B06 · HR4 | hypothetical |
| 51 | 3.5 | NARRATOR | You're not tired. | 3 | RULE | HR2 | hypothetical |
| 52 | 3.5 | NARRATOR | Your body clock just knows it's night. | 7 | RULE | HR4 | hypothetical |
| 53 | 3.6 | NARRATOR | Twenty-four hours awake… and you feel fine. | 7 | RULE | HR3 | hypothetical |
| 54 | 3.6 | NARRATOR | You just got eight hours back. | 6 | CONSEQUENCE | CALC-02 | hypothetical |
| 55 | 3.6 | NARRATOR | Almost three thousand hours a year. | 6 | CONSEQUENCE | CALC-02 | hypothetical |
| 56 | 3.6 | NARRATOR | And bosses everywhere did the same maths. | 7 | TRANSITION | SP-01 | speculative |
| 57 | 4.1 | NARRATOR | Overnight, humanity's waking time grows by about half. | 8 | CONSEQUENCE | CALC-03 | hypothetical |
| 58 | 4.1 | NARRATOR | The waking hours of billions of extra people. | 8 | CONSEQUENCE | CALC-03 | hypothetical |
| 59 | 4.2 | NARRATOR | Mr. Black's company becomes BLACK 24. | 6 | STORY | STORY · SP-01 | speculative |
| 60 | 4.2 | NARRATOR | It never closes. | 3 | CONSEQUENCE | SP-01 | speculative |
| 61 | 4.2 | NARRATOR | Even today, about one in six US workers doesn't work a regular daytime schedule. | 14 | FACT | G02 | established |
| 62 | 4.2 | NARRATOR | Now the night shift is just… a shift. | 8 | CONSEQUENCE | SP-01 | speculative |
| 63 | 4.3 | NARRATOR | Some jobs boom. | 3 | CONSEQUENCE | SP-02 | speculative |
| 64 | 4.3 | NARRATOR | Others shrink. | 2 | CONSEQUENCE | SP-03 | speculative |
| 65 | 4.4 | NARRATOR | Winners? | 1 | QUESTION | FRAME | frame |
| 66 | 4.4 | NARRATOR | Companies and customers. | 3 | CONSEQUENCE | SP-01 · SP-02 | speculative |
| 67 | 4.4 | NARRATOR | In twenty sixteen, RAND estimated that lack of sleep cost the US economy… up to four hundred and eleven billion dollars a year. | 23 | EVIDENCE | G01 | research |
| 68 | 4.4 | NARRATOR | Missed work. | 2 | EVIDENCE | G01 | research |
| 69 | 4.4 | NARRATOR | Lower productivity. | 2 | EVIDENCE | G01 | research |
| 70 | 4.4 | NARRATOR | Earlier deaths. | 2 | EVIDENCE | G01 | research |
| 71 | 4.4 | NARRATOR | Here, that cost could fall. | 5 | CONSEQUENCE | SP-19 | speculative |
| 72 | 4.4 | NARRATOR | Though a nonstop world may bring new costs. | 8 | CONSEQUENCE | SP-19 | speculative |
| 73 | 4.4 | NARRATOR | Losers? | 1 | QUESTION | FRAME | frame |
| 74 | 4.4 | NARRATOR | Workers. | 1 | CONSEQUENCE | SP-02 | speculative |
| 75 | 4.4 | NARRATOR | When everyone can work more, your hour might be worth less. | 11 | CONSEQUENCE | SP-02 | speculative |
| 76 | 4.5 | NARRATOR | But more hours don't always mean more output. | 8 | EVIDENCE | G03 | research |
| 77 | 4.5 | NARRATOR | A study of First World War munitions factories found… each hour past about forty-nine a week added less. | 18 | EVIDENCE | G03 | research |
| 78 | 4.5 | NARRATOR | Could you stay focused if you never got tired? | 9 | QUESTION | D05 | unknown |
| 79 | 4.5 | NARRATOR | Nobody knows. | 2 | UNKNOWN | D05 | unknown |
| 80 | 4.6 | NARRATOR | Mum takes BLACK 24's night shift. | 6 | STORY | STORY | story |
| 81 | 4.6 | NARRATOR | It pays more. | 3 | STORY | STORY | story |
| 82 | 4.6 | NARRATOR | Enough to start Mia's university fund. | 6 | SETUP | STORY | story |
| 83 | 4.6 | NARRATOR | Her chair at dinner stays empty. | 6 | SETUP | STORY | story |
| 84 | 5.1 | NARRATOR | Mum's train to work leaves at midnight. | 7 | STORY | STORY | story |
| 85 | 5.1 | NARRATOR | It's packed. | 2 | CONSEQUENCE | SP-01 | speculative |
| 86 | 5.1 | NARRATOR | New York's subway already runs all night. | 7 | FACT | H01 | established |
| 87 | 5.1 | NARRATOR | Now many cities try. | 4 | CONSEQUENCE | SP-05 | speculative |
| 88 | 5.2 | NARRATOR | But even today, London keeps its all-night Tube to weekends. | 10 | FACT | H08 | established |
| 89 | 5.2 | NARRATOR | Weeknights are for repairs. | 4 | FACT | H08 | established |
| 90 | 5.2 | NARRATOR | So in a city that never stops… when do you fix it? | 12 | QUESTION | SP-06 | speculative |
| 91 | 5.3 | NARRATOR | Dinner at three. | 3 | CONSEQUENCE | SP-01 | speculative |
| 92 | 5.3 | NARRATOR | Surgery at four. | 3 | CONSEQUENCE | SP-01 | speculative |
| 93 | 5.3 | NARRATOR | Concerts at five. | 3 | CONSEQUENCE | SP-01 | speculative |
| 94 | 5.4 | NARRATOR | Schools split into shifts. | 4 | CONSEQUENCE | SP-07 | speculative |
| 95 | 5.4 | NARRATOR | Mia's starts at eight a.m. | 5 | STORY | STORY | story |
| 96 | 5.4 | NARRATOR | Yours… at nine p.m. | 4 | STORY | STORY | story |
| 97 | 5.5 | NARRATOR | Lighting in homes, offices and streets already takes an estimated eight percent of the world's electricity. | 16 | EVIDENCE | H02 | research |
| 98 | 5.5 | NARRATOR | Keep it on all night, and demand climbs. | 8 | CONSEQUENCE | SP-08 | speculative |
| 99 | 5.5 | NARRATOR | Just when solar panels produce nothing. | 6 | CONSEQUENCE | SP-08 · H03 | speculative |
| 100 | 5.6 | NARRATOR | Even now, more than four in five people live under light-polluted skies. | 12 | FACT | H04 | established |
| 101 | 5.6 | NARRATOR | Here, the stars fade faster. | 5 | CONSEQUENCE | SP-09 | speculative |
| 102 | 5.6 | NARRATOR | Birds sing at the wrong hour. | 6 | CONSEQUENCE | SP-09 · H06 | speculative |
| 103 | 5.6 | NARRATOR | Turtle hatchlings lose their way to the sea. | 8 | CONSEQUENCE | SP-09 · H06 | speculative |
| 104 | 5.7 | NARRATOR | But not every place switches on. | 6 | CONSEQUENCE | SP-05 | speculative |
| 105 | 5.7 | NARRATOR | Some towns follow Flagstaff, Arizona — the world's first International Dark Sky City. | 12 | FACT | H07 · SP-05 | speculative |
| 106 | 5.7 | NARRATOR | They keep their nights dark. | 5 | CONSEQUENCE | SP-05 | speculative |
| 107 | 5.7 | NARRATOR | On purpose. | 2 | CONSEQUENCE | SP-05 | speculative |
| 108 | 5.7 | NARRATOR | Cities adapted in a year. | 5 | TRANSITION | SP-05 | speculative |
| 109 | 5.7 | NARRATOR | People took longer. | 3 | TRANSITION | SP-10 | speculative |
| 110 | 6.1 | NARRATOR | Do you spend more time with your family? | 8 | QUESTION | FRAME | frame |
| 111 | 6.1 | NARRATOR | At first, you do. | 4 | CONSEQUENCE | SP-20 | speculative |
| 112 | 6.2 | NARRATOR | Then the schedules split. | 4 | CONSEQUENCE | SP-10 | speculative |
| 113 | 6.2 | NARRATOR | You're all awake twenty-four hours a day… and almost never together. | 11 | CONSEQUENCE | SP-10 | speculative |
| 114 | 6.2 | NARRATOR | Nobody says goodnight anymore. | 4 | SETUP | SP-18 | speculative |
| 115 | 6.2 | NARRATOR | Even your body clocks drift apart. | 6 | CONSEQUENCE | SP-17 | speculative |
| 116 | 6.2 | NARRATOR | The lights never go off. | 5 | CONSEQUENCE | SP-17 | speculative |
| 117 | 6.3 | NARRATOR | At eighteen, you join BLACK 24 too. | 7 | STORY | STORY | story |
| 118 | 6.3 | NARRATOR | Nights. | 1 | STORY | STORY | story |
| 119 | 6.3 | NARRATOR | You're good at it. | 4 | STORY | STORY | story |
| 120 | 6.3 | NARRATOR | You're always available. | 3 | SETUP | STORY | story |
| 121 | 6.4 | LEO | Next week. | 2 | SETUP | STORY | story |
| 122 | 6.5 | NARRATOR | Sleep was the one excuse nobody could argue with. | 9 | THEME | SP-11 | speculative |
| 123 | 6.5 | NARRATOR | Now nobody's ever asleep. | 4 | CONSEQUENCE | HR1 | hypothetical |
| 124 | 6.5 | NARRATOR | France and Australia already give workers a right to disconnect. | 10 | FACT | G06 | established |
| 125 | 6.5 | NARRATOR | Work was leaking into our nights long before this. | 9 | FACT | G06 | established |
| 126 | 6.6 | NARRATOR | Would more time make you happier? | 6 | QUESTION | FRAME | frame |
| 127 | 6.6 | NARRATOR | Research suggests free time helps… up to about two hours a day. | 12 | EVIDENCE | G04 | research |
| 128 | 6.6 | NARRATOR | Past about five, well-being can actually dip. | 7 | EVIDENCE | G04 | research |
| 129 | 6.6 | NARRATOR | Unless that time goes into something productive. | 7 | EVIDENCE | G04 | research |
| 130 | 6.6 | NARRATOR | Some people flourish. | 3 | CONSEQUENCE | SP-12 | speculative |
| 131 | 6.6 | NARRATOR | Some just drift. | 3 | CONSEQUENCE | SP-12 | speculative |
| 132 | 6.7 | NARRATOR | Mia's notebook stays blank. | 4 | CONSEQUENCE | HR5 · SP-13 | speculative |
| 133 | 6.7 | NARRATOR | And science still hasn't settled what dreams were for. | 9 | UNKNOWN | D03 | unknown |
| 134 | 6.8 | NARRATOR | We didn't lose sleep. | 4 | THEME | FRAME | frame |
| 135 | 6.8 | NARRATOR | We lost the night. | 4 | THEME | FRAME | frame |
| 136 | 7.1 | NARRATOR | Imagine it's ten years on. | 5 | TRANSITION | FRAME | frame |
| 137 | 7.1 | NARRATOR | You're twenty-five. | 2 | STORY | STORY | story |
| 138 | 7.2 | NARRATOR | From space, Earth's night side glows brighter than ever. | 9 | CONSEQUENCE | SP-09 | speculative |
| 139 | 7.3 | NARRATOR | Three a.m. is just another rush hour. | 7 | CALLBACK | SP-15 | speculative |
| 140 | 7.3 | NARRATOR | Days don't end anymore… they change shifts. | 7 | CONSEQUENCE | SP-15 | speculative |
| 141 | 7.4 | NARRATOR | Trains never stop. | 3 | CONSEQUENCE | SP-06 | speculative |
| 142 | 7.4 | NARRATOR | Robots fix the tunnels between them. | 6 | PAYOFF | SP-06 | speculative |
| 143 | 7.5 | NARRATOR | The economy is bigger. | 4 | CONSEQUENCE | SP-21 | speculative |
| 144 | 7.5 | NARRATOR | But for many people, the working week crept up… not down. | 11 | CONSEQUENCE | SP-11 | speculative |
| 145 | 7.6 | NARRATOR | Darkness is a luxury now. | 5 | CONSEQUENCE | SP-14 | speculative |
| 146 | 7.6 | NARRATOR | People travel just to see stars. | 6 | CONSEQUENCE | SP-14 | speculative |
| 147 | 7.6 | NARRATOR | Some countries pass night laws. | 5 | CONSEQUENCE | SP-11 | speculative |
| 148 | 7.6 | NARRATOR | Hours when nobody can be called to work. | 8 | CONSEQUENCE | SP-11 | speculative |
| 149 | 7.7 | NARRATOR | The biggest change of all? | 5 | QUESTION | FRAME | frame |
| 150 | 7.7 | NARRATOR | A whole generation of children… who have never had a single dream. | 12 | PAYOFF | HR5 | hypothetical |
| 151 | 7.8a | NARRATOR | And you? | 2 | TRANSITION | FRAME | frame |
| 152 | 7.8a | NARRATOR | You run night operations at BLACK 24. | 7 | STORY | STORY | story |
| 153 | 7.8b | NARRATOR | Mum's nights paid for Mia's place at university. | 8 | PAYOFF | STORY | story |
| 154 | 7.8c | NARRATOR | She leaves tomorrow. | 3 | STORY | STORY | story |
| 155 | 7.8c | NARRATOR | To study the brain… and find out what dreams were for. | 11 | SETUP | STORY · D03 | unknown |
| 156 | 7.8d | NARRATOR | Which brings us back to three a.m. | 7 | TRANSITION | FRAME | frame |
| 157 | 8.1 | NARRATOR | You're at your desk, like every night. | 7 | CALLBACK | STORY | story |
| 158 | 8.2 | MIA | My train's at seven. | 4 | DIALOGUE | STORY | story |
| 159 | 8.2 | MIA | Come to the hill with me. | 6 | DIALOGUE | STORY | story |
| 160 | 8.2 | MIA | Just tonight. | 2 | DIALOGUE | STORY | story |
| 161 | 8.2 | LEO | I can't. | 2 | DIALOGUE | STORY | story |
| 162 | 8.2 | LEO | I'm on shift. | 3 | DIALOGUE | STORY | story |
| 163 | 8.3 | LEO | When Leo has time. | 4 | PAYOFF | STORY | story |
| 164 | 8.5 | NARRATOR | Out past the last streetlight, the stars come back. | 9 | PAYOFF | H04 · SP-09 | speculative |
| 165 | 8.7 | NARRATOR | Up here, the lights are finally off. | 7 | PAYOFF | STORY | story |
| 166 | 8.7 | NARRATOR | It isn't sleep. | 3 | RULE | HR5 | hypothetical |
| 167 | 8.7 | NARRATOR | It's just night. | 3 | THEME | HR4 | hypothetical |
| 168 | 8.8 | MIA | Don't fall asleep on me. | 5 | DIALOGUE | STORY | story |
| 169 | 8.8 | LEO | Goodnight, Mia. | 2 | PAYOFF | STORY | story |
| 170 | 8.9 | NARRATOR | Back in the real world, experts recommend adults get at least seven hours a night. | 15 | LESSON | A05 | established |
| 171 | 8.9 | NARRATOR | Sleep helps memory, immunity, metabolism… and more we're still learning about. | 11 | LESSON | A09 · D01 | unknown |
| 172 | 8.10 | NARRATOR | If you never had to sleep again… what would you do with the life you got back? | 17 | FINAL | FRAME | frame |

**Roles:** CONSEQUENCE 46 · RULE 19 · FACT 18 · QUESTION 13 · EVIDENCE 13 · STORY 12 · SETUP 9 · DIALOGUE 9 · PAYOFF 7 · TRANSITION 6 · UNKNOWN 4 · THEME 4 · HOOK 3 · PROMISE 3 · CALLBACK 2 · LESSON 2 · PREMISE 1 · FINAL 1

### Repetition

**Most common sentence openers:** “and” ×9 · “the” ×6 · “some” ×6 · “you're” ×6 · “but” ×5 · “not” ×4 · “in” ×4 · “even” ×4

**Three or more sentences in a row with the same opener** (judge as deliberate rhythm or fix):

* 3.2–3.2: “Not you.” / “Not Mum.” / “Not anyone.”

**Repeated four-word phrases:**

| Phrase | Sentences | Declared callback? |
|---|---|---|
| a whole generation of | 14, 150 | yes |
| never had a single | 14, 150 | yes |
| had a single dream | 14, 150 | yes |
| what dreams were for | 133, 155 | yes |

**Near repeats** — the same content word (six letters or more, motif words excluded) in the same or the next beat; for review:

| Word | Sentences |
|---|---|
| waking | 57 · 58 |

### Long sentences (over 18 words)

* 2.2 (19 words): In one study, people sleeping six hours or less… had about four times the odds of catching a cold.
* 4.4 (23 words): In twenty sixteen, RAND estimated that lack of sleep cost the US economy… up to four hundred and eleven billion dollars a year.

### Text-to-speech readiness

* No digits, %, $ or capitalised abbreviations in the paste text (checked per sentence; REM is the one allowed — see pronunciation).
* Substitutions applied for the voice only: “BLACK 24's” → “Black Twenty-Four's”; “BLACK 24” → “Black Twenty-Four”; “Mr. Black” → “Mister Black”; “RAND” → “Rand”; “US economy” → “U.S. economy”; “US workers” → “U.S. workers”.
* Withdrawn wording scanned in every sentence: 19 patterns from the ledger's withdrawn list and the Story Bible guardrails (§9).

---

## 2 · Factual audit

**Sentences by class:** speculative 56 · hypothetical 34 · story 31 · established 15 · frame 14 · research 13 · unknown 9

Rules applied (ledger v4.1, Production Standard §5): one class per sentence by the weakest-input rule; research-supported → the evidence is signalled; unknown → the uncertainty is said; world rules → never attributed to science; speculation → inside the imagined frame or with a modal verb; a real fact inside the story → a real-world marker ("today", "already", "in twenty sixteen"…); every narrated fact → at least one level-A source.

### Fact ledger — every sentence with factual content

| # | Beat | Sentence | Claims | Class | Sources (level) | Wording check |
|---|---|---|---|---|---|---|
| 1 | 1.1 | It's three a.m. — and the playground is full. | HR1 · SP-07 | speculative | — | inside the imagined frame ✅ |
| 2 | 1.3 | The schools are open. | SP-07 | speculative | — | inside the imagined frame ✅ |
| 3 | 1.3 | Traffic's jammed. | SP-15 | speculative | — | inside the imagined frame ✅ |
| 4 | 1.3 | And nobody here has slept… in ten years. | HR1 | hypothetical | — | framed as the premise ✅ |
| 5 | 1.4 | Tonight, almost everyone on Earth will lie down in the dark and sleep. | A01 | established | A01: S01 (A) | stated in a real-world beat ✅ |
| 6 | 1.4 | About a third of your life. | A01 | established | A01: S01 (A) | stated in a real-world beat ✅ |
| 7 | 1.4 | More than twenty years. | CALC-01 | established | CALC-01: derived from A01, A08, I01 | stated in a real-world beat ✅ |
| 8 | 1.5 | So what if you never needed to sleep again? | HR1 | hypothetical | — | framed as the premise ✅ |
| 9 | 1.5 | Not tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 10 | 1.5 | No harm done. | HR3 | hypothetical | — | framed as the premise ✅ |
| 11 | 1.5 | Just… awake. | HR1 | hypothetical | — | framed as the premise ✅ |
| 14 | 1.6 | And why, in this world, a whole generation of kids has never had a single dream. | HR5 | hypothetical | — | framed as the premise ✅ |
| 17 | 2.2 | Studies suggest it helps lock in what you learned. | C01 | research | C01: S10 (A) | evidence signalled; stated in a real-world beat ✅ |
| 18 | 2.2 | In one study, people sleeping six hours or less… had about four times the odds of catching a cold. | C03 | research | C03: S12 (A) | evidence signalled; stated in a real-world beat ✅ |
| 19 | 2.2 | In another, after six short nights, young men handled blood sugar worse. | C05 | research | C05: S16 (A) | evidence signalled; stated in a real-world beat ✅ |
| 20 | 2.3 | Some of it, nobody fully understands. | D01 | unknown | — | uncertainty stated ✅ |
| 21 | 2.3 | What's REM sleep for? | D02 | unknown | — | uncertainty stated ✅ |
| 22 | 2.3 | Does sleep really clean the brain? | D04 | unknown | — | uncertainty stated ✅ |
| 23 | 2.4 | But two systems decide when you get sleepy. | B01 | established | B01: S04 (A), S01 (A) | stated in a real-world beat ✅ |
| 24 | 2.4 | An hourglass — pressure that builds while you're awake. | B01 | established | B01: S04 (A), S01 (A) | stated in a real-world beat ✅ |
| 25 | 2.4 | Caffeine blocks adenosine receptors, so the hourglass feels emptier than it is. | B03 · B01 | established | B03: S08 (A); B01: S04 (A), S01 (A) | stated in a real-world beat ✅ |
| 26 | 2.4 | And a body clock, reset every day, mainly by light. | B05 | established | B05: S54 (A), S05 (A) | stated in a real-world beat ✅ |
| 27 | 2.5 | A breakthrough would have to stop the hourglass. | HR2 | hypothetical | — | framed as the premise ✅ |
| 28 | 2.5 | And do all of sleep's work while you're awake. | HR3 | hypothetical | — | framed as the premise ✅ |
| 29 | 2.5 | Even the parts we don't understand. | HR3 · D01 | unknown | — | uncertainty stated ✅ |
| 30 | 2.5 | How? | HR8 | hypothetical | — | framed as the premise ✅ |
| 31 | 2.5 | That's the thought experiment. | HR8 | hypothetical | — | framed as the premise ✅ |
| 32 | 2.6 | In this world, you're never tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 33 | 2.6 | Going without sleep never hurts. | HR3 | hypothetical | — | framed as the premise ✅ |
| 34 | 2.6 | Your body clock keeps ticking. | HR4 | hypothetical | — | framed as the premise ✅ |
| 35 | 2.6 | And with no sleep… the dreams go too. | HR5 | hypothetical | — | framed as the premise ✅ |
| 36 | 2.6 | Daydreams stay. | HR5 · HR7 | hypothetical | — | framed as the premise ✅ |
| 41 | 3.2 | That night, nobody gets tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 42 | 3.2 | Not you. | HR2 | hypothetical | — | framed as the premise ✅ |
| 43 | 3.2 | Not Mum. | HR2 | hypothetical | — | framed as the premise ✅ |
| 44 | 3.2 | Not anyone. | HR2 | hypothetical | — | framed as the premise ✅ |
| 45 | 3.3 | So what do you do with eight extra hours? | CALC-02 | hypothetical | — | framed as the premise ✅ |
| 46 | 3.3 | By one a.m., the city is training, gaming, painting, studying. | SP-22 | speculative | — | inside the imagined frame ✅ |
| 47 | 3.3 | And one man in a grey suit is booking meetings for three a.m. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 48 | 3.5 | At night, a tiny gland in your brain still releases melatonin. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 49 | 3.5 | Your body's signal of night. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 50 | 3.5 | Switch on a bright light, and it fades. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 51 | 3.5 | You're not tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 52 | 3.5 | Your body clock just knows it's night. | HR4 | hypothetical | — | framed as the premise ✅ |
| 53 | 3.6 | Twenty-four hours awake… and you feel fine. | HR3 | hypothetical | — | framed as the premise ✅ |
| 54 | 3.6 | You just got eight hours back. | CALC-02 | hypothetical | — | framed as the premise ✅ |
| 55 | 3.6 | Almost three thousand hours a year. | CALC-02 | hypothetical | — | framed as the premise ✅ |
| 56 | 3.6 | And bosses everywhere did the same maths. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 57 | 4.1 | Overnight, humanity's waking time grows by about half. | CALC-03 | hypothetical | — | framed as the premise ✅ |
| 58 | 4.1 | The waking hours of billions of extra people. | CALC-03 | hypothetical | — | framed as the premise ✅ |
| 59 | 4.2 | Mr. Black's company becomes BLACK 24. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 60 | 4.2 | It never closes. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 61 | 4.2 | Even today, about one in six US workers doesn't work a regular daytime schedule. | G02 | established | G02: S38 (A) | real-world marker inside the story ✅ |
| 62 | 4.2 | Now the night shift is just… a shift. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 63 | 4.3 | Some jobs boom. | SP-02 | speculative | — | inside the imagined frame ✅ |
| 64 | 4.3 | Others shrink. | SP-03 | speculative | — | inside the imagined frame ✅ |
| 66 | 4.4 | Companies and customers. | SP-01 · SP-02 | speculative | — | inside the imagined frame ✅ |
| 67 | 4.4 | In twenty sixteen, RAND estimated that lack of sleep cost the US economy… up to four hundred and eleven billion dollars a year. | G01 | research | G01: S37 (A) | evidence signalled; real-world marker inside the story ✅ |
| 68 | 4.4 | Missed work. | G01 | research | G01: S37 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 69 | 4.4 | Lower productivity. | G01 | research | G01: S37 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 70 | 4.4 | Earlier deaths. | G01 | research | G01: S37 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 71 | 4.4 | Here, that cost could fall. | SP-19 | speculative | — | inside the imagined frame ✅ |
| 72 | 4.4 | Though a nonstop world may bring new costs. | SP-19 | speculative | — | inside the imagined frame ✅ |
| 74 | 4.4 | Workers. | SP-02 | speculative | — | inside the imagined frame ✅ |
| 75 | 4.4 | When everyone can work more, your hour might be worth less. | SP-02 | speculative | — | inside the imagined frame ✅ |
| 76 | 4.5 | But more hours don't always mean more output. | G03 | research | G03: S39 (A) | evidence signalled; real-world marker inside the story ✅ |
| 77 | 4.5 | A study of First World War munitions factories found… each hour past about forty-nine a week added less. | G03 | research | G03: S39 (A) | evidence signalled; real-world marker inside the story ✅ |
| 78 | 4.5 | Could you stay focused if you never got tired? | D05 | unknown | — | uncertainty stated ✅ |
| 79 | 4.5 | Nobody knows. | D05 | unknown | — | uncertainty stated ✅ |
| 85 | 5.1 | It's packed. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 86 | 5.1 | New York's subway already runs all night. | H01 | established | H01: S45 (A) | real-world marker inside the story ✅ |
| 87 | 5.1 | Now many cities try. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 88 | 5.2 | But even today, London keeps its all-night Tube to weekends. | H08 | established | H08: S61 (A) | real-world marker inside the story ✅ |
| 89 | 5.2 | Weeknights are for repairs. | H08 | established | H08: S61 (A) | real-world marker inside the story ✅ |
| 90 | 5.2 | So in a city that never stops… when do you fix it? | SP-06 | speculative | — | inside the imagined frame ✅ |
| 91 | 5.3 | Dinner at three. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 92 | 5.3 | Surgery at four. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 93 | 5.3 | Concerts at five. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 94 | 5.4 | Schools split into shifts. | SP-07 | speculative | — | inside the imagined frame ✅ |
| 97 | 5.5 | Lighting in homes, offices and streets already takes an estimated eight percent of the world's electricity. | H02 | research | H02: S62 (A) | evidence signalled; real-world marker inside the story ✅ |
| 98 | 5.5 | Keep it on all night, and demand climbs. | SP-08 | speculative | — | inside the imagined frame ✅ |
| 99 | 5.5 | Just when solar panels produce nothing. | SP-08 · H03 | speculative | H03: physics — no source needed | inside the imagined frame ✅ |
| 100 | 5.6 | Even now, more than four in five people live under light-polluted skies. | H04 | established | H04: S47 (A) | real-world marker inside the story ✅ |
| 101 | 5.6 | Here, the stars fade faster. | SP-09 | speculative | — | inside the imagined frame ✅ |
| 102 | 5.6 | Birds sing at the wrong hour. | SP-09 · H06 | speculative | H06: S49 (A) | inside the imagined frame ✅ |
| 103 | 5.6 | Turtle hatchlings lose their way to the sea. | SP-09 · H06 | speculative | H06: S49 (A) | inside the imagined frame ✅ |
| 104 | 5.7 | But not every place switches on. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 105 | 5.7 | Some towns follow Flagstaff, Arizona — the world's first International Dark Sky City. | H07 · SP-05 | speculative | H07: S50 (A) | inside the imagined frame ✅ |
| 106 | 5.7 | They keep their nights dark. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 107 | 5.7 | On purpose. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 108 | 5.7 | Cities adapted in a year. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 109 | 5.7 | People took longer. | SP-10 | speculative | — | inside the imagined frame ✅ |
| 111 | 6.1 | At first, you do. | SP-20 | speculative | — | inside the imagined frame ✅ |
| 112 | 6.2 | Then the schedules split. | SP-10 | speculative | — | inside the imagined frame ✅ |
| 113 | 6.2 | You're all awake twenty-four hours a day… and almost never together. | SP-10 | speculative | — | inside the imagined frame ✅ |
| 114 | 6.2 | Nobody says goodnight anymore. | SP-18 | speculative | — | inside the imagined frame ✅ |
| 115 | 6.2 | Even your body clocks drift apart. | SP-17 | speculative | — | inside the imagined frame ✅ |
| 116 | 6.2 | The lights never go off. | SP-17 | speculative | — | inside the imagined frame ✅ |
| 122 | 6.5 | Sleep was the one excuse nobody could argue with. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 123 | 6.5 | Now nobody's ever asleep. | HR1 | hypothetical | — | framed as the premise ✅ |
| 124 | 6.5 | France and Australia already give workers a right to disconnect. | G06 | established | G06: S60 (A), S59 (A) | real-world marker inside the story ✅ |
| 125 | 6.5 | Work was leaking into our nights long before this. | G06 | established | G06: S60 (A), S59 (A) | real-world marker inside the story ✅ |
| 127 | 6.6 | Research suggests free time helps… up to about two hours a day. | G04 | research | G04: S40 (A) | evidence signalled; real-world marker inside the story ✅ |
| 128 | 6.6 | Past about five, well-being can actually dip. | G04 | research | G04: S40 (A) | evidence signalled; real-world marker inside the story; emphasis 'actually' reviewed: it marks the surprising direction S40 found (more free time, lower well-being); it does not inflate the size ✅ |
| 129 | 6.6 | Unless that time goes into something productive. | G04 | research | G04: S40 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 130 | 6.6 | Some people flourish. | SP-12 | speculative | — | inside the imagined frame ✅ |
| 131 | 6.6 | Some just drift. | SP-12 | speculative | — | inside the imagined frame ✅ |
| 132 | 6.7 | Mia's notebook stays blank. | HR5 · SP-13 | speculative | — | inside the imagined frame ✅ |
| 133 | 6.7 | And science still hasn't settled what dreams were for. | D03 | unknown | — | uncertainty stated ✅ |
| 138 | 7.2 | From space, Earth's night side glows brighter than ever. | SP-09 | speculative | — | inside the imagined frame ✅ |
| 139 | 7.3 | Three a.m. is just another rush hour. | SP-15 | speculative | — | inside the imagined frame ✅ |
| 140 | 7.3 | Days don't end anymore… they change shifts. | SP-15 | speculative | — | inside the imagined frame ✅ |
| 141 | 7.4 | Trains never stop. | SP-06 | speculative | — | inside the imagined frame ✅ |
| 142 | 7.4 | Robots fix the tunnels between them. | SP-06 | speculative | — | inside the imagined frame ✅ |
| 143 | 7.5 | The economy is bigger. | SP-21 | speculative | — | inside the imagined frame ✅ |
| 144 | 7.5 | But for many people, the working week crept up… not down. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 145 | 7.6 | Darkness is a luxury now. | SP-14 | speculative | — | inside the imagined frame ✅ |
| 146 | 7.6 | People travel just to see stars. | SP-14 | speculative | — | inside the imagined frame ✅ |
| 147 | 7.6 | Some countries pass night laws. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 148 | 7.6 | Hours when nobody can be called to work. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 150 | 7.7 | A whole generation of children… who have never had a single dream. | HR5 | hypothetical | — | framed as the premise ✅ |
| 155 | 7.8c | To study the brain… and find out what dreams were for. | D03 | unknown | — | uncertainty stated ✅ |
| 164 | 8.5 | Out past the last streetlight, the stars come back. | H04 · SP-09 | speculative | H04: S47 (A) | inside the imagined frame ✅ |
| 166 | 8.7 | It isn't sleep. | HR5 | hypothetical | — | framed as the premise ✅ |
| 167 | 8.7 | It's just night. | HR4 | hypothetical | — | framed as the premise ✅ |
| 170 | 8.9 | Back in the real world, experts recommend adults get at least seven hours a night. | A05 | established | A05: S32 (A) | stated in a real-world beat ✅ |
| 171 | 8.9 | Sleep helps memory, immunity, metabolism… and more we're still learning about. | A09 · D01 | unknown | A09: S01 (A), S32 (A) | uncertainty stated ✅ |

### Sentences with no factual content

| # | Beat | Speaker | Sentence | Tag |
|---|---|---|---|---|
| 12 | 1.6 | NARRATOR | This is the first twenty-four hours. | FRAME |
| 13 | 1.6 | NARRATOR | The next ten years. | FRAME |
| 15 | 2.1 | MUM | Goodnight, you two. | STORY |
| 16 | 2.1 | NARRATOR | First, what does sleep actually do? | FRAME |
| 37 | 3.1 | MIA | Look — it's us, on the hill! | STORY |
| 38 | 3.1 | MIA | Can we go? | STORY |
| 39 | 3.1 | LEO | Sure. | STORY |
| 40 | 3.1 | LEO | When I have time. | STORY |
| 65 | 4.4 | NARRATOR | Winners? | FRAME |
| 73 | 4.4 | NARRATOR | Losers? | FRAME |
| 80 | 4.6 | NARRATOR | Mum takes BLACK 24's night shift. | STORY |
| 81 | 4.6 | NARRATOR | It pays more. | STORY |
| 82 | 4.6 | NARRATOR | Enough to start Mia's university fund. | STORY |
| 83 | 4.6 | NARRATOR | Her chair at dinner stays empty. | STORY |
| 84 | 5.1 | NARRATOR | Mum's train to work leaves at midnight. | STORY |
| 95 | 5.4 | NARRATOR | Mia's starts at eight a.m. | STORY |
| 96 | 5.4 | NARRATOR | Yours… at nine p.m. | STORY |
| 110 | 6.1 | NARRATOR | Do you spend more time with your family? | FRAME |
| 117 | 6.3 | NARRATOR | At eighteen, you join BLACK 24 too. | STORY |
| 118 | 6.3 | NARRATOR | Nights. | STORY |
| 119 | 6.3 | NARRATOR | You're good at it. | STORY |
| 120 | 6.3 | NARRATOR | You're always available. | STORY |
| 121 | 6.4 | LEO | Next week. | STORY |
| 126 | 6.6 | NARRATOR | Would more time make you happier? | FRAME |
| 134 | 6.8 | NARRATOR | We didn't lose sleep. | FRAME |
| 135 | 6.8 | NARRATOR | We lost the night. | FRAME |
| 136 | 7.1 | NARRATOR | Imagine it's ten years on. | FRAME |
| 137 | 7.1 | NARRATOR | You're twenty-five. | STORY |
| 149 | 7.7 | NARRATOR | The biggest change of all? | FRAME |
| 151 | 7.8a | NARRATOR | And you? | FRAME |
| 152 | 7.8a | NARRATOR | You run night operations at BLACK 24. | STORY |
| 153 | 7.8b | NARRATOR | Mum's nights paid for Mia's place at university. | STORY |
| 154 | 7.8c | NARRATOR | She leaves tomorrow. | STORY |
| 156 | 7.8d | NARRATOR | Which brings us back to three a.m. | FRAME |
| 157 | 8.1 | NARRATOR | You're at your desk, like every night. | STORY |
| 158 | 8.2 | MIA | My train's at seven. | STORY |
| 159 | 8.2 | MIA | Come to the hill with me. | STORY |
| 160 | 8.2 | MIA | Just tonight. | STORY |
| 161 | 8.2 | LEO | I can't. | STORY |
| 162 | 8.2 | LEO | I'm on shift. | STORY |
| 163 | 8.3 | LEO | When Leo has time. | STORY |
| 165 | 8.7 | NARRATOR | Up here, the lights are finally off. | STORY |
| 168 | 8.8 | MIA | Don't fall asleep on me. | STORY |
| 169 | 8.8 | LEO | Goodnight, Mia. | STORY |
| 172 | 8.10 | NARRATOR | If you never had to sleep again… what would you do with the life you got back? | FRAME |

### On-screen text with factual content

| Beat | Text | Kind | Claims | Words |
|---|---|---|---|---|
| 2.1 | MONDAY — THE LAST NIGHT ANYONE SLEEPS | label | HR1 | 6 |
| 2.1 | 12 SEP (wall calendar) | diegetic | HR1 | — |
| 2.2 | 1 study · 164 adults | tag | C03 | 2 |
| 2.2 | Prather et al., 2015 | source | C03 | 3 |
| 2.2 | 1 study · 11 men | tag | C05 | 2 |
| 2.2 | Spiegel et al., 1999 | source | C05 | 3 |
| 2.3 | YES · mouse study, 2013 | card | C06 | 3 |
| 2.3 | NO · mouse study, 2024 | card | C08 | 3 |
| 2.6 | IN THIS WORLD | card | HR1 | 3 |
| 2.6 | 1 · NEVER TIRED | card | HR2 | 2 |
| 2.6 | 2 · NO HARM FROM NOT SLEEPING | card | HR3 | 5 |
| 2.6 | 3 · BODY CLOCK KEEPS TICKING | card | HR4 | 4 |
| 2.6 | 4 · NO DREAMS — a rule we chose | card | HR5 | 6 |
| 2.6 | daydreams stay | label | HR5 · HR7 | 2 |
| 3.1 | TUESDAY | label | HR1 | 1 |
| 3.5 | PINEAL GLAND | label | B06 | 2 |
| 3.5 | MELATONIN | label | B06 | 1 |
| 4.1 | waking hours only · assumes ~8 h of sleep · 7–9 h gives +41 % to +60 % | footnote | CALC-03 | — |
| 4.2 | US Bureau of Labor Statistics, 2017–18 | source | G02 | 5 |
| 4.4 | $411 BN A YEAR | card | G01 | 3 |
| 4.4 | lack of sleep · upper estimate | card | G01 | 5 |
| 4.4 | missed work · lower productivity · earlier deaths | card | G01 | 6 |
| 4.4 | RAND Europe, 2016 · US | source | G01 | 3 |
| 4.5 | UK munitions factories, 1914–18 | source | G03 | 3 |
| 4.5 | Pencavel, 2015 | source | G03 | 1 |
| 5.2 | Night Tube: Fridays and Saturdays only | source | H08 | 6 |
| 5.2 | Transport for London | source | H08 | 3 |
| 5.4 | 08:00 · 16:00 · 21:00 (timetable) | diegetic | SP-07 | — |
| 5.5 | ≈ 8 % OF WORLD ELECTRICITY | card | H02 | 3 |
| 5.5 | IEA · 2024 data · homes, offices, streets | source | H02 | 5 |
| 5.6 | Falchi et al., 2016 | source | H04 | 3 |
| 5.7 | Flagstaff, Arizona · since 2001 | source | H07 | 3 |
| 6.5 | France 2017 · Australia 2024 | source | G06 | 2 |
| 6.6 | ~2 h · ~5 h | label | G04 | 2 |
| 6.6 | Sharif et al., 2021 | source | G04 | 3 |
| 7.6 | QUIET HOURS (sign) | diegetic | SP-11 | — |
| 7.7 | What did it feel like? | speech bubble | SP-13 | 5 |

### Coverage against the Story Lock fact bank

* Fact bank IDs (Lock v4, ranges expanded): 60. Used in the narration: 52. On screen only: none.
* **In the fact bank but not narrated** — each with its reason:

| ID | Reason |
|---|---|
| B02 | Still not narrated: the build-up claim (adenosine as one of the signals behind sleep pressure) would need a hedge and more time. Caffeine's effect is now explained with B03 alone: 'Coffee blocks a sleep signal called adenosine. The hourglass keeps filling anyway.' |
| B04 | Shown, not said: the picture draws the master clock deep in the brain; the narration says 'a body clock'. |
| B07 | Not narrated as research; its sanctioned wording 'your body's signal of night' is used once, in chapter 3, resting on B06. |
| B08 | Not narrated; governs the chapter 3 picture (the glow thins, never to zero) and the partial verb 'fades'. |
| G05 | Listed in the Lock v4 FACT BANK by mistake: it hasn't been narrated since v3 (it now only grounds SP-10). Errata added to the Story Lock. |
| HR6 | Background rule, shown rather than said: Mia lying in bed (3.4); lying on the hill (8.7). |
| SP-16 | Optional; not used (Lock decision 4 — no room). |

* **Narrated but not listed in the Lock's fact bank:** A09, CALC-02, SP-20, SP-21, SP-22 — CALC-02 and I01 were in the Lock's draft beats but missing from its fact-bank line; SP-20, SP-21 and SP-22 are bookkeeping IDs added in ledger v4.1 for approved beats.

---

## 3 · Timeline audit

Reference years: every year from 2026 to 2060 in which 12 September is a Monday — **2033, 2039, 2044, 2050**. Each is checked; the weekday of Year 10 dates differs by year and is never shown on screen.

| Year 0 | Year 10 | Last sleep | Moment zero | May message | Hook | Train | Term starts |
|---|---|---|---|---|---|---|---|
| 2033 | 2043 | Mon 12 → Tue 13 Sep | Tue 13 Sep, 22:00 | Tue 12 May | Mon 14 Sep, 03:00 | Mon 14 Sep | Tue 15 Sep |
| 2039 | 2049 | Mon 12 → Tue 13 Sep | Tue 13 Sep, 22:00 | Wed 12 May | Tue 14 Sep, 03:00 | Tue 14 Sep | Wed 15 Sep |
| 2044 | 2054 | Mon 12 → Tue 13 Sep | Tue 13 Sep, 22:00 | Tue 12 May | Mon 14 Sep, 03:00 | Mon 14 Sep | Tue 15 Sep |
| 2050 | 2060 | Mon 12 → Tue 13 Sep | Tue 13 Sep, 22:00 | Wed 12 May | Tue 14 Sep, 03:00 | Tue 14 Sep | Wed 15 Sep |

### Moment zero — the calculation

**Definition:** moment zero = the beginning of the first night without sleep, **Tuesday 13 September, 22:00, Year 0** (local time in the story's city, on summer time). Tuesday 13 September, 22:00 — the hour Leo's family would normally go to bed, and the beat where the change is first experienced: 'That night, nobody gets tired' (3.2). The biological change itself happens unseen earlier that day (HR8).

| Reference years | Moment zero + 10 years | Days elapsed | Hook | Hook − (moment zero + 10 years) | End of last sleep → hook | Hook − 10 years |
|---|---|---|---|---|---|---|
| 2033 → 2043 | Sun 13 Sep, 22:00 | 3,652 | Mon 14 Sep, 03:00 | +5 h | 10 years + 20 h | Wed 14 Sep, 03:00 (Year 0) |
| 2039 → 2049 | Mon 13 Sep, 22:00 | 3,653 | Tue 14 Sep, 03:00 | +5 h | 10 years + 20 h | Wed 14 Sep, 03:00 (Year 0) |
| 2044 → 2054 | Sun 13 Sep, 22:00 | 3,652 | Mon 14 Sep, 03:00 | +5 h | 10 years + 20 h | Wed 14 Sep, 03:00 (Year 0) |
| 2050 → 2060 | Mon 13 Sep, 22:00 | 3,653 | Tue 14 Sep, 03:00 | +5 h | 10 years + 20 h | Wed 14 Sep, 03:00 (Year 0) |

Days elapsed differ by year only because of how many 29 Februaries fall in the ten years; every narrated span holds in every reference year.


### Checks

| Check | Result | Detail |
|---|---|---|
| The last sleep is a Monday night in September | ✅ | Monday 12 September 22:30 → Tuesday 13 September 07:00 in every reference year (2033, 2039, 2044, 2050) |
| Day 1 is the Tuesday | ✅ | 13 September 2033 is a Tuesday |
| Events run in order (Year 0 and Year 10) | ✅ | T01 → T02 → T03 → T04 → T05 → T06 → T07 → T07b → T08 → T09 → T10 → T11 → T12 → T13 → T14 |
| Train leaves after the 03:00 scene, same morning | ✅ | train 14 Sep, 07:00 is 4 h after the 03:00 scene — 'My train's at seven' |
| Back from the hill before the train | ✅ | leave the hill ≈ 05:00, about an hour's drive, train 07:00 |
| Programme starts the day after she travels | ✅ | train 14 Sep, term starts 15 Sep |
| 'She leaves tomorrow' (packing on 13 September) | ✅ | packing 13 Sep evening → train 14 Sep |
| May message is months earlier, not the same night | ✅ | 12 May → 13 September = 4 months before she leaves |
| Moment zero = the beat that shows it (3.2, 'That night, nobody gets tired') | ✅ | the beginning of the first night without sleep: Tuesday 13 September, 22:00, Year 0 |
| The last sleep ends before moment zero | ✅ | last sleep Mon 22:30 → Tue 07:00; moment zero Tue 22:00 |
| The hook falls in the night that begins exactly ten years after moment zero | ✅ | moment zero + 10 years = 13 September, 22:00 (3,652 days in this reference year); hook 14 September, 03:00 = moment zero + 10 years + 5 h |
| 'Nobody here has slept… in ten years' (1.3) is literally true at the hook | ✅ | end of the last sleep 13 Sep Year 0, 07:00 → hook = 10 years + 20 h |
| Ten years before the hook falls inside the first sleepless night | ✅ | hook − 10 years = Wed 14 September, 03:00, Year 0 — between moment zero and the sunrise beat |
| 'TEN YEARS EARLIER' (1.7) jumps back ten whole years | ✅ | hook → 2.1 (Monday night) = 10 years + 1 day + 5 h |
| 'TEN YEARS FROM NOW' (1.3), counted from 'Tonight… sleep' (1.4) | ✅ | start of the last sleep → hook = 10 years + 1 day + 4 h + 30 min |
| 'Imagine it's ten years on' (7.1): every dated chapter 7 scene is ten years on, rounded | ✅ | 7.8a 9.66 years after moment zero; 7.8b 9.66 years after moment zero; 7.8c 10.00 years after moment zero; 7.8d 10.00 years after moment zero |
| Leo's ages follow the years | ✅ | Y0: 15 → Y1: 16 → Y3: 18 → Y10: 25 |
| Mia's ages follow the years | ✅ | Y0: 8 → Y1: 9 → Y3: 11 → Y10: 18 |
| Age gap Leo–Mia is constant | ✅ | 7 years |
| 1.2 picture: Leo (25) in Year 10 | ✅ | expected 25 |
| 2.1 picture: Leo (15) in Year 0 | ✅ | expected 15 |
| 2.1 picture: Mia (8) in Year 0 | ✅ | expected 8 |
| 3.1 picture: Mia (8) in Year 0 | ✅ | expected 8 |
| 3.1 picture: Leo (15) in Year 0 | ✅ | expected 15 |
| 5.4 picture: Mia (9) in Year 1 | ✅ | expected 9 |
| 5.4 picture: Leo (16) in Year 1 | ✅ | expected 16 |
| 6.3 picture: Leo (18) in Year 3 | ✅ | expected 18 |
| 6.3 narration: 'eighteen' (Leo) in Year 3 | ✅ | expected 18 |
| 6.4 picture: Mia (11) in Year 3 | ✅ | expected 11 |
| 7.1 narration: 'twenty-five' (Leo) in Year 10 | ✅ | expected 25 |
| 7.8c picture: Mia (18) in Year 10 | ✅ | expected 18 |
| 8.2 picture: Mia (18) in Year 10 | ✅ | expected 18 |
| 1.1 on-screen clock 3:00 | ✅ | story time Y10-09-14 03:00 |
| 2.1 wall calendar 12 SEP | ✅ | story time Y0-09-12 22:00 |
| 3.2 on-screen clock 10:00 | ✅ | story time Y0-09-13 22:00 |
| 5.1 on-screen clock 0:00 | ✅ | story time Y1 00:00 |
| 7.3 on-screen clock 3:00 | ✅ | story time Y10 03:00 |
| 7.8a on-screen 12 MAY · 03:02 | ✅ | = this beat's story time (Y10-05-12 03:02) |
| 7.8c letter: term starts 15 September | ✅ | = timeline T14 |
| 7.8c on-screen 14 SEP · 07:00 | ✅ | matches timeline event T13; beat is Y10-09-13 20:00 |
| 7.8c ticket is for 'tomorrow' | ✅ | 1 day(s) after the packing scene |
| 7.8d on-screen clock 3:00 | ✅ | story time Y10-09-14 03:00 |
| 8.3 on-screen clock 3:02 | ✅ | story time Y10-09-14 03:02 |
| 2.1 label “MONDAY — THE LAST NIGHT ANYONE SLEEPS” | ✅ | story time Y0-09-12 22:00 · Monday in every reference year |
| 3.1 label “TUESDAY” | ✅ | story time Y0-09-13 07:30 · Tuesday in every reference year |
| 3.5 label “4 A.M.” | ✅ | story time Y0-09-14 04:00 |
| 7.8a label “12 MAY · 3:02 A.M.” | ✅ | story time Y10-05-12 03:02 |
| 7.8c label “13 SEPTEMBER · 8 P.M.” | ✅ | story time Y10-09-13 20:00 |
| 7.8d label “14 SEPTEMBER · 3 A.M.” | ✅ | story time Y10-09-14 03:00 |
| 7.8c 'She leaves tomorrow' | ✅ | said over 13 Sep, 20:00; train 14 Sep, 07:00 = the next calendar day |
| 7.8d 'Which brings us back to three a.m.' | ✅ | this beat 14 Sep, 03:00; next beat 8.1 14 Sep, 03:00; the hook (T09) 14 Sep, 03:00 |
| 8.2 'My train's at seven' | ✅ | said at 14 Sep, 03:01; train 14 Sep, 07:00 — 3 h 59 min later, the same day |
| Leo: some birthday fits every dated age | ✅ | birthday 15 Sep – 12 May — ages 15 on 13 Sep of Year 0, 25 on 12 May of Year 10, 25 on 14 Sep of Year 10 |
| Mia: some birthday fits every dated age | ✅ | birthday any day except 14 Sep — ages 8 on 13 Sep of Year 0, 18 on 13 Sep of Year 10, 18 on 14 Sep of Year 10 |
| London-like city: 04:00 on 14 Sep is still night (sun below −12°) | ✅ | sun at -22.6° (stars clearly visible) |
| London-like city: 05:00 on 14 Sep is still night (sun below −12°) | ✅ | sun at -14.7° (stars clearly visible) |
| London-like city: 'Twenty-four hours awake' at sunrise on Wednesday 14 Sep | ✅ | up Tue 07:00 → sunrise Wed 06:35 BST = 23.6 h awake |
| Paris-like city: 04:00 on 14 Sep is still night (sun below −12°) | ✅ | sun at -30.1° (stars clearly visible) |
| Paris-like city: 05:00 on 14 Sep is still night (sun below −12°) | ✅ | sun at -22.9° (stars clearly visible) |
| Paris-like city: 'Twenty-four hours awake' at sunrise on Wednesday 14 Sep | ✅ | up Tue 07:00 → sunrise Wed 07:27 CEST = 24.4 h awake |
| New York-like city: 04:00 on 14 Sep is still night (sun below −12°) | ✅ | sun at -28.5° (stars clearly visible) |
| New York-like city: 05:00 on 14 Sep is still night (sun below −12°) | ✅ | sun at -18.4° (stars clearly visible) |
| New York-like city: 'Twenty-four hours awake' at sunrise on Wednesday 14 Sep | ✅ | up Tue 07:00 → sunrise Wed 06:37 EDT = 23.6 h awake |

### Scene clock — from the May message to the train

In story order. The hook (film time 0:00) and chapter 8 are the same night as 7.8d.

| Beat | Film time | On-screen label | Story date and time (Year 10) | Before the 07:00 train |
|---|---|---|---|---|
| 7.8a | 6:41.1 | 12 MAY · 3:02 A.M. | 12 May, 03:02 | 125 days 3 h |
| 7.8b | 6:47.1 | — | 12 May, 03:10 | 125 days 3 h |
| 7.8c | 6:51.1 | 13 SEPTEMBER · 8 P.M. | 13 September, 20:00 | 11 h 00 min |
| 1.1 | 0:00.0 | — | 14 September, 03:00 | 4 h 00 min |
| 1.2 | 0:03.2 | — | 14 September, 03:00 | 4 h 00 min |
| 1.3 | 0:04.2 | TEN YEARS FROM NOW | 14 September, 03:00 | 4 h 00 min |
| 7.8d | 6:57.1 | 14 SEPTEMBER · 3 A.M. | 14 September, 03:00 | 4 h 00 min |
| 8.1 | 7:00.1 | — | 14 September, 03:00 | 4 h 00 min |
| 8.2 | 7:03.1 | — | 14 September, 03:01 | 3 h 59 min |
| 8.3 | 7:10.6 | — | 14 September, 03:02 | 3 h 58 min |
| 8.4 | 7:16.6 | — | 14 September, 03:03 | 3 h 57 min |
| 8.5 | 7:18.6 | — | 14 September, 03:15 | 3 h 45 min |
| 8.6 | 7:23.1 | — | 14 September, 04:00 | 3 h 00 min |
| 8.7 | 7:25.6 | — | 14 September, 04:05 | 2 h 55 min |
| 8.8 | 7:32.1 | — | 14 September, 04:10 | 2 h 50 min |
| train | — | ticket 13 SEP · 07:00 | 14 September, 07:00 | — |
| term | — | letter TERM STARTS 14 SEPTEMBER | 15 September | the next day |

**Birthdays that fit every dated age:** Leo: 15 Sep – 12 May · Mia: any day except 14 Sep


### The night sky (NOAA solar-position algorithm, Year 0 = 2033, Year 10 = 2043)

| Site | Year 10, 14 Sep: astronomical dawn | nautical dawn | sunrise | sun at 03:10 | at 04:00 | at 05:00 | Year 0, Wed 14 Sep sunrise |
|---|---|---|---|---|---|---|---|
| London-like city (51.5°, BST) | 04:37 | 05:20 | 06:34 | -28.1° | -22.6° | -14.7° | 06:35 |
| Paris-like city (48.9°, CEST) | 05:36 | 06:16 | 07:26 | -34.5° | -30.1° | -22.9° | 07:27 |
| New York-like city (40.7°, EDT) | 05:03 | 05:36 | 06:36 | -35.8° | -28.5° | -18.4° | 06:37 |

The story's city is never named; the check uses three typical northern cities on summer time. Below −18° the sky is fully dark; between −18° and −12° it is still night to the eye, with the stars clearly out.

---

## 4 · Per-beat speaking-rate audit

Rule (Standard §6, item 14): words ÷ beat seconds ≤ **160 wpm**, emotional beats ≤ **145 wpm**. *Est. speech* = words at the voice's measured speaking rate (192 wpm) + 0.25 s per dash, 0.35 s per ellipsis, 0.3 s between sentences — an estimate, shown so tight beats stand out; the rule itself uses the planned beat length.

| Beat | Start–end | Length | Words | wpm | Limit | Est. speech | Slack | Result |
|---|---|---|---|---|---|---|---|---|
| 1.1 | 0:00.0–0:03.2 | 3.2 s | 8 | 150 | 160 | 2.8 s | +0.2 s | ✅ |
| 1.2 | 0:03.2–0:04.2 | 1 s | 0 | 0 | 160 | 0.0 s | +1.0 s | ✅ |
| 1.3 | 0:04.2–0:10.2 | 6 s | 14 | 140 | 160 | 5.3 s | +0.7 s | ✅ |
| 1.4 | 0:10.2–0:19.7 | 9.5 s | 23 | 145 | 160 | 7.8 s | +1.7 s | ✅ |
| 1.5 | 0:19.7–0:26.2 | 6.5 s | 16 | 148 | 160 | 6.2 s | +0.2 s | ✅ |
| 1.6 | 0:26.2–0:36.7 | 10.5 s | 26 | 149 | 160 | 8.7 s | +1.8 s | ✅ |
| 1.7 | 0:36.7–0:38.7 | 2 s | 0 | 0 | 160 | 0.0 s | +2.0 s | ✅ |
| 2.1 | 0:38.7–0:42.5 | 3.8 s | 9 | 142 | 160 | 3.1 s | +0.7 s | ✅ |
| 2.2 | 0:42.5–0:58.5 | 16 s | 40 | 150 | 160 | 13.4 s | +2.6 s | ✅ |
| 2.3 | 0:58.5–1:04.9 | 6.4 s | 16 | 150 | 160 | 5.6 s | +0.8 s | ✅ |
| 2.4 | 1:04.9–1:20.1 | 15.2 s | 38 | 150 | 160 | 13.0 s | +2.2 s | ✅ |
| 2.5 | 1:20.1–1:31.3 | 11.2 s | 28 | 150 | 160 | 9.9 s | +1.2 s | ✅ |
| 2.6 | 1:31.3–1:41.6 | 10.3 s | 26 | 151 | 160 | 9.7 s | +0.6 s | ✅ |
| 3.1 ♥ | 1:41.6–1:49.6 | 8 s | 14 | 105 | 145 | 5.5 s | +2.5 s | ✅ |
| 3.2 | 1:49.6–1:54.6 | 5 s | 11 | 132 | 160 | 4.3 s | +0.7 s | ✅ |
| 3.3 | 1:54.6–2:07.6 | 13 s | 32 | 148 | 160 | 10.6 s | +2.4 s | ✅ |
| 3.4 ♥ | 2:07.6–2:09.6 | 2 s | 0 | 0 | 145 | 0.0 s | +2.0 s | ✅ |
| 3.5 | 2:09.6–2:23.6 | 14 s | 34 | 146 | 160 | 11.8 s | +2.2 s | ✅ |
| 3.6 | 2:23.6–2:34.6 | 11 s | 26 | 142 | 160 | 9.4 s | +1.6 s | ✅ |
| 4.1 | 2:34.6–2:41.1 | 6.5 s | 16 | 148 | 160 | 5.3 s | +1.2 s | ✅ |
| 4.2 | 2:41.1–2:53.6 | 12.5 s | 31 | 149 | 160 | 10.9 s | +1.6 s | ✅ |
| 4.3 | 2:53.6–2:55.6 | 2 s | 5 | 150 | 160 | 1.9 s | +0.1 s | ✅ |
| 4.4 | 2:55.6–3:19.1 | 23.5 s | 59 | 151 | 160 | 21.8 s | +1.7 s | ✅ |
| 4.5 | 3:19.1–3:34.1 | 15 s | 37 | 148 | 160 | 12.8 s | +2.2 s | ✅ |
| 4.6 ♥ | 3:34.1–3:43.1 | 9 s | 21 | 140 | 145 | 7.5 s | +1.5 s | ✅ |
| 5.1 | 3:43.1–3:51.1 | 8 s | 20 | 150 | 160 | 7.2 s | +0.8 s | ✅ |
| 5.2 | 3:51.1–4:01.6 | 10.5 s | 26 | 149 | 160 | 9.1 s | +1.4 s | ✅ |
| 5.3 | 4:01.6–4:05.6 | 4 s | 9 | 135 | 160 | 3.4 s | +0.6 s | ✅ |
| 5.4 | 4:05.6–4:11.6 | 6 s | 13 | 130 | 160 | 5.0 s | +1.0 s | ✅ |
| 5.5 | 4:11.6–4:23.6 | 12 s | 30 | 150 | 160 | 10.0 s | +2.0 s | ✅ |
| 5.6 | 4:23.6–4:36.1 | 12.5 s | 31 | 149 | 160 | 10.6 s | +1.9 s | ✅ |
| 5.7 | 4:36.1–4:50.6 | 14.5 s | 33 | 137 | 160 | 12.1 s | +2.4 s | ✅ |
| 6.1 | 4:50.6–4:55.6 | 5 s | 12 | 144 | 160 | 4.0 s | +1.0 s | ✅ |
| 6.2 | 4:55.6–5:07.6 | 12 s | 30 | 150 | 160 | 10.9 s | +1.1 s | ✅ |
| 6.3 | 5:07.6–5:14.6 | 7 s | 15 | 129 | 160 | 5.6 s | +1.4 s | ✅ |
| 6.4 ♥ | 5:14.6–5:18.1 | 3.5 s | 2 | 34 | 145 | 0.6 s | +2.9 s | ✅ |
| 6.5 | 5:18.1–5:31.1 | 13 s | 32 | 148 | 160 | 10.9 s | +2.1 s | ✅ |
| 6.6 | 5:31.1–5:47.1 | 16 s | 38 | 142 | 160 | 13.7 s | +2.3 s | ✅ |
| 6.7 ♥ | 5:47.1–5:53.1 | 6 s | 13 | 130 | 145 | 4.4 s | +1.6 s | ✅ |
| 6.8 ♥ | 5:53.1–5:57.1 | 4 s | 8 | 120 | 145 | 2.8 s | +1.2 s | ✅ |
| 7.1 | 5:57.1–6:01.1 | 4 s | 7 | 105 | 160 | 2.5 s | +1.5 s | ✅ |
| 7.2 | 6:01.1–6:05.1 | 4 s | 9 | 135 | 160 | 2.8 s | +1.2 s | ✅ |
| 7.3 | 6:05.1–6:11.6 | 6.5 s | 14 | 129 | 160 | 5.0 s | +1.5 s | ✅ |
| 7.4 | 6:11.6–6:16.1 | 4.5 s | 9 | 120 | 160 | 3.1 s | +1.4 s | ✅ |
| 7.5 | 6:16.1–6:22.1 | 6 s | 15 | 150 | 160 | 5.3 s | +0.7 s | ✅ |
| 7.6 | 6:22.1–6:32.1 | 10 s | 24 | 144 | 160 | 8.4 s | +1.6 s | ✅ |
| 7.7 | 6:32.1–6:41.1 | 9 s | 17 | 113 | 160 | 6.0 s | +3.0 s | ✅ |
| 7.8a | 6:41.1–6:47.1 | 6 s | 9 | 90 | 160 | 3.1 s | +2.9 s | ✅ |
| 7.8b ♥ | 6:47.1–6:51.1 | 4 s | 8 | 120 | 145 | 2.5 s | +1.5 s | ✅ |
| 7.8c ♥ | 6:51.1–6:57.1 | 6 s | 14 | 140 | 145 | 5.0 s | +1.0 s | ✅ |
| 7.8d | 6:57.1–7:00.1 | 3 s | 7 | 140 | 160 | 2.2 s | +0.8 s | ✅ |
| 8.1 | 7:00.1–7:03.1 | 3 s | 7 | 140 | 160 | 2.2 s | +0.8 s | ✅ |
| 8.2 ♥ | 7:03.1–7:10.6 | 7.5 s | 17 | 136 | 145 | 6.5 s | +1.0 s | ✅ |
| 8.3 ♥ | 7:10.6–7:16.6 | 6 s | 4 | 40 | 145 | 1.2 s | +4.8 s | ✅ |
| 8.4 ♥ | 7:16.6–7:18.6 | 2 s | 0 | 0 | 145 | 0.0 s | +2.0 s | ✅ |
| 8.5 ♥ | 7:18.6–7:23.1 | 4.5 s | 9 | 120 | 145 | 2.8 s | +1.7 s | ✅ |
| 8.6 ♥ | 7:23.1–7:25.6 | 2.5 s | 0 | 0 | 145 | 0.0 s | +2.5 s | ✅ |
| 8.7 ♥ | 7:25.6–7:32.1 | 6.5 s | 13 | 120 | 145 | 4.7 s | +1.8 s | ✅ |
| 8.8 ♥ | 7:32.1–7:36.1 | 4 s | 7 | 105 | 145 | 2.5 s | +1.5 s | ✅ |
| 8.9 ♥ | 7:36.1–7:47.1 | 11 s | 26 | 142 | 145 | 8.8 s | +0.7 s | ✅ |
| 8.10 ♥ | 7:47.1–7:55.1 | 8 s | 17 | 128 | 145 | 5.7 s | +2.3 s | ✅ |
| 8.11 | 7:55.1–7:56.6 | 1.5 s | 0 | 0 | 160 | 0.0 s | +1.5 s | ✅ |

♥ = emotional beat (lower limit).

### Chapters against the brief's windows (±15 %)

| # | Chapter | Window | Planned | Length | Δ | Words | Pace | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | The Impossible Question | 0:00–0:35 (35 s) | 0:00–0:39 | 38.7 s | +10.6 % | 87 | 135 wpm | ✅ |
| 2 | The Biological Breakthrough | 0:35–1:30 (55 s) | 0:39–1:42 | 62.9 s | +14.4 % | 157 | 150 wpm | ✅ |
| 3 | The First 24 Hours | 1:30–2:20 (50 s) | 1:42–2:35 | 53.0 s | +6.0 % | 117 | 132 wpm | ✅ |
| 4 | The World Economy | 2:20–3:20 (60 s) | 2:35–3:43 | 68.5 s | +14.2 % | 169 | 148 wpm | ✅ |
| 5 | A City That Never Sleeps | 3:20–4:20 (60 s) | 3:43–4:51 | 67.5 s | +12.5 % | 162 | 144 wpm | ✅ |
| 6 | The Hidden Cost | 4:20–5:30 (70 s) | 4:51–5:57 | 66.5 s | -5.0 % | 150 | 135 wpm | ✅ |
| 7 | Ten Years Later | 5:30–6:40 (70 s) | 5:57–7:00 | 63.0 s | -10.0 % | 133 | 127 wpm | ✅ |
| 8 | The Final Question | 6:40–7:30 (50 s) | 7:00–7:57 | 56.5 s | +13.0 % | 100 | 106 wpm | ✅ |

* **Runtime:** 7:56.6 planned (Story Lock v4: 7:50; brief: about 7–8 minutes). Speech alone at Video #1's overall 141 wpm: 7:37.4.
* **Fastest beat:** 2.6 at 151 wpm. Beats at or above 150 wpm: 1.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.3, 4.4, 5.1, 5.5, 6.2, 7.5.
* **Opening sync:** narration from 0:00.2; the line is estimated to end at 0:02.95; the earliest allowed cut (+4 frames) is 0:03.08; planned cut 0:03.2 → ✅ the full playground is on screen for the whole line.

