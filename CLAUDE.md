# CLAUDE.md — Estate Comics

Repo-root context. Read this at the start of every session, before any other file.

> **This file replaces the existing `claude.md` in the repo.** Merge anything repo-specific from
> the old file into this one and delete it. Do not keep both — two context files differing only
> by case is a bug waiting to happen on a case-insensitive filesystem.

---

## What this is

**Estate Comics** (`estatecomics.com`) is a professional comic book estate appraisal and
acquisition service. A seller photographs their collection, an AI pipeline identifies and
grades the books, market data sets fair market value, and the system produces a documented
appraisal with a cash offer range.

Powered by **Legends of Superheros**, a New England shop trading since 1993. That thirty-year
history is the trust signal; use it.

**Current posture: quiet-live.** The site is deployed and presentable for investor and advisor
demos. It is **not** accepting real submissions. Two env flags govern this — `DEMO_MODE` and
`ACCEPT_SUBMISSIONS`. Never remove or default-flip either one.

---

## The audience — build for these three people

Every UI decision, every string, every error state answers to one of them.

| Profile | Who | What they need |
|---|---|---|
| **Estate Executor** | Attorney, executor, estate-sale operator | A defensible, documented valuation. "Fair market value for probate purposes." Zero hobby language. |
| **Downsizing Collector** | Built the collection, knows what they have | Transparent offer logic. Peer-level respect. They will test your expertise. |
| **Inheritor** | Received a collection, knows nothing about comics | Plain language, no jargon, reassurance. The Hidden Gems feature exists for them. |

Tone check before shipping any copy: *would a 65-year-old attorney in Fairfield County feel
respected reading this?* If not, rewrite it.

---

## Hard rules — these are not preferences

1. **Never reference The Corner Box.** No "drops," no "the Vault," no sell-side language, no
   links, no shared components, no comments mentioning it. The buy-side and sell-side are
   separate brands and the pipeline between them is invisible to both audiences. A `grep -ri
   "corner box\|the vault\|\bdrop\b"` on this repo should return nothing outside `/docs/`.
2. **Never trust client-supplied money math.** Every offer or valuation number that lands in a
   report, an email, or a stored record is computed or recomputed **server-side**. The browser
   may display math; it may never be the source of it.
3. **Zod at every boundary.** Every API input and every external API response gets a schema.
   No `any`. `npm run type-check` passes with zero errors before any commit.
4. **Grade to buy, not to sell.** Conservative bias throughout. When identification or
   condition is uncertain, the number goes *down* and the book gets flagged for review.
   A change may never raise an offer above photo-graded FMV.
5. **Never offer on a Low-confidence identification.** Route it to manual review instead.
6. **Secrets live in env only.** `ANTHROPIC_API_KEY`, `GOCOLLECT_*`, `SUPABASE_SERVICE_ROLE_KEY`,
   `RESEND_API_KEY`, R2 credentials. Never in client code, never committed.
7. **Retired branding stays retired.** "TheComicBuyers" / "The Comic Buyers" appears nowhere
   outside `/docs/` historical documents.
8. **One reference number per session.** Format `EC-YYYYMMDD-XXXX`, validated against
   `/^EC-\d{8}-[0-9A-F]{4}$/`. `/api/submit` is the canonical minting point. The PDF, the CSV,
   the on-screen confirmation and both emails must carry the same one.
9. **Preserve existing conventions.** The `ClaudeApiError` / `ClaudeValidationError` error classes
   and the retry/backoff patterns stay as they are when you touch a service. Email env vars are
   `INTAKE_EMAIL` and `FROM_EMAIL` — no hard-coded fallback addresses; throw at service startup
   if unset, same as the Resend key.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind |
| AI | Anthropic SDK, model `claude-sonnet-4-5-20250929`, **temperature 0** |
| Market data | GoCollect API, with a fallback valuation table |
| Database | Supabase (Postgres) |
| Object storage | Cloudflare R2, bucket `estatecomics-uploads` |
| Email | Resend |
| PDF | React-PDF / Puppeteer server-side |
| Hosting | Vercel |

### GoCollect — read before touching valuation

The v1 code calls `/v1/books/fmv`. **That endpoint does not exist.** Every valuation in the
repo today silently falls through to the hardcoded fallback table, even with a live key.

The real integration is two steps:
1. Search `/v1/collectibles` to resolve title + issue → `item_id`
2. `GET /v1/insights/item/{item_id}?grade={grade}` for FMV at grade

Verify exact response shapes against live docs when the subscription is active. Until then the
fallback table carries every valuation and **must be labeled** — every `ValuationResult` carries
`fmv_source: 'gocollect' | 'fallback' | 'fixture'`, surfaced in internal output and the CSV.

---

## Offer tiers

Offers are a percentage of FMV **at the floor grade**, never the likely grade.

| Category | % of FMV |
|---|---|
| Tier 1 keys (AF #15, Hulk #181, ASM #300) | 55–65% |
| Tier 2 keys (defining moments, strong census) | 45–55% |
| Tier 3 / emerging keys | 35–45% |
| Tier 4 contextual (variants, newsstand) | 40–50% |
| Mid-grade readers (VG–FN, non-key) | 25–35% |
| Low-grade / reader copies | 15–25% |
| Bulk filler | 10–20% |

Collection adjustments: +5% over 500 books; +5% with three or more Tier 1 keys.
Offers are always stated as a **range**, never a single number.

Standing terms, enforced in copy and in the PDF: **100-book minimum**, **14-day offer validity**,
**all offers contingent on physical inspection**, adjustment clause if condition differs
materially from photos.

---

## Brand — "Provenance"

Full system in `docs/04-brand-provenance.md`. Tokens in `design/`. The short version:

- **Display:** Cormorant Garamond. **Body:** Nunito Sans. Both via `next/font/google`.
- **Core palette:** dark umber `#4A3F35`, antique gold `#A67C52`, vellum `#F3EDE4`,
  charcoal brown `#2E2620`.
- **Wordmark:** typographic. "EstateComics" in Cormorant Garamond 700, antique-gold hairline
  divider, italic descriptor *Professional Comic Book Estate Services*. No icon.
- **Tagline:** *Every collection has a story. We honor it.* — footer and email signature.
  "Fair. Fast. Simple." is process copy, not the tagline.
- **Footer line:** *Powered by Legends of Superheros · Est. 1993.*
- **Antique gold is a rule-and-accent color, not a body-text color.** It fails contrast at body
  size. See the accessibility table in the brand doc — the audience skews 50+ and this matters.
- **The PDF appraisal report is the single most important brand surface.** It is the artifact a
  seller forwards to their attorney. Style it before you style anything else.

---

## Where to look

| You need | Read |
|---|---|
| Build order, what's next | `docs/05-build-sequence.md` |
| The actual work order — files, tasks, acceptance | `CLAUDE_CODE_HANDOFF.md` |
| Why the product works this way | `docs/01-pdr.md` |
| Prompts, schemas, PDF spec, emails | `docs/02-implementation-spec-v1.md` |
| Grid capture, tiered grading, sampled appraisal, demo mode | `docs/03-implementation-addendum-phase2.md` |
| Colors, type, components, wordmark | `docs/04-brand-provenance.md` + `design/` |
| Anything blocked on an account, key or decision | `MAX_TODO.md` |

---

## Session protocol

Start every session with:

> Read `CLAUDE.md`, `docs/05-build-sequence.md`, and `CLAUDE_CODE_HANDOFF.md`. Execute Work Order
> [N]. Do not start the next Work Order without confirmation. Run `npm run type-check` and
> `npm run build` before declaring it complete.

One branch per work item. Do not batch unrelated changes.

**The regression ritual:** after any change touching the pipeline or offer math, run one real
end-to-end submission of five books and verify the totals reconcile across the on-screen
summary, the PDF, the CSV, and both emails. That reconciliation is the ground truth — it is the
exact thing the July audit found broken.

---

## Repo-specific notes (merged from the previous `claude.md`)

- **Scripts:** `npm run type-check` (tsc, zero errors required), `npm run build`, `npm test`
  (vitest, `lib/**/__tests__`). Run the first two before declaring any Work Order complete.
- **Service areas:** CT, MA, RI, NH, VT, ME, NY, NJ, PA, and South Florida (Miami-Dade,
  Broward, Palm Beach). `SERVICE_STATES` in `lib/config/constants.ts`; geo pages at
  `app/areas/[state]` driven by `lib/config/service-areas.ts`.
- **Pipeline data shape:** `Photo → IdentificationResult → ConditionResult → ValuationResult →
  OfferResult (+ adjusted_offer) → ReportData`. Zod schemas in `lib/schemas/`, prompts in
  `lib/prompts/` with standalone copies in `docs/prompts/`.
- **Historical documents:** the original `.docx` PDR and Implementation Spec remain in `docs/`
  for reference only. `docs/01-pdr.md` and `docs/02-implementation-spec-v1.md` supersede them.
- **Sub-100 collections** are a *soft* gate (WO-03): inline notice, submission still allowed,
  `below_minimum` surfaced to the operator. The old hard-gate instruction is retired.
