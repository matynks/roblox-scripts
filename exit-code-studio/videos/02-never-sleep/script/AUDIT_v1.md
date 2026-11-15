# Script audit — What If Humans Never Needed Sleep? · script v1

Computed by `tools/script_audit.py` from `script_v1.json`, the [claim ledger](../docs/02_CLAIM_LEDGER.md), the [research sources](../docs/01_RESEARCH.md) and the [Story Lock](../docs/04_STORY_LOCK.md). Nothing here is estimated by hand. The checker first passes its own 14 known-answer tests.

## Result

* **Errors (fail): 0** — every check passed.
* **Warnings (review): 8**
  * ⚠️ chapter 2: +13.6 % — within 2 points of the ±15 % limit
  * ⚠️ chapter 4: +14.2 % — within 2 points of the ±15 % limit
  * ⚠️ first three seconds: thumbnail shot at 3.2 s (Standard v1.3 said within 3 s) — required by production requirement 3; Standard v1.4 rewords the rule
  * ⚠️ script metric: Average words per sentence = 6.16 (target 4–5 (flag above 5.5))
  * ⚠️ script metric: Sentences of 4 words or fewer = 39.9 % (target 45–55 %)
  * ⚠️ script metric: you / your per 100 words = 3.2 (target ~5–8 (documentary chapters lower))
  * ⚠️ 2.2 sentence 18: 19 words — check breath and delivery → “In one study, people sleeping six hours or less had about four times the odds of catching a cold.”
  * ⚠️ 4.4 sentence 69: 23 words — check breath and delivery → “In twenty sixteen, RAND estimated that lack of sleep cost the US economy up to four hundred and eleven billion dollars a year.”

**Totals:** 173 sentences · 1066 spoken words (1019 narration, 47 dialogue) · planned runtime 7:56.2 · 62 beats · paste text 6,255 characters (also split into 2 parts under 5,000).

---

## 1 · Sentence-level script audit

### Script metrics (reference engine targets, Production Standard §6)

| Metric | This script | Narration only | Target | Video #1 | Result |
|---|---|---|---|---|---|
| Average words per sentence | 6.16 | 6.41 | 4–5 (flag above 5.5) | 5.4 | ⚠️ off target |
| Sentences of 4 words or fewer | 39.9 % | 36.5 % | 45–55 % | 49.5 % | ⚠️ off target |
| Questions | 15 | 14 | ~14–20 | 18 | ✅ |
| Ellipses (pause cues) | 14 | 14 | ~12–24 | n/a | ✅ |
| you / your per 100 words | 3.2 | 3.2 | ~5–8 (documentary chapters lower) | 7.9 | ⚠️ off target |
| Words | 1066 | 1019 | ≈ 1,050 for 7:30 | 1,036 | ✅ |
| Sentences | 173 | 159 | — | — | — |

**By chapter:**

| Ch | Sentences | Words | Avg words | ≤ 4 words | Questions | Ellipses | you/your per 100 |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 86 | 6.1 | 50 % | 1 | 2 | 2.3 |
| 2 | 23 | 152 | 6.6 | 30 % | 4 | 1 | 5.3 |
| 3 | 21 | 121 | 5.8 | 38 % | 2 | 1 | 6.6 |
| 4 | 27 | 168 | 6.2 | 44 % | 3 | 1 | 0.6 |
| 5 | 26 | 160 | 6.2 | 38 % | 1 | 2 | 1.2 |
| 6 | 26 | 146 | 5.6 | 50 % | 2 | 2 | 3.4 |
| 7 | 20 | 132 | 6.6 | 20 % | 1 | 4 | 1.5 |
| 8 | 16 | 101 | 6.3 | 50 % | 1 | 1 | 5.9 |

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
| 10 | 1.5 | NARRATOR | Not sick. | 2 | RULE | HR3 | hypothetical |
| 11 | 1.5 | NARRATOR | Just… awake. | 2 | RULE | HR1 | hypothetical |
| 12 | 1.6 | NARRATOR | This is the first twenty-four hours. | 6 | PROMISE | FRAME | frame |
| 13 | 1.6 | NARRATOR | The next ten years. | 4 | PROMISE | FRAME | frame |
| 14 | 1.6 | NARRATOR | And why, in this world, a whole generation of kids has never had a single dream. | 16 | PROMISE | HR5 | hypothetical |
| 15 | 2.1 | MUM | Goodnight, you two. | 3 | SETUP | STORY | story |
| 16 | 2.1 | NARRATOR | First, what does sleep actually do? | 6 | QUESTION | FRAME | frame |
| 17 | 2.2 | NARRATOR | Studies suggest it helps lock in what you learned. | 9 | EVIDENCE | C01 | research |
| 18 | 2.2 | NARRATOR | In one study, people sleeping six hours or less had about four times the odds of catching a cold. | 19 | EVIDENCE | C03 | research |
| 19 | 2.2 | NARRATOR | In another, after six short nights, young men handled blood sugar worse. | 12 | EVIDENCE | C05 | research |
| 20 | 2.3 | NARRATOR | Some of it, nobody fully understands. | 6 | UNKNOWN | D01 | unknown |
| 21 | 2.3 | NARRATOR | What's REM sleep for? | 4 | QUESTION | D02 | unknown |
| 22 | 2.3 | NARRATOR | Does sleep really clean the brain? | 6 | QUESTION | D04 | unknown |
| 23 | 2.3 | NARRATOR | Scientists still disagree. | 3 | UNKNOWN | D02 · D04 | unknown |
| 24 | 2.4 | NARRATOR | But two systems decide when you get sleepy. | 8 | FACT | B01 | established |
| 25 | 2.4 | NARRATOR | An hourglass — pressure that builds while you're awake. | 8 | FACT | B01 | established |
| 26 | 2.4 | NARRATOR | Coffee masks it. | 3 | FACT | B03 | established |
| 27 | 2.4 | NARRATOR | And a clock deep in your brain, reset every day, mainly by light. | 13 | FACT | B04 · B05 | established |
| 28 | 2.5 | NARRATOR | A breakthrough would have to stop the hourglass. | 8 | RULE | HR2 | hypothetical |
| 29 | 2.5 | NARRATOR | And do all of sleep's work while you're awake. | 9 | RULE | HR3 | hypothetical |
| 30 | 2.5 | NARRATOR | Even the parts we don't understand. | 6 | UNKNOWN | HR3 · D01 | unknown |
| 31 | 2.5 | NARRATOR | How? | 1 | QUESTION | HR8 | hypothetical |
| 32 | 2.5 | NARRATOR | Nobody knows. | 2 | RULE | HR8 | hypothetical |
| 33 | 2.5 | NARRATOR | That's the thought experiment. | 4 | RULE | HR8 | hypothetical |
| 34 | 2.6 | NARRATOR | In this world, you're never tired. | 6 | RULE | HR2 | hypothetical |
| 35 | 2.6 | NARRATOR | Going without sleep never hurts. | 5 | RULE | HR3 | hypothetical |
| 36 | 2.6 | NARRATOR | Your body clock keeps ticking. | 5 | RULE | HR4 | hypothetical |
| 37 | 2.6 | NARRATOR | And with no sleep… nobody dreams. | 6 | RULE | HR5 | hypothetical |
| 38 | 3.1 | MIA | Look — it's us, on the hill! | 6 | DIALOGUE | STORY | story |
| 39 | 3.1 | MIA | Can we go? | 3 | DIALOGUE | STORY | story |
| 40 | 3.1 | LEO | Sure. | 1 | DIALOGUE | STORY | story |
| 41 | 3.1 | LEO | When I have time. | 4 | SETUP | STORY | story |
| 42 | 3.2 | NARRATOR | That night, nobody gets tired. | 5 | RULE | HR2 | hypothetical |
| 43 | 3.2 | NARRATOR | Not you. | 2 | RULE | HR2 | hypothetical |
| 44 | 3.2 | NARRATOR | Not Mum. | 2 | RULE | HR2 | hypothetical |
| 45 | 3.2 | NARRATOR | Not anyone. | 2 | RULE | HR2 | hypothetical |
| 46 | 3.3 | NARRATOR | So what do you do with eight extra hours? | 9 | QUESTION | CALC-02 | hypothetical |
| 47 | 3.3 | NARRATOR | By one a.m., the city is training, gaming, painting, studying. | 10 | CONSEQUENCE | SP-22 | speculative |
| 48 | 3.3 | NARRATOR | And one man in a grey suit is booking meetings for three a.m. | 13 | SETUP | STORY · SP-01 | speculative |
| 49 | 3.5 | NARRATOR | In the dark, a tiny gland in your brain still releases melatonin. | 12 | FACT | B06 · HR4 | hypothetical |
| 50 | 3.5 | NARRATOR | Your body's signal of night. | 5 | FACT | B06 · HR4 | hypothetical |
| 51 | 3.5 | NARRATOR | Switch on a bright light, and it fades. | 8 | FACT | B06 · HR4 | hypothetical |
| 52 | 3.5 | NARRATOR | You're not tired. | 3 | RULE | HR2 | hypothetical |
| 53 | 3.5 | NARRATOR | Your body just knows it's night. | 6 | RULE | HR4 | hypothetical |
| 54 | 3.6 | NARRATOR | Twenty-four hours awake… and you feel fine. | 7 | RULE | HR3 | hypothetical |
| 55 | 3.6 | NARRATOR | You just got eight hours back. | 6 | CONSEQUENCE | CALC-02 | hypothetical |
| 56 | 3.6 | NARRATOR | Almost three thousand hours a year. | 6 | CONSEQUENCE | CALC-02 | hypothetical |
| 57 | 3.6 | NARRATOR | Eight billion people did the same maths. | 7 | CONSEQUENCE | I01 · HR1 | hypothetical |
| 58 | 3.6 | NARRATOR | So did their bosses. | 4 | TRANSITION | SP-01 | speculative |
| 59 | 4.1 | NARRATOR | Overnight, humanity's waking time grows by about half. | 8 | CONSEQUENCE | CALC-03 | hypothetical |
| 60 | 4.1 | NARRATOR | Roughly the waking hours of four billion extra people. | 9 | CONSEQUENCE | CALC-03 | hypothetical |
| 61 | 4.2 | NARRATOR | Mr. Black's company becomes BLACK 24. | 6 | STORY | STORY · SP-01 | speculative |
| 62 | 4.2 | NARRATOR | It never closes. | 3 | CONSEQUENCE | SP-01 | speculative |
| 63 | 4.2 | NARRATOR | Even today, about one in six US workers doesn't work a regular daytime schedule. | 14 | FACT | G02 | established |
| 64 | 4.2 | NARRATOR | Now the night shift is just… a shift. | 8 | CONSEQUENCE | SP-01 | speculative |
| 65 | 4.3 | NARRATOR | Some jobs boom. | 3 | CONSEQUENCE | SP-02 | speculative |
| 66 | 4.3 | NARRATOR | Others shrink. | 2 | CONSEQUENCE | SP-03 | speculative |
| 67 | 4.4 | NARRATOR | Winners? | 1 | QUESTION | FRAME | frame |
| 68 | 4.4 | NARRATOR | Companies and customers. | 3 | CONSEQUENCE | SP-01 · SP-02 | speculative |
| 69 | 4.4 | NARRATOR | In twenty sixteen, RAND estimated that lack of sleep cost the US economy up to four hundred and eleven billion dollars a year. | 23 | EVIDENCE | G01 | research |
| 70 | 4.4 | NARRATOR | Missed work. | 2 | EVIDENCE | G01 | research |
| 71 | 4.4 | NARRATOR | Lower productivity. | 2 | EVIDENCE | G01 | research |
| 72 | 4.4 | NARRATOR | Earlier deaths. | 2 | EVIDENCE | G01 | research |
| 73 | 4.4 | NARRATOR | Here, that cost could fall. | 5 | CONSEQUENCE | SP-19 | speculative |
| 74 | 4.4 | NARRATOR | Though a nonstop world may bring new costs. | 8 | CONSEQUENCE | SP-19 | speculative |
| 75 | 4.4 | NARRATOR | Losers? | 1 | QUESTION | FRAME | frame |
| 76 | 4.4 | NARRATOR | Workers. | 1 | CONSEQUENCE | SP-02 | speculative |
| 77 | 4.4 | NARRATOR | When everyone can work more, your hour might be worth less. | 11 | CONSEQUENCE | SP-02 | speculative |
| 78 | 4.5 | NARRATOR | But more hours don't always mean more output. | 8 | EVIDENCE | G03 | research |
| 79 | 4.5 | NARRATOR | A study of First World War munitions factories found each hour past about forty-nine a week added less. | 18 | EVIDENCE | G03 | research |
| 80 | 4.5 | NARRATOR | Could people who never tire stay focused? | 7 | QUESTION | D05 | unknown |
| 81 | 4.5 | NARRATOR | Nobody knows. | 2 | UNKNOWN | D05 | unknown |
| 82 | 4.6 | NARRATOR | Mum takes BLACK 24's night shift. | 6 | STORY | STORY | story |
| 83 | 4.6 | NARRATOR | It pays more. | 3 | STORY | STORY | story |
| 84 | 4.6 | NARRATOR | Enough to start Mia's university fund. | 6 | SETUP | STORY | story |
| 85 | 4.6 | NARRATOR | Her chair at dinner stays empty. | 6 | SETUP | STORY | story |
| 86 | 5.1 | NARRATOR | Mum's train to work leaves at midnight. | 7 | STORY | STORY | story |
| 87 | 5.1 | NARRATOR | It's packed. | 2 | CONSEQUENCE | SP-01 | speculative |
| 88 | 5.1 | NARRATOR | New York's subway already runs all night. | 7 | FACT | H01 | established |
| 89 | 5.1 | NARRATOR | Now many cities try. | 4 | CONSEQUENCE | SP-05 | speculative |
| 90 | 5.2 | NARRATOR | But even today, London keeps its all-night Tube to weekends. | 10 | FACT | H08 | established |
| 91 | 5.2 | NARRATOR | Weeknights are for repairs. | 4 | FACT | H08 | established |
| 92 | 5.2 | NARRATOR | So in a city that never stops… when do you fix it? | 12 | QUESTION | SP-06 | speculative |
| 93 | 5.3 | NARRATOR | Dinner at three. | 3 | CONSEQUENCE | SP-01 | speculative |
| 94 | 5.3 | NARRATOR | Surgery at four. | 3 | CONSEQUENCE | SP-01 | speculative |
| 95 | 5.3 | NARRATOR | Concerts at five. | 3 | CONSEQUENCE | SP-01 | speculative |
| 96 | 5.4 | NARRATOR | Schools split into shifts. | 4 | CONSEQUENCE | SP-07 | speculative |
| 97 | 5.4 | NARRATOR | Mia's starts at eight a.m. | 5 | STORY | STORY | story |
| 98 | 5.4 | NARRATOR | Yours… at nine p.m. | 4 | STORY | STORY | story |
| 99 | 5.5 | NARRATOR | Lighting in homes, offices and streets already takes an estimated eight percent of the world's electricity. | 16 | EVIDENCE | H02 | research |
| 100 | 5.5 | NARRATOR | Keep it on all night, and demand climbs. | 8 | CONSEQUENCE | SP-08 | speculative |
| 101 | 5.5 | NARRATOR | Just when solar panels produce nothing. | 6 | CONSEQUENCE | SP-08 · H03 | speculative |
| 102 | 5.6 | NARRATOR | Over eighty percent of people already live under light-polluted skies. | 10 | FACT | H04 | established |
| 103 | 5.6 | NARRATOR | Here, the stars fade faster. | 5 | CONSEQUENCE | SP-09 | speculative |
| 104 | 5.6 | NARRATOR | Birds sing at the wrong hour. | 6 | CONSEQUENCE | SP-09 · H06 | speculative |
| 105 | 5.6 | NARRATOR | Turtle hatchlings lose their way to the sea. | 8 | CONSEQUENCE | SP-09 · H06 | speculative |
| 106 | 5.7 | NARRATOR | But not every place switches on. | 6 | CONSEQUENCE | SP-05 | speculative |
| 107 | 5.7 | NARRATOR | Some towns follow Flagstaff, Arizona — the world's first International Dark Sky City. | 12 | FACT | H07 · SP-05 | speculative |
| 108 | 5.7 | NARRATOR | They keep their nights dark. | 5 | CONSEQUENCE | SP-05 | speculative |
| 109 | 5.7 | NARRATOR | On purpose. | 2 | CONSEQUENCE | SP-05 | speculative |
| 110 | 5.7 | NARRATOR | Cities adapted in a year. | 5 | TRANSITION | SP-05 | speculative |
| 111 | 5.7 | NARRATOR | People took longer. | 3 | TRANSITION | SP-10 | speculative |
| 112 | 6.1 | NARRATOR | Do people spend more time together? | 6 | QUESTION | FRAME | frame |
| 113 | 6.1 | NARRATOR | At first, they do. | 4 | CONSEQUENCE | SP-20 | speculative |
| 114 | 6.2 | NARRATOR | Then the schedules split. | 4 | CONSEQUENCE | SP-10 | speculative |
| 115 | 6.2 | NARRATOR | Awake twenty-four hours a day… and almost never together. | 9 | CONSEQUENCE | SP-10 | speculative |
| 116 | 6.2 | NARRATOR | Nobody says goodnight anymore. | 4 | SETUP | SP-18 | speculative |
| 117 | 6.2 | NARRATOR | Your body clocks drift apart too. | 6 | CONSEQUENCE | SP-17 | speculative |
| 118 | 6.2 | NARRATOR | The lights never go off. | 5 | CONSEQUENCE | SP-17 | speculative |
| 119 | 6.3 | NARRATOR | At eighteen, you join BLACK 24 too. | 7 | STORY | STORY | story |
| 120 | 6.3 | NARRATOR | Nights. | 1 | STORY | STORY | story |
| 121 | 6.3 | NARRATOR | You're good at it. | 4 | STORY | STORY | story |
| 122 | 6.3 | NARRATOR | You're always available. | 3 | SETUP | STORY | story |
| 123 | 6.4 | LEO | Next week. | 2 | SETUP | STORY | story |
| 124 | 6.5 | NARRATOR | Sleep was the one excuse nobody could argue with. | 9 | THEME | SP-11 | speculative |
| 125 | 6.5 | NARRATOR | Now nobody's ever asleep. | 4 | CONSEQUENCE | HR1 | hypothetical |
| 126 | 6.5 | NARRATOR | France and Australia already give workers a right to disconnect. | 10 | FACT | G06 | established |
| 127 | 6.5 | NARRATOR | Work was leaking into our nights long before this. | 9 | FACT | G06 | established |
| 128 | 6.6 | NARRATOR | Would more time make you happier? | 6 | QUESTION | FRAME | frame |
| 129 | 6.6 | NARRATOR | Research suggests free time helps… up to about two hours a day. | 12 | EVIDENCE | G04 | research |
| 130 | 6.6 | NARRATOR | Past about five, well-being can actually dip. | 7 | EVIDENCE | G04 | research |
| 131 | 6.6 | NARRATOR | Unless that time goes into something productive. | 7 | EVIDENCE | G04 | research |
| 132 | 6.6 | NARRATOR | Some people flourish. | 3 | CONSEQUENCE | SP-12 | speculative |
| 133 | 6.6 | NARRATOR | Some just drift. | 3 | CONSEQUENCE | SP-12 | speculative |
| 134 | 6.7 | NARRATOR | Mia's notebook stays blank. | 4 | CONSEQUENCE | HR5 · SP-13 | speculative |
| 135 | 6.7 | NARRATOR | And science still can't say what dreams were for. | 9 | UNKNOWN | D03 | unknown |
| 136 | 6.8 | NARRATOR | We didn't lose sleep. | 4 | THEME | FRAME | frame |
| 137 | 6.8 | NARRATOR | We lost the night. | 4 | THEME | FRAME | frame |
| 138 | 7.1 | NARRATOR | Imagine it's ten years on. | 5 | TRANSITION | FRAME | frame |
| 139 | 7.1 | NARRATOR | You're twenty-five. | 2 | STORY | STORY | story |
| 140 | 7.2 | NARRATOR | From space, Earth's night side glows brighter than ever. | 9 | CONSEQUENCE | SP-09 | speculative |
| 141 | 7.3 | NARRATOR | Three a.m. is just another rush hour. | 7 | CALLBACK | SP-15 | speculative |
| 142 | 7.3 | NARRATOR | Days don't end anymore… they change shifts. | 7 | CONSEQUENCE | SP-15 | speculative |
| 143 | 7.4 | NARRATOR | Trains never stop. | 3 | CONSEQUENCE | SP-06 | speculative |
| 144 | 7.4 | NARRATOR | Robots fix the tunnels between them. | 6 | PAYOFF | SP-06 | speculative |
| 145 | 7.5 | NARRATOR | The economy is bigger. | 4 | CONSEQUENCE | SP-21 | speculative |
| 146 | 7.5 | NARRATOR | But for many people, the working week crept up… not down. | 11 | CONSEQUENCE | SP-11 | speculative |
| 147 | 7.6 | NARRATOR | Darkness is a luxury now. | 5 | CONSEQUENCE | SP-14 | speculative |
| 148 | 7.6 | NARRATOR | People travel just to see stars. | 6 | CONSEQUENCE | SP-14 | speculative |
| 149 | 7.6 | NARRATOR | Some countries pass night laws. | 5 | CONSEQUENCE | SP-11 | speculative |
| 150 | 7.6 | NARRATOR | Hours when nobody can be called to work. | 8 | CONSEQUENCE | SP-11 | speculative |
| 151 | 7.7 | NARRATOR | And the biggest change of all? | 6 | QUESTION | FRAME | frame |
| 152 | 7.7 | NARRATOR | A whole generation of children… who have never had a single dream. | 12 | PAYOFF | HR5 | hypothetical |
| 153 | 7.8a | NARRATOR | You run night operations at BLACK 24. | 7 | STORY | STORY | story |
| 154 | 7.8b | NARRATOR | Mum's nights paid for Mia's place at university. | 8 | PAYOFF | STORY | story |
| 155 | 7.8c | NARRATOR | She leaves tomorrow. | 3 | STORY | STORY | story |
| 156 | 7.8c | NARRATOR | To study the brain… and find out what dreams were for. | 11 | SETUP | STORY · D03 | unknown |
| 157 | 7.8d | NARRATOR | Which brings us back to three a.m. | 7 | TRANSITION | FRAME | frame |
| 158 | 8.1 | NARRATOR | You're at your desk, like every night. | 7 | CALLBACK | STORY | story |
| 159 | 8.2 | MIA | My train's at seven. | 4 | DIALOGUE | STORY | story |
| 160 | 8.2 | MIA | Come to the hill with me. | 6 | DIALOGUE | STORY | story |
| 161 | 8.2 | MIA | Just tonight. | 2 | DIALOGUE | STORY | story |
| 162 | 8.2 | LEO | I can't. | 2 | DIALOGUE | STORY | story |
| 163 | 8.2 | LEO | I'm on shift. | 3 | DIALOGUE | STORY | story |
| 164 | 8.3 | LEO | When Leo has time. | 4 | PAYOFF | STORY | story |
| 165 | 8.5 | NARRATOR | Out past the last streetlight, the stars come back. | 9 | PAYOFF | H04 · SP-09 | speculative |
| 166 | 8.7 | NARRATOR | No light up here holds back your body's signal of night. | 11 | PAYOFF | B06 · HR4 | hypothetical |
| 167 | 8.7 | NARRATOR | It isn't sleep. | 3 | RULE | HR5 | hypothetical |
| 168 | 8.7 | NARRATOR | It's just night. | 3 | THEME | HR4 | hypothetical |
| 169 | 8.8 | MIA | Don't fall asleep on me. | 5 | DIALOGUE | STORY | story |
| 170 | 8.8 | LEO | Goodnight, Mia. | 2 | PAYOFF | STORY | story |
| 171 | 8.9 | NARRATOR | Back in the real world, sleep experts recommend adults get at least seven hours a night. | 16 | LESSON | A05 | established |
| 172 | 8.9 | NARRATOR | And science still can't fully explain why. | 7 | UNKNOWN | D01 | unknown |
| 173 | 8.10 | NARRATOR | If you never had to sleep again… what would you do with the life you got back? | 17 | FINAL | FRAME | frame |

**Roles:** CONSEQUENCE 47 · RULE 19 · FACT 18 · QUESTION 13 · EVIDENCE 13 · STORY 12 · SETUP 9 · DIALOGUE 9 · PAYOFF 7 · UNKNOWN 6 · TRANSITION 5 · THEME 4 · HOOK 3 · PROMISE 3 · CALLBACK 2 · PREMISE 1 · LESSON 1 · FINAL 1

### Repetition

**Most common sentence openers:** “and” ×9 · “some” ×6 · “not” ×5 · “in” ×5 · “but” ×5 · “you're” ×5 · “the” ×4 · “so” ×4

**Three or more sentences in a row with the same opener** (judge as deliberate rhythm or fix):

* 3.2–3.2: “Not you.” / “Not Mum.” / “Not anyone.”

**Repeated four-word phrases:**

| Phrase | Sentences | Declared callback? |
|---|---|---|
| a whole generation of | 14, 152 | yes |
| never had a single | 14, 152 | yes |
| had a single dream | 14, 152 | yes |
| your body's signal of | 50, 166 | yes |
| body's signal of night | 50, 166 | yes |
| what dreams were for | 135, 156 | yes |
| and science still can't | 135, 172 | yes |

### Long sentences (over 18 words)

* 2.2 (19 words): In one study, people sleeping six hours or less had about four times the odds of catching a cold.
* 4.4 (23 words): In twenty sixteen, RAND estimated that lack of sleep cost the US economy up to four hundred and eleven billion dollars a year.

### Text-to-speech readiness

* No digits, %, $ or capitalised abbreviations in the paste text (checked per sentence; REM is the one allowed — see pronunciation).
* Substitutions applied for the voice only: “BLACK 24's” → “Black Twenty-Four's”; “BLACK 24” → “Black Twenty-Four”; “Mr. Black” → “Mister Black”; “RAND” → “Rand”; “US economy” → “U.S. economy”; “US workers” → “U.S. workers”.
* Withdrawn wording scanned in every sentence: 19 patterns from the ledger's withdrawn list and the Story Bible guardrails (§9).

---

## 2 · Factual audit

**Sentences by class:** speculative 56 · hypothetical 36 · story 30 · established 15 · frame 13 · research 13 · unknown 10

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
| 10 | 1.5 | Not sick. | HR3 | hypothetical | — | framed as the premise ✅ |
| 11 | 1.5 | Just… awake. | HR1 | hypothetical | — | framed as the premise ✅ |
| 14 | 1.6 | And why, in this world, a whole generation of kids has never had a single dream. | HR5 | hypothetical | — | framed as the premise ✅ |
| 17 | 2.2 | Studies suggest it helps lock in what you learned. | C01 | research | C01: S10 (A) | evidence signalled; stated in a real-world beat ✅ |
| 18 | 2.2 | In one study, people sleeping six hours or less had about four times the odds of catching a cold. | C03 | research | C03: S12 (A) | evidence signalled; stated in a real-world beat ✅ |
| 19 | 2.2 | In another, after six short nights, young men handled blood sugar worse. | C05 | research | C05: S16 (A) | evidence signalled; stated in a real-world beat ✅ |
| 20 | 2.3 | Some of it, nobody fully understands. | D01 | unknown | — | uncertainty stated ✅ |
| 21 | 2.3 | What's REM sleep for? | D02 | unknown | — | uncertainty stated ✅ |
| 22 | 2.3 | Does sleep really clean the brain? | D04 | unknown | — | uncertainty stated ✅ |
| 23 | 2.3 | Scientists still disagree. | D02 · D04 | unknown | — | uncertainty stated ✅ |
| 24 | 2.4 | But two systems decide when you get sleepy. | B01 | established | B01: S04 (A), S01 (A) | stated in a real-world beat ✅ |
| 25 | 2.4 | An hourglass — pressure that builds while you're awake. | B01 | established | B01: S04 (A), S01 (A) | stated in a real-world beat ✅ |
| 26 | 2.4 | Coffee masks it. | B03 | established | B03: S08 (A) | stated in a real-world beat ✅ |
| 27 | 2.4 | And a clock deep in your brain, reset every day, mainly by light. | B04 · B05 | established | B04: S05 (A), S53 (A); B05: S54 (A), S05 (A) | stated in a real-world beat ✅ |
| 28 | 2.5 | A breakthrough would have to stop the hourglass. | HR2 | hypothetical | — | framed as the premise ✅ |
| 29 | 2.5 | And do all of sleep's work while you're awake. | HR3 | hypothetical | — | framed as the premise ✅ |
| 30 | 2.5 | Even the parts we don't understand. | HR3 · D01 | unknown | — | uncertainty stated ✅ |
| 31 | 2.5 | How? | HR8 | hypothetical | — | framed as the premise ✅ |
| 32 | 2.5 | Nobody knows. | HR8 | hypothetical | — | framed as the premise ✅ |
| 33 | 2.5 | That's the thought experiment. | HR8 | hypothetical | — | framed as the premise ✅ |
| 34 | 2.6 | In this world, you're never tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 35 | 2.6 | Going without sleep never hurts. | HR3 | hypothetical | — | framed as the premise ✅ |
| 36 | 2.6 | Your body clock keeps ticking. | HR4 | hypothetical | — | framed as the premise ✅ |
| 37 | 2.6 | And with no sleep… nobody dreams. | HR5 | hypothetical | — | framed as the premise ✅ |
| 42 | 3.2 | That night, nobody gets tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 43 | 3.2 | Not you. | HR2 | hypothetical | — | framed as the premise ✅ |
| 44 | 3.2 | Not Mum. | HR2 | hypothetical | — | framed as the premise ✅ |
| 45 | 3.2 | Not anyone. | HR2 | hypothetical | — | framed as the premise ✅ |
| 46 | 3.3 | So what do you do with eight extra hours? | CALC-02 | hypothetical | — | framed as the premise ✅ |
| 47 | 3.3 | By one a.m., the city is training, gaming, painting, studying. | SP-22 | speculative | — | inside the imagined frame ✅ |
| 48 | 3.3 | And one man in a grey suit is booking meetings for three a.m. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 49 | 3.5 | In the dark, a tiny gland in your brain still releases melatonin. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 50 | 3.5 | Your body's signal of night. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 51 | 3.5 | Switch on a bright light, and it fades. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 52 | 3.5 | You're not tired. | HR2 | hypothetical | — | framed as the premise ✅ |
| 53 | 3.5 | Your body just knows it's night. | HR4 | hypothetical | — | framed as the premise ✅ |
| 54 | 3.6 | Twenty-four hours awake… and you feel fine. | HR3 | hypothetical | — | framed as the premise ✅ |
| 55 | 3.6 | You just got eight hours back. | CALC-02 | hypothetical | — | framed as the premise ✅ |
| 56 | 3.6 | Almost three thousand hours a year. | CALC-02 | hypothetical | — | framed as the premise ✅ |
| 57 | 3.6 | Eight billion people did the same maths. | I01 · HR1 | hypothetical | I01: S51 (A) | framed as the premise ✅ |
| 58 | 3.6 | So did their bosses. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 59 | 4.1 | Overnight, humanity's waking time grows by about half. | CALC-03 | hypothetical | — | framed as the premise ✅ |
| 60 | 4.1 | Roughly the waking hours of four billion extra people. | CALC-03 | hypothetical | — | framed as the premise ✅ |
| 61 | 4.2 | Mr. Black's company becomes BLACK 24. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 62 | 4.2 | It never closes. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 63 | 4.2 | Even today, about one in six US workers doesn't work a regular daytime schedule. | G02 | established | G02: S38 (A) | real-world marker inside the story ✅ |
| 64 | 4.2 | Now the night shift is just… a shift. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 65 | 4.3 | Some jobs boom. | SP-02 | speculative | — | inside the imagined frame ✅ |
| 66 | 4.3 | Others shrink. | SP-03 | speculative | — | inside the imagined frame ✅ |
| 68 | 4.4 | Companies and customers. | SP-01 · SP-02 | speculative | — | inside the imagined frame ✅ |
| 69 | 4.4 | In twenty sixteen, RAND estimated that lack of sleep cost the US economy up to four hundred and eleven billion dollars a year. | G01 | research | G01: S37 (A) | evidence signalled; real-world marker inside the story ✅ |
| 70 | 4.4 | Missed work. | G01 | research | G01: S37 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 71 | 4.4 | Lower productivity. | G01 | research | G01: S37 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 72 | 4.4 | Earlier deaths. | G01 | research | G01: S37 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 73 | 4.4 | Here, that cost could fall. | SP-19 | speculative | — | inside the imagined frame ✅ |
| 74 | 4.4 | Though a nonstop world may bring new costs. | SP-19 | speculative | — | inside the imagined frame ✅ |
| 76 | 4.4 | Workers. | SP-02 | speculative | — | inside the imagined frame ✅ |
| 77 | 4.4 | When everyone can work more, your hour might be worth less. | SP-02 | speculative | — | inside the imagined frame ✅ |
| 78 | 4.5 | But more hours don't always mean more output. | G03 | research | G03: S39 (A) | evidence signalled; real-world marker inside the story ✅ |
| 79 | 4.5 | A study of First World War munitions factories found each hour past about forty-nine a week added less. | G03 | research | G03: S39 (A) | evidence signalled; real-world marker inside the story ✅ |
| 80 | 4.5 | Could people who never tire stay focused? | D05 | unknown | — | uncertainty stated ✅ |
| 81 | 4.5 | Nobody knows. | D05 | unknown | — | uncertainty stated ✅ |
| 87 | 5.1 | It's packed. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 88 | 5.1 | New York's subway already runs all night. | H01 | established | H01: S45 (A) | real-world marker inside the story ✅ |
| 89 | 5.1 | Now many cities try. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 90 | 5.2 | But even today, London keeps its all-night Tube to weekends. | H08 | established | H08: S61 (A) | real-world marker inside the story ✅ |
| 91 | 5.2 | Weeknights are for repairs. | H08 | established | H08: S61 (A) | real-world marker inside the story ✅ |
| 92 | 5.2 | So in a city that never stops… when do you fix it? | SP-06 | speculative | — | inside the imagined frame ✅ |
| 93 | 5.3 | Dinner at three. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 94 | 5.3 | Surgery at four. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 95 | 5.3 | Concerts at five. | SP-01 | speculative | — | inside the imagined frame ✅ |
| 96 | 5.4 | Schools split into shifts. | SP-07 | speculative | — | inside the imagined frame ✅ |
| 99 | 5.5 | Lighting in homes, offices and streets already takes an estimated eight percent of the world's electricity. | H02 | research | H02: S62 (A) | evidence signalled; real-world marker inside the story ✅ |
| 100 | 5.5 | Keep it on all night, and demand climbs. | SP-08 | speculative | — | inside the imagined frame ✅ |
| 101 | 5.5 | Just when solar panels produce nothing. | SP-08 · H03 | speculative | H03: physics — no source needed | inside the imagined frame ✅ |
| 102 | 5.6 | Over eighty percent of people already live under light-polluted skies. | H04 | established | H04: S47 (A) | real-world marker inside the story ✅ |
| 103 | 5.6 | Here, the stars fade faster. | SP-09 | speculative | — | inside the imagined frame ✅ |
| 104 | 5.6 | Birds sing at the wrong hour. | SP-09 · H06 | speculative | H06: S49 (A) | inside the imagined frame ✅ |
| 105 | 5.6 | Turtle hatchlings lose their way to the sea. | SP-09 · H06 | speculative | H06: S49 (A) | inside the imagined frame ✅ |
| 106 | 5.7 | But not every place switches on. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 107 | 5.7 | Some towns follow Flagstaff, Arizona — the world's first International Dark Sky City. | H07 · SP-05 | speculative | H07: S50 (A) | inside the imagined frame ✅ |
| 108 | 5.7 | They keep their nights dark. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 109 | 5.7 | On purpose. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 110 | 5.7 | Cities adapted in a year. | SP-05 | speculative | — | inside the imagined frame ✅ |
| 111 | 5.7 | People took longer. | SP-10 | speculative | — | inside the imagined frame ✅ |
| 113 | 6.1 | At first, they do. | SP-20 | speculative | — | inside the imagined frame ✅ |
| 114 | 6.2 | Then the schedules split. | SP-10 | speculative | — | inside the imagined frame ✅ |
| 115 | 6.2 | Awake twenty-four hours a day… and almost never together. | SP-10 | speculative | — | inside the imagined frame ✅ |
| 116 | 6.2 | Nobody says goodnight anymore. | SP-18 | speculative | — | inside the imagined frame ✅ |
| 117 | 6.2 | Your body clocks drift apart too. | SP-17 | speculative | — | inside the imagined frame ✅ |
| 118 | 6.2 | The lights never go off. | SP-17 | speculative | — | inside the imagined frame ✅ |
| 124 | 6.5 | Sleep was the one excuse nobody could argue with. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 125 | 6.5 | Now nobody's ever asleep. | HR1 | hypothetical | — | framed as the premise ✅ |
| 126 | 6.5 | France and Australia already give workers a right to disconnect. | G06 | established | G06: S60 (A), S59 (A) | real-world marker inside the story ✅ |
| 127 | 6.5 | Work was leaking into our nights long before this. | G06 | established | G06: S60 (A), S59 (A) | real-world marker inside the story ✅ |
| 129 | 6.6 | Research suggests free time helps… up to about two hours a day. | G04 | research | G04: S40 (A) | evidence signalled; real-world marker inside the story ✅ |
| 130 | 6.6 | Past about five, well-being can actually dip. | G04 | research | G04: S40 (A) | evidence signalled; real-world marker inside the story; emphasis 'actually' reviewed: it marks the surprising direction S40 found (more free time, lower well-being); it does not inflate the size ✅ |
| 131 | 6.6 | Unless that time goes into something productive. | G04 | research | G04: S40 (A) | continues a signalled sentence; real-world marker inside the story ✅ |
| 132 | 6.6 | Some people flourish. | SP-12 | speculative | — | inside the imagined frame ✅ |
| 133 | 6.6 | Some just drift. | SP-12 | speculative | — | inside the imagined frame ✅ |
| 134 | 6.7 | Mia's notebook stays blank. | HR5 · SP-13 | speculative | — | inside the imagined frame ✅ |
| 135 | 6.7 | And science still can't say what dreams were for. | D03 | unknown | — | uncertainty stated ✅ |
| 140 | 7.2 | From space, Earth's night side glows brighter than ever. | SP-09 | speculative | — | inside the imagined frame ✅ |
| 141 | 7.3 | Three a.m. is just another rush hour. | SP-15 | speculative | — | inside the imagined frame ✅ |
| 142 | 7.3 | Days don't end anymore… they change shifts. | SP-15 | speculative | — | inside the imagined frame ✅ |
| 143 | 7.4 | Trains never stop. | SP-06 | speculative | — | inside the imagined frame ✅ |
| 144 | 7.4 | Robots fix the tunnels between them. | SP-06 | speculative | — | inside the imagined frame ✅ |
| 145 | 7.5 | The economy is bigger. | SP-21 | speculative | — | inside the imagined frame ✅ |
| 146 | 7.5 | But for many people, the working week crept up… not down. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 147 | 7.6 | Darkness is a luxury now. | SP-14 | speculative | — | inside the imagined frame ✅ |
| 148 | 7.6 | People travel just to see stars. | SP-14 | speculative | — | inside the imagined frame ✅ |
| 149 | 7.6 | Some countries pass night laws. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 150 | 7.6 | Hours when nobody can be called to work. | SP-11 | speculative | — | inside the imagined frame ✅ |
| 152 | 7.7 | A whole generation of children… who have never had a single dream. | HR5 | hypothetical | — | framed as the premise ✅ |
| 156 | 7.8c | To study the brain… and find out what dreams were for. | D03 | unknown | — | uncertainty stated ✅ |
| 165 | 8.5 | Out past the last streetlight, the stars come back. | H04 · SP-09 | speculative | H04: S47 (A) | inside the imagined frame ✅ |
| 166 | 8.7 | No light up here holds back your body's signal of night. | B06 · HR4 | hypothetical | B06: S07 (A), S53 (A) | framed as the premise ✅ |
| 167 | 8.7 | It isn't sleep. | HR5 | hypothetical | — | framed as the premise ✅ |
| 168 | 8.7 | It's just night. | HR4 | hypothetical | — | framed as the premise ✅ |
| 171 | 8.9 | Back in the real world, sleep experts recommend adults get at least seven hours a night. | A05 | established | A05: S32 (A) | stated in a real-world beat ✅ |
| 172 | 8.9 | And science still can't fully explain why. | D01 | unknown | — | uncertainty stated ✅ |

### Sentences with no factual content

| # | Beat | Speaker | Sentence | Tag |
|---|---|---|---|---|
| 12 | 1.6 | NARRATOR | This is the first twenty-four hours. | FRAME |
| 13 | 1.6 | NARRATOR | The next ten years. | FRAME |
| 15 | 2.1 | MUM | Goodnight, you two. | STORY |
| 16 | 2.1 | NARRATOR | First, what does sleep actually do? | FRAME |
| 38 | 3.1 | MIA | Look — it's us, on the hill! | STORY |
| 39 | 3.1 | MIA | Can we go? | STORY |
| 40 | 3.1 | LEO | Sure. | STORY |
| 41 | 3.1 | LEO | When I have time. | STORY |
| 67 | 4.4 | NARRATOR | Winners? | FRAME |
| 75 | 4.4 | NARRATOR | Losers? | FRAME |
| 82 | 4.6 | NARRATOR | Mum takes BLACK 24's night shift. | STORY |
| 83 | 4.6 | NARRATOR | It pays more. | STORY |
| 84 | 4.6 | NARRATOR | Enough to start Mia's university fund. | STORY |
| 85 | 4.6 | NARRATOR | Her chair at dinner stays empty. | STORY |
| 86 | 5.1 | NARRATOR | Mum's train to work leaves at midnight. | STORY |
| 97 | 5.4 | NARRATOR | Mia's starts at eight a.m. | STORY |
| 98 | 5.4 | NARRATOR | Yours… at nine p.m. | STORY |
| 112 | 6.1 | NARRATOR | Do people spend more time together? | FRAME |
| 119 | 6.3 | NARRATOR | At eighteen, you join BLACK 24 too. | STORY |
| 120 | 6.3 | NARRATOR | Nights. | STORY |
| 121 | 6.3 | NARRATOR | You're good at it. | STORY |
| 122 | 6.3 | NARRATOR | You're always available. | STORY |
| 123 | 6.4 | LEO | Next week. | STORY |
| 128 | 6.6 | NARRATOR | Would more time make you happier? | FRAME |
| 136 | 6.8 | NARRATOR | We didn't lose sleep. | FRAME |
| 137 | 6.8 | NARRATOR | We lost the night. | FRAME |
| 138 | 7.1 | NARRATOR | Imagine it's ten years on. | FRAME |
| 139 | 7.1 | NARRATOR | You're twenty-five. | STORY |
| 151 | 7.7 | NARRATOR | And the biggest change of all? | FRAME |
| 153 | 7.8a | NARRATOR | You run night operations at BLACK 24. | STORY |
| 154 | 7.8b | NARRATOR | Mum's nights paid for Mia's place at university. | STORY |
| 155 | 7.8c | NARRATOR | She leaves tomorrow. | STORY |
| 157 | 7.8d | NARRATOR | Which brings us back to three a.m. | FRAME |
| 158 | 8.1 | NARRATOR | You're at your desk, like every night. | STORY |
| 159 | 8.2 | MIA | My train's at seven. | STORY |
| 160 | 8.2 | MIA | Come to the hill with me. | STORY |
| 161 | 8.2 | MIA | Just tonight. | STORY |
| 162 | 8.2 | LEO | I can't. | STORY |
| 163 | 8.2 | LEO | I'm on shift. | STORY |
| 164 | 8.3 | LEO | When Leo has time. | STORY |
| 169 | 8.8 | MIA | Don't fall asleep on me. | STORY |
| 170 | 8.8 | LEO | Goodnight, Mia. | STORY |
| 173 | 8.10 | NARRATOR | If you never had to sleep again… what would you do with the life you got back? | FRAME |

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
| 2.6 | 2 · NO HARM | card | HR3 | 2 |
| 2.6 | 3 · BODY CLOCK KEEPS TICKING | card | HR4 | 4 |
| 2.6 | 4 · NOBODY DREAMS — a rule we chose | card | HR5 | 6 |
| 3.1 | TUESDAY | label | HR1 | 1 |
| 3.5 | PINEAL GLAND | label | B06 | 2 |
| 3.5 | MELATONIN | label | B06 | 1 |
| 4.1 | assumes ~8 h of sleep · 7–9 h gives 3.4–4.9 billion | footnote | CALC-03 | — |
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
| B02 | Dropped from the narration. The hedged adenosine sentence ('is thought to be one of its signals') cost 12 words and pushed chapter 2 past +15 %. 'Coffee masks it' (B03, established) keeps the hourglass idea. |
| B07 | Not narrated as research. Only its sanctioned wording, 'your body's signal of night', is used, and that rests on B06 (melatonin rises in darkness). B07's research-level content (sleepiness about two hours after onset; not a sedative) is not narrated. |
| B08 | Not narrated. Chapter 3's lamp became a bright ceiling light, so 'it fades' rests on B06 (established). B08 still governs the picture (the glow thins, never to zero) and the partial verbs 'fades' and 'holds back'. |
| G05 | Listed in the Lock v4 FACT BANK by mistake: it hasn't been narrated since v3 (it now only grounds SP-10). Errata added to the Story Lock. |
| HR6 | Background rule, shown rather than said: Mia lying in bed (3.4); lying on the hill (8.7). |
| HR7 | Background rule; implicit throughout. |
| SP-16 | Optional; not used (Lock decision 4 — no room). |

* **Narrated but not listed in the Lock's fact bank:** CALC-02, I01, SP-20, SP-21, SP-22 — CALC-02 and I01 were in the Lock's draft beats but missing from its fact-bank line; SP-20, SP-21 and SP-22 are bookkeeping IDs added in ledger v4.1 for approved beats.

---

## 3 · Timeline audit

Reference years: every year from 2026 to 2060 in which 12 September is a Monday — **2033, 2039, 2044, 2050**. Each is checked; the weekday of Year 10 dates differs by year and is never shown on screen.

| Year 0 | Year 10 | Last night | 13 Sep, Year 10 | 14 Sep, Year 10 | 12 May, Year 10 |
|---|---|---|---|---|---|
| 2033 | 2043 | Mon 12 → Tue 13 Sep 2033 | Sun | Mon | Tue |
| 2039 | 2049 | Mon 12 → Tue 13 Sep 2039 | Mon | Tue | Wed |
| 2044 | 2054 | Mon 12 → Tue 13 Sep 2044 | Sun | Mon | Tue |
| 2050 | 2060 | Mon 12 → Tue 13 Sep 2050 | Mon | Tue | Wed |

### Checks

| Check | Result | Detail |
|---|---|---|
| Moment zero is a Monday night in September | ✅ | 12 September is a Monday in 2033, 2039, 2044, 2050 (2026–2060) |
| Day 1 is the Tuesday | ✅ | 13 September 2033 is a Tuesday |
| Events run in order (Year 0 and Year 10) | ✅ | T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12 → T13 → T14 |
| The hook is exactly ten years after the last night | ✅ | Year 10, 13 September 03:00 = Year 0, 13 September 03:00 + 10 calendar years (the night of the 12th → 13th) |
| Train leaves after the 03:00 scene, same morning | ✅ | train 07:00 is 4 h after 03:00 — 'My train's at seven' |
| Back from the hill before the train | ✅ | leave the hill ≈ 05:00, about an hour's drive, train 07:00 |
| Programme starts the day after she travels | ✅ | train 13 Sep, term starts 14 Sep |
| 'She leaves tomorrow' (packing on 12 September) | ✅ | packing 12 Sep evening → train 13 Sep |
| May message is months earlier, not the same night | ✅ | 12 May → 12 September = 4 months before she leaves |
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
| 1.1 on-screen clock 3:00 | ✅ | story time Y10-09-13 03:00 |
| 2.1 wall calendar 12 SEP | ✅ | story time Y0-09-12 22:00 |
| 3.2 on-screen clock 10:00 | ✅ | story time Y0-09-13 22:00 |
| 5.1 on-screen clock 0:00 | ✅ | story time Y1 00:00 |
| 7.3 on-screen clock 3:00 | ✅ | story time Y10 03:00 |
| 7.8a on-screen 12 MAY · 03:02 | ✅ | = this beat's story time (Y10-05-12 03:02) |
| 7.8c letter: term starts 14 September | ✅ | = timeline T14 |
| 7.8c on-screen 13 SEP · 07:00 | ✅ | matches timeline event T13; beat is Y10-09-12 20:00 |
| 7.8c ticket is for 'tomorrow' | ✅ | 1 day(s) after the packing scene |
| 7.8d on-screen clock 3:00 | ✅ | story time Y10-09-13 03:00 |
| 8.3 on-screen clock 3:02 | ✅ | story time Y10-09-13 03:02 |
| London-like city: 04:00 on 13 Sep is still night (sun below −12°) | ✅ | sun at -22.3° (stars clearly visible) |
| London-like city: 05:00 on 13 Sep is still night (sun below −12°) | ✅ | sun at -14.5° (stars clearly visible) |
| London-like city: 'Twenty-four hours awake' at Wednesday's sunrise | ✅ | up Tue 07:00 → sunrise Wed 06:35 BST = 23.6 h awake |
| Paris-like city: 04:00 on 13 Sep is still night (sun below −12°) | ✅ | sun at -29.8° (stars clearly visible) |
| Paris-like city: 05:00 on 13 Sep is still night (sun below −12°) | ✅ | sun at -22.7° (stars clearly visible) |
| Paris-like city: 'Twenty-four hours awake' at Wednesday's sunrise | ✅ | up Tue 07:00 → sunrise Wed 07:27 CEST = 24.4 h awake |
| New York-like city: 04:00 on 13 Sep is still night (sun below −12°) | ✅ | sun at -28.2° (stars clearly visible) |
| New York-like city: 05:00 on 13 Sep is still night (sun below −12°) | ✅ | sun at -18.2° (stars clearly visible) |
| New York-like city: 'Twenty-four hours awake' at Wednesday's sunrise | ✅ | up Tue 07:00 → sunrise Wed 06:37 EDT = 23.6 h awake |

### The night sky (NOAA solar-position algorithm, Year 0 = 2033, Year 10 = 2043)

| Site | Year 10, 13 Sep: astronomical dawn | nautical dawn | sunrise | sun at 03:10 | at 04:00 | at 05:00 | Year 0, Wed 14 Sep sunrise |
|---|---|---|---|---|---|---|---|
| London-like city (51.5°, BST) | 04:35 | 05:18 | 06:32 | -27.8° | -22.3° | -14.5° | 06:35 |
| Paris-like city (48.9°, CEST) | 05:34 | 06:14 | 07:25 | -34.2° | -29.8° | -22.7° | 07:27 |
| New York-like city (40.7°, EDT) | 05:02 | 05:35 | 06:35 | -35.5° | -28.2° | -18.2° | 06:37 |

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
| 1.5 | 0:19.7–0:26.2 | 6.5 s | 15 | 138 | 160 | 5.9 s | +0.6 s | ✅ |
| 1.6 | 0:26.2–0:36.7 | 10.5 s | 26 | 149 | 160 | 8.7 s | +1.8 s | ✅ |
| 1.7 | 0:36.7–0:38.7 | 2 s | 0 | 0 | 160 | 0.0 s | +2.0 s | ✅ |
| 2.1 | 0:38.7–0:43.2 | 4.5 s | 9 | 120 | 160 | 3.1 s | +1.4 s | ✅ |
| 2.2 | 0:43.2–0:59.2 | 16 s | 40 | 150 | 160 | 13.1 s | +2.9 s | ✅ |
| 2.3 | 0:59.2–1:07.2 | 8 s | 19 | 142 | 160 | 6.8 s | +1.2 s | ✅ |
| 2.4 | 1:07.2–1:20.2 | 13 s | 32 | 148 | 160 | 11.2 s | +1.8 s | ✅ |
| 2.5 | 1:20.2–1:32.2 | 12 s | 30 | 150 | 160 | 10.9 s | +1.1 s | ✅ |
| 2.6 | 1:32.2–1:41.2 | 9 s | 22 | 147 | 160 | 8.1 s | +0.9 s | ✅ |
| 3.1 ♥ | 1:41.2–1:49.2 | 8 s | 14 | 105 | 145 | 5.5 s | +2.5 s | ✅ |
| 3.2 | 1:49.2–1:54.2 | 5 s | 11 | 132 | 160 | 4.3 s | +0.7 s | ✅ |
| 3.3 | 1:54.2–2:07.2 | 13 s | 32 | 148 | 160 | 10.6 s | +2.4 s | ✅ |
| 3.4 ♥ | 2:07.2–2:09.2 | 2 s | 0 | 0 | 145 | 0.0 s | +2.0 s | ✅ |
| 3.5 | 2:09.2–2:23.2 | 14 s | 34 | 146 | 160 | 11.8 s | +2.2 s | ✅ |
| 3.6 | 2:23.2–2:35.2 | 12 s | 30 | 150 | 160 | 10.9 s | +1.1 s | ✅ |
| 4.1 | 2:35.2–2:42.2 | 7 s | 17 | 146 | 160 | 5.6 s | +1.4 s | ✅ |
| 4.2 | 2:42.2–2:54.7 | 12.5 s | 31 | 149 | 160 | 10.9 s | +1.6 s | ✅ |
| 4.3 | 2:54.7–2:56.7 | 2 s | 5 | 150 | 160 | 1.9 s | +0.1 s | ✅ |
| 4.4 | 2:56.7–3:20.2 | 23.5 s | 59 | 151 | 160 | 21.4 s | +2.1 s | ✅ |
| 4.5 | 3:20.2–3:34.7 | 14.5 s | 35 | 145 | 160 | 11.8 s | +2.7 s | ✅ |
| 4.6 ♥ | 3:34.7–3:43.7 | 9 s | 21 | 140 | 145 | 7.5 s | +1.5 s | ✅ |
| 5.1 | 3:43.7–3:51.7 | 8 s | 20 | 150 | 160 | 7.2 s | +0.8 s | ✅ |
| 5.2 | 3:51.7–4:02.2 | 10.5 s | 26 | 149 | 160 | 9.1 s | +1.4 s | ✅ |
| 5.3 | 4:02.2–4:06.2 | 4 s | 9 | 135 | 160 | 3.4 s | +0.6 s | ✅ |
| 5.4 | 4:06.2–4:12.2 | 6 s | 13 | 130 | 160 | 5.0 s | +1.0 s | ✅ |
| 5.5 | 4:12.2–4:24.2 | 12 s | 30 | 150 | 160 | 10.0 s | +2.0 s | ✅ |
| 5.6 | 4:24.2–4:35.7 | 11.5 s | 29 | 151 | 160 | 10.0 s | +1.5 s | ✅ |
| 5.7 | 4:35.7–4:50.2 | 14.5 s | 33 | 137 | 160 | 12.1 s | +2.4 s | ✅ |
| 6.1 | 4:50.2–4:55.2 | 5 s | 10 | 120 | 160 | 3.4 s | +1.6 s | ✅ |
| 6.2 | 4:55.2–5:07.2 | 12 s | 28 | 140 | 160 | 10.3 s | +1.7 s | ✅ |
| 6.3 | 5:07.2–5:14.2 | 7 s | 15 | 129 | 160 | 5.6 s | +1.4 s | ✅ |
| 6.4 ♥ | 5:14.2–5:17.7 | 3.5 s | 2 | 34 | 145 | 0.6 s | +2.9 s | ✅ |
| 6.5 | 5:17.7–5:30.7 | 13 s | 32 | 148 | 160 | 10.9 s | +2.1 s | ✅ |
| 6.6 | 5:30.7–5:46.7 | 16 s | 38 | 142 | 160 | 13.7 s | +2.3 s | ✅ |
| 6.7 ♥ | 5:46.7–5:52.7 | 6 s | 13 | 130 | 145 | 4.4 s | +1.6 s | ✅ |
| 6.8 ♥ | 5:52.7–5:56.7 | 4 s | 8 | 120 | 145 | 2.8 s | +1.2 s | ✅ |
| 7.1 | 5:56.7–6:00.7 | 4 s | 7 | 105 | 160 | 2.5 s | +1.5 s | ✅ |
| 7.2 | 6:00.7–6:04.7 | 4 s | 9 | 135 | 160 | 2.8 s | +1.2 s | ✅ |
| 7.3 | 6:04.7–6:11.2 | 6.5 s | 14 | 129 | 160 | 5.0 s | +1.5 s | ✅ |
| 7.4 | 6:11.2–6:15.7 | 4.5 s | 9 | 120 | 160 | 3.1 s | +1.4 s | ✅ |
| 7.5 | 6:15.7–6:21.7 | 6 s | 15 | 150 | 160 | 5.3 s | +0.7 s | ✅ |
| 7.6 | 6:21.7–6:31.7 | 10 s | 24 | 144 | 160 | 8.4 s | +1.6 s | ✅ |
| 7.7 | 6:31.7–6:40.7 | 9 s | 18 | 120 | 160 | 6.3 s | +2.7 s | ✅ |
| 7.8a | 6:40.7–6:46.7 | 6 s | 7 | 70 | 160 | 2.2 s | +3.8 s | ✅ |
| 7.8b ♥ | 6:46.7–6:50.7 | 4 s | 8 | 120 | 145 | 2.5 s | +1.5 s | ✅ |
| 7.8c ♥ | 6:50.7–6:56.7 | 6 s | 14 | 140 | 145 | 5.0 s | +1.0 s | ✅ |
| 7.8d | 6:56.7–6:59.7 | 3 s | 7 | 140 | 160 | 2.2 s | +0.8 s | ✅ |
| 8.1 | 6:59.7–7:02.7 | 3 s | 7 | 140 | 160 | 2.2 s | +0.8 s | ✅ |
| 8.2 ♥ | 7:02.7–7:10.2 | 7.5 s | 17 | 136 | 145 | 6.5 s | +1.0 s | ✅ |
| 8.3 ♥ | 7:10.2–7:16.2 | 6 s | 4 | 40 | 145 | 1.2 s | +4.8 s | ✅ |
| 8.4 ♥ | 7:16.2–7:18.2 | 2 s | 0 | 0 | 145 | 0.0 s | +2.0 s | ✅ |
| 8.5 ♥ | 7:18.2–7:22.7 | 4.5 s | 9 | 120 | 145 | 2.8 s | +1.7 s | ✅ |
| 8.6 ♥ | 7:22.7–7:25.2 | 2.5 s | 0 | 0 | 145 | 0.0 s | +2.5 s | ✅ |
| 8.7 ♥ | 7:25.2–7:32.7 | 7.5 s | 17 | 136 | 145 | 5.9 s | +1.6 s | ✅ |
| 8.8 ♥ | 7:32.7–7:36.7 | 4 s | 7 | 105 | 145 | 2.5 s | +1.5 s | ✅ |
| 8.9 ♥ | 7:36.7–7:46.7 | 10 s | 23 | 138 | 145 | 7.5 s | +1.0 s | ✅ |
| 8.10 ♥ | 7:46.7–7:54.7 | 8 s | 17 | 128 | 145 | 5.7 s | +2.3 s | ✅ |
| 8.11 | 7:54.7–7:56.2 | 1.5 s | 0 | 0 | 160 | 0.0 s | +1.5 s | ✅ |

♥ = emotional beat (lower limit).

### Chapters against the brief's windows (±15 %)

| # | Chapter | Window | Planned | Length | Δ | Words | Pace | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | The Impossible Question | 0:00–0:35 (35 s) | 0:00–0:39 | 38.7 s | +10.6 % | 86 | 133 wpm | ✅ |
| 2 | The Biological Breakthrough | 0:35–1:30 (55 s) | 0:39–1:41 | 62.5 s | +13.6 % | 152 | 146 wpm | ✅ |
| 3 | The First 24 Hours | 1:30–2:20 (50 s) | 1:41–2:35 | 54.0 s | +8.0 % | 121 | 134 wpm | ✅ |
| 4 | The World Economy | 2:20–3:20 (60 s) | 2:35–3:44 | 68.5 s | +14.2 % | 168 | 147 wpm | ✅ |
| 5 | A City That Never Sleeps | 3:20–4:20 (60 s) | 3:44–4:50 | 66.5 s | +10.8 % | 160 | 144 wpm | ✅ |
| 6 | The Hidden Cost | 4:20–5:30 (70 s) | 4:50–5:57 | 66.5 s | -5.0 % | 146 | 132 wpm | ✅ |
| 7 | Ten Years Later | 5:30–6:40 (70 s) | 5:57–6:60 | 63.0 s | -10.0 % | 132 | 126 wpm | ✅ |
| 8 | The Final Question | 6:40–7:30 (50 s) | 6:60–7:56 | 56.5 s | +13.0 % | 101 | 107 wpm | ✅ |

* **Runtime:** 7:56.2 planned (Story Lock v4: 7:50; brief: about 7–8 minutes). Speech alone at Video #1's overall 141 wpm: 7:33.6.
* **Fastest beat:** 5.6 at 151 wpm. Beats at or above 150 wpm: 1.1, 2.2, 2.5, 3.6, 4.3, 4.4, 5.1, 5.5, 5.6, 7.5.
* **Opening sync:** narration from 0:00.2; the line is estimated to end at 0:02.95; the earliest allowed cut (+4 frames) is 0:03.08; planned cut 0:03.2 → ✅ the full playground is on screen for the whole line.

