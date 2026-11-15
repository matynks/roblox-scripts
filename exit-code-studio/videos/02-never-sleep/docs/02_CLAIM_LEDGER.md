# Video #2 — Claim Ledger

**v2 · 2026-11-15 · revised after the producer's review of v1.** Changes from v1 are at the end. At the script stage every factual sentence gets one of these IDs (the fact ledger).

Sources are in [01_RESEARCH.md §4](01_RESEARCH.md#4-source-list):
* **Level A** — abstract, official page or the authors' own release.
* **Level S** — secondary coverage only.

## The five evidence classes

Every claim carries **exactly one** of these classes. Qualifiers such as sample size, species, year, region or "estimate" go in the Notes column, never in the class.

| Class | Definition | Minimum evidence | How the narration may say it |
|---|---|---|---|
| **ESTABLISHED FACT** | Settled knowledge. That means scientific consensus or textbook physiology, replicated findings, official statistics, laws and other public facts, definitions, and arithmetic whose inputs are all established. | A level-A source: agency, professional society, major review, official page or primary data. | Plainly, keeping the source's qualifiers ("about", "in the US", the year). |
| **RESEARCH-SUPPORTED EVIDENCE** | Credible peer-reviewed findings that are **not settled**. This covers single or few studies, small samples, animal studies, observational associations, model-based estimates, and findings that other studies contradict. | A level-A source. The study type, size and limits are recorded in the Notes. | The evidence is always signalled: "studies suggest", "in one study", "in mice", "linked to", "estimated". Never "proves", and no causal claim beyond the study design. |
| **HYPOTHETICAL ASSUMPTION** | The **rules of our thought experiment**: conditions that are not true in the real world. It also covers anything that follows from those rules by logic or arithmetic alone. | None from science. Listed as a world rule (HR) or a rule-derived claim, with its reasoning shown. | Framed as the premise: "imagine", "in this world". Never attributed to science. |
| **SPECULATIVE SCENARIO** | Our reasoned guesses about how **people, businesses, cities and societies might respond** to the world rules. Plausible and untestable — not predictions. | Grounded in real evidence where possible; the Grounding column shows it. | "might", "could", "would probably", or inside a clearly imagined frame ("Imagine it's ten years on…"). |
| **UNKNOWN** | Questions science has **not answered**: the evidence is absent, conflicting or too weak to conclude. | The sources that show the gap or the disagreement, where they exist. | Said plainly: "nobody knows", "scientists still disagree", "science can't yet say". |

**Rules**
1. **One class per claim.** A claim takes the class of its weakest input. All-established inputs → ESTABLISHED. Any world-rule input → HYPOTHETICAL ASSUMPTION. A guess about behaviour → SPECULATIVE SCENARIO.
2. **Narrated facts need level-A sources.** Level-S material may only inform visuals or optional texture, and is marked *not narrated*.
3. **Calculations** show method, inputs, assumptions and range. The narration wording must hold across the whole range.
4. **No scaling up.** Results from small, lab or animal studies are never scaled up to population-level numbers.

---

## A · Sleep basics

| ID | Claim (narration-safe wording) | Class | Sources | Notes / guardrail | Ch |
|---|---|---|---|---|---|
| A01 | We spend about a third of our time asleep. | ESTABLISHED FACT | S01 | Approximate; adults vary (A08). | 1 |
| A02 | Sleep has two main types, REM and non-REM, which cycle through the night; deep non-REM comes mostly early, and REM periods grow toward morning. | ESTABLISHED FACT | S01 | — | opt |
| A03 | REM sleep was first described in 1953. | ESTABLISHED FACT | S02 | Level S → **not narrated**. | — |
| A04 | We dream in both REM and non-REM sleep. | RESEARCH-SUPPORTED EVIDENCE | S20 | Never "dreams only happen in REM". | opt |
| A05 | Sleep experts recommend at least seven hours a night for adults. | ESTABLISHED FACT | S32 | A consensus recommendation (AASM/SRS), ages 18–60. Wording "experts recommend", not "you need". | 8 |
| A06 | About one in three US adults reported sleeping less than seven hours. | ESTABLISHED FACT | S33 | 2014 survey; say the year. | opt |
| A07 | Children and teens need more sleep than adults: 8–10 hours for teens, 12–16 hours including naps for infants aged 4–12 months. | ESTABLISHED FACT | S58 | Method input for CALC-03 only. | — |
| A08 | National average sleep among adult app users ranged from about 7 h 24 min (Singapore, Japan) to 8 h 12 min (Netherlands). | RESEARCH-SUPPORTED EVIDENCE | S57 | App users, not representative. Method input for CALC-03 only. | — |

## B · The hourglass and the clock

"Hourglass" (sleep pressure) and "clock" (circadian system) are **our metaphors**, not scientific terms.

| ID | Claim | Class | Sources | Notes / guardrail | Ch |
|---|---|---|---|---|---|
| B01 | Two separate systems time our sleep: a pressure that builds the longer we're awake, and a body clock. | ESTABLISHED FACT | S04, S01 | The standard two-process model. | 2 |
| B02 | While we're awake, a chemical called adenosine builds up in the brain — one of the signals behind sleep pressure. | RESEARCH-SUPPORTED EVIDENCE | S03, S08 | Key evidence is animal microdialysis. Say "one of the signals", not "the cause". | 2 |
| B03 | Caffeine keeps you alert mainly by blocking adenosine's receptors. | ESTABLISHED FACT | S08 | Narrate as "blocking its signal". | 2 |
| B04 | The master clock is a small cluster of nerve cells deep in the brain (the suprachiasmatic nucleus). It keeps clocks all over the body in step. | ESTABLISHED FACT | S05, S53 | — | 2 |
| B05 | Left alone, the human clock runs a little longer than a day — about 24 hours 11 minutes — so it is reset every day, mainly by light reaching the eyes. | ESTABLISHED FACT | S54, S05 | — | 2 |
| B06 | Melatonin is made by the **pineal gland**, not by the clock itself. The master clock drives its production and light inhibits it, so levels rise in darkness and peak at night. | ESTABLISHED FACT | S07, S53 | **Never** "the clock releases melatonin". | 3 |
| B07 | Melatonin carries the message of darkness to the clock and the body. In humans it helps prepare for sleep — sleepiness rises about two hours after its evening onset — but it is not a sedative. | RESEARCH-SUPPORTED EVIDENCE | S53 | A review; the author has a declared commercial interest. Narrate only "the body's signal of night". | 3 |
| B08 | Ordinary room light at night suppresses melatonin — by more than half during usual sleep hours in one study — and delays its evening rise. | RESEARCH-SUPPORTED EVIDENCE | S52 | Retrospective analysis, 116 young adults. Never "light switches it off". | 3 |
| B09 | Light is the clock's strongest time cue. Light at the wrong time can shift the clock, and night-shift workers' clocks often stay out of step with their schedules. | RESEARCH-SUPPORTED EVIDENCE | S05, S55, S56 | Reviews of shift work. | 6 |
| B10 | Core body temperature has a daily rhythm, lowest in the early-morning hours. | ESTABLISHED FACT | S09 | Level S only → **not narrated** (dropped from chapter 3). | — |
| B11 | The clock's molecular gears earned the 2017 Nobel Prize. | ESTABLISHED FACT | S06 | — | opt |

## C · What sleep does, as far as we know

| ID | Claim | Class | Sources | Notes / guardrail | Ch |
|---|---|---|---|---|---|
| C01 | Studies suggest that in deep sleep the brain replays recent learning and helps lock it in. | RESEARCH-SUPPORTED EVIDENCE | S10 | — | 2 |
| C02 | One leading idea: sleep rebalances brain connections that strengthen while we learn. | RESEARCH-SUPPORTED EVIDENCE | S11 | A hypothesis. | opt |
| C03 | In one study, people who had slept under six hours were about four times more likely to catch a cold when exposed to the virus. | RESEARCH-SUPPORTED EVIDENCE | S12 | 164 adults; an association, adjusted for confounders. | 2 |
| C04 | Short sleep is linked to weaker antibody responses to vaccines. | RESEARCH-SUPPORTED EVIDENCE | S14, S15 (S13 level S) | Only objectively measured sleep showed the link. | opt |
| C05 | In one small study, six nights of four hours' sleep left healthy young men handling blood sugar worse — the researchers compared it to ageing — and it recovered with sleep. | RESEARCH-SUPPORTED EVIDENCE | S16 | 11 men. | 2 |
| C06 | In a 2013 mouse study, the space between brain cells grew by about 60 % during sleep, and waste cleared faster. | RESEARCH-SUPPORTED EVIDENCE | S17 | Mice; **only together with C08**. | 2 |
| C07 | In people, slow brain waves in deep sleep are followed by pulses of brain fluid. | RESEARCH-SUPPORTED EVIDENCE | S18 | 13 adults; clearance not measured. | opt |
| C08 | A 2024 mouse study found the opposite: clearance was slower during sleep. | RESEARCH-SUPPORTED EVIDENCE | S19 | Methods debated; **always paired with C06**. | 2 |
| C09 | One night without sleep raised a day's energy use by about 7 % (about 135 kcal). | RESEARCH-SUPPORTED EVIDENCE | S36 | 7 adults lying in bed. **Not used** (see Withdrawn). | — |

## D · Unknowns

| ID | Claim | Class | Sources | Notes | Ch |
|---|---|---|---|---|---|
| D01 | Science doesn't yet agree on everything sleep is for. | UNKNOWN | S25 (S24 level S) | Never "scientists know why we sleep". | 2, 8 |
| D02 | What REM sleep is for isn't settled. | UNKNOWN | S21, S22 (S23 level S) | No single function for REM. | 2 |
| D03 | What dreams are for — if anything — nobody knows. | UNKNOWN | S20–S22 | No consensus found. | 6, 7 |
| D04 | Whether sleep speeds up waste clearance in the human brain is unresolved. | UNKNOWN | S17–S19 | — | 2 |
| D05 | Whether people with no fatigue could stay focused and motivated twenty hours a day is unknown. | UNKNOWN | — | No data exists. | 4 |
| D06 | Whether a life lit all night would harm people's health in this world is unknown. | UNKNOWN | S55, S56 | Real shift work shows circadian problems, but this world is hypothetical. **Not narrated.** | — |

## E · Real-world limits

| ID | Claim | Class | Sources | Notes | Ch |
|---|---|---|---|---|---|
| E01 | After 17–19 hours awake, people did about as badly on some tests as at a 0.05 % blood-alcohol level. | RESEARCH-SUPPORTED EVIDENCE | S35 | 39 adults; computer tests, not driving. | opt |
| E02 | Six-hour nights for two weeks caused deficits like up to two nights without sleep. | RESEARCH-SUPPORTED EVIDENCE | S34 | "up to" | opt |
| E03 | Night shift work is classified "probably carcinogenic" (IARC Group 2A). | ESTABLISHED FACT | S44 | The class reflects evidence strength, not risk size. Not planned. | — |

## F · Nature

| ID | Claim | Class | Sources | Notes | Ch |
|---|---|---|---|---|---|
| F01 | Even jellyfish and Hydra, with no brain, show sleep-like states. | RESEARCH-SUPPORTED EVIDENCE | S27, S28 | Definitions debated. | opt |
| F02 | Frigatebirds can sleep in flight, half a brain at a time. | RESEARCH-SUPPORTED EVIDENCE | S29 | Never "42 minutes". | opt |
| F03 | A rare gene variant is linked to people who naturally sleep less than most of us, apparently without harm — but they still sleep. | RESEARCH-SUPPORTED EVIDENCE | S30 | Family study plus mice and flies. **No hour figures** (those are level S). | 2 opt |

## G · Society and economy

| ID | Claim | Class | Sources | Notes | Ch |
|---|---|---|---|---|---|
| G01 | Insufficient sleep is estimated to cost the US economy up to $411 billion a year. | RESEARCH-SUPPORTED EVIDENCE | S37 | A model estimate; "up to". | 4 |
| G02 | Even today, about one in six US workers doesn't work a regular daytime schedule. | ESTABLISHED FACT | S38 | BLS, 2017–18. | 4 |
| G03 | In First World War munitions factories, past about 49 hours a week each extra hour added less, and a 70-hour week produced little more than 56 hours. | RESEARCH-SUPPORTED EVIDENCE | S39 | Historical, one sector, workers who got tired — pair with D05. | 4 |
| G04 | Research suggests free time lifts well-being up to about two hours a day, then levels off; beyond about five it can dip, unless the time is spent on something meaningful. | RESEARCH-SUPPORTED EVIDENCE | S40 | Correlational data plus experiments. Say "around". | 6 |
| G05 | In the US, people were already spending less time with friends and others outside their homes. | RESEARCH-SUPPORTED EVIDENCE | S41, S42 | 2003–2020 / 2003–2019. | 6 |
| G06 | Some countries already give workers a "right to disconnect": France since 2017, Australia since 2024. | ESTABLISHED FACT | S60, S59 | France: negotiate terms or adopt a charter. Australia: may refuse unreasonable after-hours contact. **Don't say "first".** | 6 |

## H · City, energy and light

| ID | Claim | Class | Sources | Notes | Ch |
|---|---|---|---|---|---|
| H01 | New York's subway already runs 24 hours a day. | ESTABLISHED FACT | S45 | Never "one of the few". | 5 |
| H02 | Lighting uses roughly 15 % of the world's electricity. | RESEARCH-SUPPORTED EVIDENCE | S46 | A UNEP estimate; "roughly". | 5 |
| H03 | Solar panels produce nothing at night. | ESTABLISHED FACT | — | Physics. | 5 |
| H04 | More than 80 % of people live under light-polluted skies, and the Milky Way is hidden from more than a third of humanity. | ESTABLISHED FACT | S47 | — | 5 |
| H05 | Citizen scientists found the night sky brightening by almost 10 % a year. | RESEARCH-SUPPORTED EVIDENCE | S48 | 2011–2022. | opt |
| H06 | Artificial light at night changes how animals live: birds sing earlier, and turtle hatchlings struggle to find the sea. | RESEARCH-SUPPORTED EVIDENCE | S49 | A meta-analysis. | 5 |
| H07 | Flagstaff, Arizona became the world's first International Dark Sky City in 2001. | ESTABLISHED FACT | S50 | — | 5 |
| H08 | London's all-night Tube runs only on Friday and Saturday nights; on other nights engineers still use the hours for maintenance. | ESTABLISHED FACT | S61 | Replaces the v1 generalisation. | 5 |

## I · Population and calculations

| ID | Claim | Class | Basis | Ch |
|---|---|---|---|---|
| I01 | About 8.2 billion people live on Earth; global life expectancy is about 73 years. | ESTABLISHED FACT | S51 (2024) | 1, 4 |
| CALC-01 | About a third of a lifetime adds up to **more than twenty years** asleep. | ESTABLISHED FACT | See the method below | 1 |
| CALC-02 | Eight hours a day back is 2,920 hours a year. | HYPOTHETICAL ASSUMPTION | 8 × 365. Rule-derived; assumes 8 h of sleep regained. | 3 |
| CALC-03 | Humanity's waking time would grow by **about half** — roughly the waking hours of **four billion** extra people. | HYPOTHETICAL ASSUMPTION | Rule-derived; the method below | 4 |
| CALC-05 | Ten years of extra hours ≈ 29,000 hours per person. | HYPOTHETICAL ASSUMPTION | 2,920 × 10. Rule-derived. | 8 opt |

### CALC-01 method — "more than twenty years"
* **Inputs:** sleep ≈ a third of time (A01; adults typically 7–8 h, A08); global life expectancy 73.3 years (I01).
* **Calculation:**
  * 73.3 × (8/24) = 24.4 years;
  * 73.3 × (7/24) = 21.4 years;
  * an 80-year life at 8 h = 26.7 years.
* **Range:** about 21–27 years. **Narration: "more than twenty years"**, which holds across the whole range. v1's "about twenty-five" is withdrawn.

### CALC-03 method — the four-billion comparison
* **Question:** if nobody slept, how many extra waking hours would humanity have, expressed as "extra people awake"?
* **Formula:**
  * extra waking hours per day = N × S, where N is the population and S the average hours of sleep;
  * one person's waking day = 24 − S;
  * equivalent extra people = N × S ÷ (24 − S).
* **Inputs:**
  * N = 8.2 billion (S51, 2024).
  * S cannot be sourced as a single global figure. No population-weighted global average was found. Adult national averages run about 7.4–8.2 h (A08, app users); children and teens need more (A07). We use **S = 8 h**, matching "about a third" (A01), and test 7–9 h.
* **Result at S = 8:** 8.2 bn × 8 h = 65.6 bn extra waking hours a day. Divided by 16 waking hours per person, that is **4.1 billion**. Equivalently, waking time grows by 8/16 = **50 %**.

| Average sleep S | Waking time grows by | Equivalent extra people |
|---|---|---|
| 7 h | +41 % | 3.4 bn |
| 7.5 h | +45 % | 3.7 bn |
| **8 h** | **+50 %** | **4.1 bn** |
| 8.5 h | +55 % | 4.5 bn |
| 9 h | +60 % | 4.9 bn |

* **What it does and doesn't mean:** it compares **hours only**. The hours are spread across everyone — babies, children, the elderly — so it is **not** four billion extra workers or consumers.
* **Narration:** "Humanity's waking time would grow by about half — roughly the waking hours of four billion extra people." An on-screen footnote reads: *assumes about 8 hours of sleep; 7–9 hours gives 3.4–4.9 billion*.
* **Class:** HYPOTHETICAL ASSUMPTION — arithmetic on a world rule with stated inputs, not a prediction.

## J · The rules of this world (HYPOTHETICAL ASSUMPTION)

| ID | Rule |
|---|---|
| HR1 | From one day onward, no human needs sleep, including babies born afterwards. The change is global and simultaneous. |
| HR2 | Sleep pressure never builds: nobody ever feels sleepy or exhausted from being awake. |
| HR3 | Whatever sleep does for brain and body — the parts science knows and the parts it doesn't — now happens while awake. Not sleeping causes no harm. |
| HR4 | **The circadian system works exactly as it does today.** The master clock keeps roughly 24-hour time and is reset by light. In darkness it drives the pineal gland to make melatonin; light at night still suppresses melatonin and can shift the clock. **The only change: none of this ever makes anyone sleepy.** |
| HR5 | **Nobody falls asleep, so nobody dreams.** This is a rule of the thought experiment, *not* a scientific prediction: science doesn't know what dreams are for (D03), or whether dream-like experience could exist without sleep. It follows that children born after the change never dream. |
| HR6 | People can still lie down, rest and close their eyes. |
| HR7 | Everything else is unchanged: physics, the sun, human nature, the economy on day one. |
| HR8 | **How** it happens is never explained. No mechanism is ever presented as science. |

## K · Speculative scenarios the story uses (SPECULATIVE SCENARIO)

| ID | Scenario | Grounding | Ch |
|---|---|---|---|
| SP-01 | Many businesses go 24/7; "night shift" becomes just "a shift". | G02 | 4 |
| SP-02 | When everyone can work more, an hour of work might be worth less, while round-the-clock demand creates new jobs. | Basic supply and demand | 4 |
| SP-03 | Industries built around sleep (mattresses, sleeping pills) shrink. | HR1 | 4 |
| SP-04 | *Withdrawn* (food demand; it depended on CALC-04). | — | — |
| SP-05 | Cities split: many try 24/7, others choose dark, quiet hours. | H07 | 5 |
| SP-06 | Cities lose the night-time window they use for maintenance. | H08 | 5 |
| SP-07 | Schools could run in shifts around the clock. | — | 5 |
| SP-08 | Night electricity demand rises just when solar produces nothing. | H02, H03 | 5 |
| SP-09 | Brighter nights hide more stars and disturb more wildlife. | H04–H06 | 5, 7 |
| SP-10 | Families are awake 24 hours, but rarely at the same time. | G05 | 6 |
| SP-11 | Without "I was asleep", work leaks into every hour, and disconnect laws become central. | G06 | 6, 7 |
| SP-12 | Extra time helps some people flourish and leaves others drifting. | G04 | 6 |
| SP-13 | The loss of dreams leaves a cultural gap people feel: blank dream journals, adults describing dreams to children like history. | HR5 (rule); effects UNKNOWN (D03) | 6, 7 |
| SP-14 | Darkness becomes rare and valued; dark-sky towns become destinations. | H07 | 7 |
| SP-15 | "3 a.m. is just another rush hour." | SP-01, SP-07 | 7 |
| SP-16 | *(optional)* Entertainment that simulates dreams becomes popular. | HR5 | opt |
| SP-17 | Under lights that never go off, people's body clocks drift out of step with the sun and with each other. | B08, B09; health effects UNKNOWN (D06), not narrated | 6, 8 |

## Withdrawn or not narrated

| Item | Reason |
|---|---|
| **CALC-04** (≈135 kcal × 8.2 bn ≈ food for 550 million people) | It scaled a 7-person, lying-in-bed lab study up to 8.2 billion people of every age and activity level. In this world sleep's functions work differently (HR3), so the energy cost of a 24-hour waking day is unknown. The result was a dramatic number with no defensible range. **Removed from the story.** |
| SP-04 (food demand rises) | Depended on CALC-04. |
| "About twenty-five years" (v1 hook) | Holds only for 8 h of sleep and a 75-year life. Replaced by "more than twenty years" (CALC-01). |
| "Sleep… switch off" / "unconscious" (v1 wording) | Scientifically wrong: the sleeping brain is active, and dreams are experiences. |
| "The clock releases melatonin" / "light switches it off" (v1) | Wrong organ (it is the pineal gland) and an absolute verb (light *suppresses* it). See B06 and B08. |
| "Melatonin is flowing" at 4 a.m. with the lights on (v1, ch. 3) | Contradicts B08: room light suppresses melatonin. |
| Body-temperature low narrated (v1, ch. 3) | Level-S sources only (B10). |
| Short-sleeper hour figures | Level-S sources only (F03). |
| "Every big city tries" (v1, ch. 5) | Overgeneralised; contradicts the brief's "not every city". |
| "Earth's night side barely looks like night" (v1, ch. 7) | Overstated: city lights cover a small fraction of the night side. |
| "France was first" | Level S only. |

## Changes from v1

* Full definitions for the five classes; exactly one class per claim; qualifiers moved to Notes.
* CALC-03 verified, with method and range. CALC-04 withdrawn. CALC-01 corrected.
* Circadian and melatonin claims rebuilt (B04–B09) from S52–S54 and the shift-work reviews S55–S56.
* No dreams is now an explicit world rule (HR5); SP-13 covers only its human effects.
* F03, G06 and H08 rebuilt on level-A sources; B10 and A03 marked not narrated.
