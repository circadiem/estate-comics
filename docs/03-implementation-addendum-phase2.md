---
doc: Implementation Addendum — Phase 2 (Tasks 11–17)
status: ACTIVE — supersedes naming in the PDR and Implementation Spec v1
approved: Max, June 2026
---

# Estate Comics — Implementation Addendum: Phase 2

**Continues:** the task sequence from Implementation Spec §XIII (Tasks 1–10 complete).
**Brand decision:** TheComicBuyers is fully retired. The brand is **Estate Comics**
(`EstateComics` in code identifiers, `estatecomics.com` as the domain). No redirects maintained.

---

## Phase 2 decisions (locked)

| Decision | Resolution |
|---|---|
| Brand | Estate Comics; full retirement of TheComicBuyers |
| Reference numbers | `EC-YYYYMMDD-XXXX` |
| Sequencing | Function before brand; brand pass before any investor demo |
| Multi-book capture | Prescribed layout: covers up, no overlap, max 12 per photo |
| Grading model | Tiered — grid photos for ID + bulk rate; individual photos requested only for flagged books |
| Large collections (1,000+) | Sampled appraisal — photograph keys + sample, extrapolate bulk from declared count |
| Launch posture | Quiet live for investor demo; not accepting real submissions |
| GoCollect | Fallback table carries valuations until the key is live, labeled as such |

---

## Task 11 — Rename pass

Sweep every brand string: roughly 28 occurrences in code plus copy, metadata, emails, and the
PDF report.

- `lib/utils/reference-number.ts`: prefix `TCB-` → `EC-`. Format `EC-YYYYMMDD-XXXX`.
- `lib/services/email.ts`: `FROM_EMAIL` default → `Estate Comics <noreply@estatecomics.com>`;
  `INTERNAL_EMAIL` default → `intake@estatecomics.com`. All template copy, headers, footers.
- `lib/services/pdf-report.tsx`: report header, footer, methodology note.
- `app/layout.tsx`: site title, metadata, OpenGraph.
- All page copy (`app/page.tsx`, `about`, `how-it-works`, `appraise`, `lib/content/blog.ts`, geo pages).
- `.env.local.example`: `NEXT_PUBLIC_SITE_URL=https://estatecomics.com`, bucket name, intake address.
- `CLAUDE.md`: retitle and update the project overview. Brand voice rules unchanged.

**Manual (Max):** rename the GitHub repo, update the Vercel project, point estatecomics.com DNS,
configure Resend for the new domain.

**Acceptance:** `grep -ri "comicbuyers\|comic buyers"` returns zero hits outside `/docs/`.

---

## Task 12 — Persistence (Supabase + R2)

Submissions currently generate a PDF, a CSV, and two emails — then vanish. There is no database
at all: Supabase is installed but never imported. If both emails fail, `/api/submit` still
returns success, the seller sees a reference number, and the lead is gone forever.

### Schema

```sql
create type submission_status as enum
  ('draft','submitted','in_review','offer_sent','accepted','declined','expired');

create table submissions (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique not null,        -- EC-YYYYMMDD-XXXX
  status submission_status not null default 'submitted',
  seller jsonb not null,                        -- validated SellerQuestionnaire
  adjustment jsonb not null,                    -- grade adjustment block
  declared_count integer,                       -- total books claimed by seller
  photographed_count integer not null,
  summary jsonb not null,                       -- collection summary incl. offer range
  extrapolation jsonb,                          -- null unless sampled appraisal (Task 15)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  storage_key text not null,                    -- R2 object key
  capture_type text not null check (capture_type in ('single','grid','detail')),
  width integer, height integer,
  created_at timestamptz not null default now()
);

create table books (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  image_id uuid references images(id),
  crop_region jsonb,                            -- normalized bbox when from a grid image
  tier text not null check (tier in ('flagged','bulk')),
  identification jsonb not null,
  condition jsonb,                              -- null for bulk-tier books
  valuation jsonb,
  offer jsonb,
  adjusted_offer jsonb,
  is_hidden_gem boolean not null default false,
  needs_detail_photo boolean not null default false,
  created_at timestamptz not null default now()
);
```

### Storage

Cloudflare R2, bucket `estatecomics-uploads`. Store object keys only; generate signed URLs for
internal review. Images are written to R2 **before** the database transaction; rows reference the
keys.

### Submit route order of operations

Validate → write images to R2 → insert submission + images + books in one transaction →
generate PDF/CSV → send emails → return reference number.

A failed email never loses a submission. A failed database write fails the submission loudly.

**Acceptance:** every submission is reconstructable from the database alone — seller, every
book, every photo, the full offer math.

---

## Task 13 — Multi-book identification (grid capture)

One photo, up to 12 books, covers up, no overlap. Identification scales with the grid;
condition assessment does not. A 12-up grid at 2048px gives roughly 170px per cover — enough to
read a logo and an issue number, nowhere near enough to see spine ticks or corner blunting.
Grading happens only at the Task 14 detail tier.

### New prompt: `lib/prompts/identification-grid.ts`

- Detect each distinct cover. For each, return the same identification fields as the
  single-book prompt **plus** a normalized bounding box `{x, y, w, h}` in 0–1 coordinates.
- Hard cap at 15 detections. If more are visible, return the 15 most legible and set
  `overflow: true`.
- Conservative bias carries over: uncertain between two identifications → choose the more
  common and lower the confidence.
- Image-quality flags: `glare`, `overlap`, `out_of_focus`, `partial_cover`, `too_many_books`.
  Any flag on a detection caps its confidence at Medium.
- Variant caveat: newsstand/direct is often legible in a grid. Mark Jewelers and any
  interior-dependent variant is **never** callable from a grid — emit `variant_check_needed: true`
  rather than guessing.

### Schema addition: `GridIdentificationSchema`

```ts
{
  detections: GridDetection[];   // IdentificationResult + bbox + variant_check_needed
  detection_count: number;
  overflow: boolean;
  image_quality_flags: string[];
}
```

### API: `/api/identify-grid`

Mirrors `/api/identify`. Same retry/backoff, same Zod gate, same temperature 0.

### Upload UI

- Mode toggle: **Single book** / **Multiple books (up to 12)**.
- Grid mode shows capture guidance before the picker: covers facing up, no overlap, even
  lighting, twelve books or fewer per photo. This is UX guidance, not a rejection gate —
  flagged photos still process, with confidence penalties.
- Warn if per-cell resolution implies under ~400px per cover. Twelve-up on a 2048px image is
  marginal; recommend nine or fewer in UI copy despite the hard cap of twelve.
- Results feed: each grid photo expands into N book rows. Thumbnails are client-side canvas
  crops from the bounding boxes. Detection-count badge per photo.

### Cost note

Grid identification is one vision call per photo regardless of book count: roughly
$0.01–0.03 per call ÷ 12 books ≈ **$0.001–0.0025 per book**. Update the diligence packet's
unit-economics claim when it is next revised.

---

## Task 14 — Tiered capture flow

Every detected book enters the pipeline at one of two tiers.

### Tier assignment (automatic, post-identification)

A book is **flagged** — a detail photo is requested — when any of:

1. Title/issue matches the obvious-keys list (`lib/config/obvious-keys.ts`), or
2. FMV midpoint at an assumed mid-grade exceeds `HIDDEN_GEM_FMV_THRESHOLD` ($50), or
3. `variant_check_needed` is true on a book whose variant would clear threshold 2, or
4. Identification confidence is Low — never offer on a Low-confidence ID.

Everything else is **bulk**.

### Bulk-tier valuation

No condition assessment. Valued at a conservative assumption:

```ts
export const BULK_ASSUMED_GRADE = 4.0;   // VG — conservative reader assumption
export const BULK_OFFER_PCT = 0.15;      // midpoint of the 10–20% bulk tier
```

Bulk offer per book = FMV at 4.0 × `BULK_OFFER_PCT`. Where no FMV exists, the fallback table's
reader-copy floor applies. When in doubt the bulk number goes down, not up.

### Flagged-book flow

After grid processing, the appraise UI presents a **"These books need a closer look"** panel:
each flagged book with its grid thumbnail, the reason it was flagged in plain language — *"This
issue can carry real value; a clear photo of the full cover lets us assess it properly"* — and
an individual upload slot. Detail photos run the existing single-book pipeline: full condition
assessment, floor and likely grade, tiered offer percentage.

A seller may skip detail photos. Skipped flagged books are valued at bulk tier with
`needs_detail_photo: true` persisted. The upside is documented for internal review and never
paid for sight unseen.

**Acceptance:** a 60-book test collection processed as 5 grid photos produces 60 book rows,
correctly tiered, with flagged books individually gradeable and per-book offer math auditable.

---

## Task 15 — Sampled appraisal (1,000+ collections)

When `declared_count > photographed_count`, the offer engine adds an extrapolation block.

```
assessed_offer  = sum of all photographed books (flagged + bulk tiers)
sample_bulk_avg = mean bulk-tier offer per photographed non-flagged book
remainder       = declared_count − photographed_count
remainder_rate  = clamp(sample_bulk_avg, BULK_RATE_FLOOR, BULK_RATE_CEILING)
remainder_offer = remainder × remainder_rate

offer_floor     = assessed_offer + remainder × BULK_RATE_FLOOR
offer_ceiling   = assessed_offer + remainder_offer
```

```ts
export const BULK_RATE_FLOOR = 0.50;         // $/book — absolute conservative floor
export const BULK_RATE_CEILING = 1.50;       // $/book — cap regardless of sample average
export const MIN_SAMPLE_RATE = 0.03;         // photographed must be ≥3% of declared count
export const MAX_EXTRAPOLATED_SHARE = 0.40;  // before manual flag
```

### Guardrails

- **Minimum sample.** Below `MIN_SAMPLE_RATE`, produce no extrapolated number — produce the
  assessed offer plus *"remainder to be evaluated at inspection."* No number beats a fabricated one.
- **Concentration flag.** If the extrapolated portion exceeds 40% of the ceiling, mark the
  submission `MANUAL_REVIEW` and present the seller-facing range as preliminary, pending count
  verification. This protects against ten photographed keys carrying five thousand phantom books.
- **Disclosure.** The PDF methodology note states in plain language that the offer combines
  individually assessed books with a per-book rate applied to the declared remainder, that the
  count is verified at physical inspection, and that the 14-day validity and inspection
  contingency apply to the whole.
- Persist the extrapolation block in `submissions.extrapolation` — sample size, rate used,
  remainder, guardrail flags — so every number is reconstructable at review.

---

## Task 16 — Demo hardening

Quiet-live posture: deployed and presentable, but the demo never depends on live API behavior
or the GoCollect renewal.

- **Demo mode.** `DEMO_MODE=true`. The appraise flow loads a seeded collection — 25–30 real
  books with pre-baked identification, condition and valuation JSON in
  `lib/fixtures/demo-collection.ts` — including at least two grid photos, four flagged keys with
  detail photos, one hidden gem, one restoration-suspected exclusion, and one sampled-appraisal
  scenario at `declared_count` 1,200. The full investor narrative in one walkthrough.
- **Valuation source labeling.** Every valuation carries
  `fmv_source: 'gocollect' | 'fallback' | 'fixture'`, surfaced in internal output and the CSV.
  When the GoCollect key lands, nothing changes but the source field.
- **Submission gate.** While not accepting real submissions, the final submit step in production
  presents a *"We're onboarding sellers by invitation — leave your details"* capture rather than
  firing the offer email. Controlled by `ACCEPT_SUBMISSIONS=false`.
- **Error-state pass.** Every API route's failure mode renders a designed state, not a console error.

---

## Task 17 — Provenance brand pass

Applied last, before any investor sees a screen. Source of truth:
`docs/04-brand-provenance.md` and the token files in `design/`.

- **Tailwind tokens** (`tailwind.config.ts`): import from `design/tailwind.tokens.ts`.
- **Type:** Cormorant Garamond (display) + Nunito Sans (body) via `next/font/google`,
  hierarchy per the brand system's type scale.
- **Wordmark:** typographic — "EstateComics" in Cormorant Garamond 700, antique-gold hairline
  divider, italic descriptor *Professional Comic Book Estate Services*. The divider is part of
  the logo system. No icon.
- **Surfaces:** nav, footer, homepage hero and trust bar, the **For Attorneys** page (which does
  not exist yet — build it in this task), the appraise flow, questionnaire, results feed, both
  email templates, and the PDF report. The report is the single most important brand touchpoint:
  dark-umber rule header, vellum meta band, gold-rule summary cards, alternating table rows.
- **Tagline:** *Every collection has a story. We honor it.* — footer and email signature.
  "Fair. Fast. Simple." remains available as process copy, not as the tagline.
- **Footer line:** *Powered by Legends of Superheros · Est. 1993.*

---

## Standing rules (unchanged from v1)

- Model `claude-sonnet-4-5-20250929`, temperature 0, Zod-gate every AI response.
- Grade to buy, not to sell. Conservative bias on identification and condition.
- 100-book minimum at qualification. 14-day offer validity. All offers contingent on inspection.
- No Corner Box references anywhere in this codebase, its copy, or its documents.
- Full TypeScript, no `any`, secrets in env only.

---

*Sequence: 11 → 12 → 13 → 14 → 15 → 16 → 17. Tasks 13–15 are one architectural arc and should be
built in order. Task 17 waits until the flow demos clean. Note that the July 2026 audit
re-prioritized some of this — see `docs/05-build-sequence.md` for the reconciled order.*
