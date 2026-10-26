# Review loop ledger: Charmera About page

Success question (from the confirmed brief, `teamremco_homepage/docs/VOICE.md`):
*Can the reader say why Frank made this app and what they can do with it, and
then open it?*

## Round 1 — 2026-10-26 (light pass, 3 readers)

Frozen at cd62bfc. Step 0: `review/loop/check.mjs`, 12 checks pass. It was
tested by planting four faults, and it caught all four. The only failure is the
two placeholders, which are known.

| Reader | Model | Materials |
|---|---|---|
| Comprehension: phone, never heard of a Charmera | Haiku | 5 phone slices |
| Comprehension: laptop, owns a Charmera, used the app once | Sonnet | 3 desktop slices |
| Specialist: voice-brief compliance | Opus | brief, transcript, source, desktop slices |

**Success question:** met by both comprehension readers. Each said why Frank
built the app, named what it does, and pointed to "Open charmera collage". The
owner reader called the story "a real person I'd trust, not rambling".

**Tier 1 (fixed):**
1. The heading "“That’s a real camera?”" put words in quotation marks that
   nobody said (specialist). Checked against the transcript: it isn't there.
   Now "An actual working camera", which is Frank's phrase.
2. Numbers that mean nothing to the audience (owner reader: "1440 × 1080, 16.7
   megapixels"; specialist: "megapixels", "PNG or JPG"). Two readers on two
   models. Fixed for megapixels: "iPhones can’t save very large images". **Not
   fixed:** 1440 × 1080 is in the sample Frank confirmed, so it goes to Frank.
   PNG or JPG is the wording on the app's own buttons, so it stays.

Proof: counted "real camera" and "megapixels" whitespace-insensitively in
`about/index.html` and in the built page served from `dist/`. Both counts were
1 before the fix and 0 after.

**Tier 3 (for Frank, not acted on):**
- Say plainly under the title what the app is, e.g. "a free app that turns
  your photos into a collage" (phone reader; they only felt sure at "One minute,
  no ads").
- The step screenshots in "How the minute goes" are too small to read (owner
  reader). They read as pictures, not instructions.
- "Not filters: each one is built like the real thing" leans salesy; "Snap it"
  leans cute (specialist, light flags; "Snap it" is the app's own button).
- The closing joins two of Frank's sentences into one of 20 words (specialist,
  minor).
- Counterweight: the owner reader would not tidy the story further. They found
  the feature cards stiffer than the story; the brief wants exactly that.

**Tier 0:** captions split across slice breaks (owner reader). This was caused
by how the page was sliced for the readers; the page itself is fine.

**Predictions vs results:** both comprehension readers met the success
question (as predicted). The new reader paused on "a roll" (predicted) and
worked it out from the caption. The owner reader called the story genuine
(predicted). The specialist found 1 story departure, the heading, not the
rephrasings I expected ("most owners" and similar were judged allowed cleanup).
Tier 1 was 2, against a prediction of 0–1.

**Believed, and wrong:** "The specialist finds 1–3 small departures in the
story where the page still rephrases the transcript." The real departure was a
heading I wrote myself in quotation marks, which I hadn't counted as part of
the story at all.

**What the round bought:** one invented quote removed; one number replaced by
plain words; one conflict between the brief's sample and its own jargon rule,
now with Frank.

## Mistakes the next author will make

- Treating headings as "mine" and the story as "Frank's". A heading in
  quotation marks is a claim about what someone said.
- Fixing jargon in one sentence and missing it in alt text or the screenshot
  script's captions. Count across `about/`, not in one line.
- Running round 2 with a different cast and comparing its tier-1 count to this
  one. Three readers in a light pass is not a baseline.
