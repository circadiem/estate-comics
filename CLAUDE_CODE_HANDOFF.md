# CLAUDE CODE HANDOFF — Estate Comics Launch Fixes
**Repo:** github.com/circadiem/thecomicbuyers
**Purpose:** Execute the fixes and features from the July 2026 code audit, in order. Each Work Order below is designed to be one Claude Code session. Paste the Work Order text as your prompt, or point Claude Code at this file and say "Execute Work Order N."

**Recommended usage:** Drop this file in the repo root. Start each session with:
> Read CLAUDE_CODE_HANDOFF.md and claude.md. Execute Work Order [N]. Do not start the next Work Order without confirmation. Run `npm run type-check` and `npm run build` before declaring any Work Order complete.

---

## STANDING RULES (apply to every Work Order)

1. **Never trust client-supplied money math.** All offer/valuation numbers used in reports, emails, or stored records must be computed or recomputed server-side.
2. **Zod at every boundary.** Any new API input or external API response gets a schema. No `any`.
3. **Full TypeScript.** `npm run type-check` must pass with zero errors before commit.
4. **Conservative buy-side bias.** When a change affects offer amounts, the change must never increase an offer beyond photo-graded FMV. When in doubt, discount and flag for review.
5. **No Corner Box references** anywhere in seller-facing code, copy, comments, or commit messages. The brands never cross-reference.
6. **Preserve the existing error-class pattern** (`ClaudeApiError` / `ClaudeValidationError`) and retry/backoff conventions when touching services.
7. **One Work Order per branch, one PR each.** Branch naming: `fix/wo-01-summary-math`, `feat/wo-04-persistence`, etc.
8. **Every Work Order ends with:** type-check pass, build pass, and a short summary of files changed + anything deferred.

---

## WORK ORDER 01 — Fix the summary math (adjusted vs. unadjusted offers)
**Severity: Critical. Est: 30–60 min.**

**Problem:** `buildCollectionSummary()` in `lib/services/offer.ts` sums the unadjusted `offer` field, but the on-screen totals, PDF per-book rows (`lib/services/pdf-report.tsx`), and email per-book tables (`lib/services/email.ts`) all use `adjusted_offer`. Whenever the questionnaire storage multiplier ≠ 1.0, the headline "Estimated Cash Offer" in the confirmation email and PDF summary page does not equal the sum of the rows beneath it. `key_issues_count` has the same defect (counts by unadjusted tier).

**Tasks:**
1. Change `buildCollectionSummary()` to compute `total_offer_low`, `total_offer_high`, `key_issues_count`, and `bulk_lot_count` from `adjusted_offer`, not `offer`. Update the `CollectionBook` interface accordingly (it currently doesn't include `adjusted_offer` — add it as required).
2. Audit every consumer of `CollectionSummary` (`/api/submit`, `/api/generate-report`, `email.ts`, `pdf-report.tsx`, `components/report/index.tsx`) and confirm all totals, counts, and per-book figures now derive from the same adjusted numbers.
3. Add a unit test (create `lib/services/__tests__/offer.test.ts`; add vitest as a dev dependency with a minimal config): given 3 books with a 0.85 multiplier, assert summary totals equal the sum of adjusted per-book offers, and assert a book whose adjusted midpoint crosses the $500 tier floor is counted consistently everywhere.

**Acceptance:** With multiplier 0.85, the email headline number == sum of email table rows == PDF summary == on-screen total. Tests pass.

---

## WORK ORDER 02 — Single reference number + EC- format
**Severity: Critical. Est: 1 hr.**

**Problem:** `/api/generate-report` and `/api/submit` each call `generateReferenceNumber()` independently — a seller's downloaded PDF and confirmation email carry different reference numbers. Format is also `TCB-` but the standard is `EC-YYYYMMDD-XXXX`.

**Tasks:**
1. Change the prefix in `lib/utils/reference-number.ts` from `TCB-` to `EC-`.
2. Mint the reference number once per appraisal session. Implementation: generate it client-side is NOT acceptable (trust boundary). Instead: `/api/generate-report` accepts an optional `reference_number` in the request body (validated against `/^EC-\d{8}-[0-9A-F]{4}$/`); `/api/submit` becomes the canonical minting point. Flow change in `app/appraise/page.tsx`: if the user generates a report *before* submitting, hold the returned reference number in state and pass it to `/api/submit`, which reuses it if provided and valid, otherwise mints fresh. If the user submits first, pass the submission's reference number to any subsequent report generation.
3. Simpler alternative if the above gets tangled: make report generation *require* prior submission (reorder the UI so "Submit for Formal Offer" comes before "Download Report"), and have `/api/submit` return the PDF/CSV in its response. Choose whichever produces the cleaner flow — but one session must never produce two reference numbers.

**Acceptance:** A full session (upload → questionnaire → report → submit, in any order the UI allows) produces exactly one reference number, format `EC-YYYYMMDD-XXXX`, appearing identically in the PDF, CSV, on-screen confirmation, and both emails.

---

## WORK ORDER 03 — Copy and config corrections
**Severity: High. Est: 1 hr.**

**Tasks:**
1. **Payment terms copy.** In `lib/services/email.ts` (seller confirmation "What happens next") and `app/appraise/page.tsx` (submitted screen), replace all "same-day payment" / "we pay in cash when we pick up" language with the actual policy: *"Physical verification at pickup, payment within 48 hours via your preferred method (bank transfer, USDC, or BTC). Offers are contingent on physical inspection and valid for 14 days."* Keep the warm register; do not make it sound like fine print.
2. **Env var alignment.** `lib/services/email.ts` reads `INTERNAL_EMAIL` and `FROM_EMAIL`; `.env.local.example` defines `INTAKE_EMAIL` and neither of the others. Standardize on `INTAKE_EMAIL` and `FROM_EMAIL` — update code and example file to match, and remove the silent hard-coded fallback to `offers@thecomicbuyers.com` (throw at startup of the email service if unset, same pattern as the Resend key).
3. **Enforce MIN_COLLECTION_SIZE.** In `components/questionnaire/index.tsx`, when `estimated_count < MIN_COLLECTION_SIZE` (100), do not block submission — instead show an inline notice: *"Our appraisal service is designed for collections of 100+ books. You're welcome to continue, but smaller collections may be better served by a local comic shop."* Add `below_minimum: boolean` to the internal notification email so the operator sees it. (Soft gate, not hard — the operator decides.)
4. **Enforce MAX_HIDDEN_GEMS.** Hidden gem detection happens per-book in `lib/services/gocollect.ts` with no collection-level cap. Since valuation is per-book, enforce the cap at summary/report time: in `buildCollectionSummary` and the report/PDF/email renderers, surface only the top `MAX_HIDDEN_GEMS` (10) gems ranked by `fmv_midpoint`; count the rest as ordinary books.
5. **Wire up `photo_quality`.** In the pipeline (`app/appraise/page.tsx` / `components/results/index.tsx`): if identification returns `photo_quality: 'poor'`, force-set `flagged_for_review: true` on that book and render a visible "Photo quality low — consider retaking" badge with a per-book retake affordance (re-open the camera input for that slot, replacing the image and re-running the pipeline for that book only).

**Acceptance:** grep for "same-day" and "cash" in seller-facing strings returns nothing objectionable; email service throws on missing env; sub-100 submissions flagged; ≤10 gems in any report; poor photos visibly flagged with retake path.

---

## WORK ORDER 04 — Supabase persistence (the launch blocker)
**Severity: Critical. Est: half day.**

**Problem:** No database exists. `/api/submit` returns success even if both notification emails fail — the lead is unrecoverable. `@supabase/supabase-js` is installed but never imported.

**Tasks:**
1. Create `lib/services/supabase.ts`: server-side client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (add to `.env.local.example`; note this is the service key, server-only — never expose to the client bundle). Lazy singleton, throw-if-missing, matching the Resend/Anthropic client pattern.
2. Create `supabase/migrations/0001_init.sql` with:
   - `submissions` (id uuid pk default gen_random_uuid(), reference_number text unique not null, status text not null default 'pending' check (status in ('pending','reviewed','offer_sent','scheduled','completed','declined')), seller jsonb not null, adjustment jsonb not null, summary jsonb not null, below_minimum boolean not null default false, created_at timestamptz default now(), updated_at timestamptz default now())
   - `submission_books` (id uuid pk, submission_id uuid references submissions on delete cascade, position int, identification jsonb, condition jsonb, valuation jsonb, offer jsonb, adjusted_offer jsonb, flagged boolean generated as needed or plain column)
   - Enable RLS on both tables with **no** anon policies (service-role access only).
3. Rework `/api/submit` order of operations: validate → recompute server-side (see WO-05, but at minimum store what's validated) → **insert submission + books in a transaction (use a Postgres function via `rpc` or sequential inserts with cleanup on failure)** → on DB failure return 500 with a "please try again or email us" error → only after a durable write, generate PDF/CSV and send emails via `Promise.allSettled` (still non-fatal) → return 200 with reference number.
4. Reference number uniqueness: on unique-violation insert error, regenerate the suffix and retry (max 3 attempts).
5. Store the email send outcomes on the submission row (`seller_email_sent`, `internal_email_sent` booleans) so failed notifications are findable.

**Acceptance:** Kill the network to Resend (bad key) and submit — the submission row exists, the API returns 200, email failure is recorded. Break the Supabase URL and submit — the API returns 500 and the seller sees a retry message, not a false success.

---

## WORK ORDER 05 — Server-side recompute (close the trust boundary)
**Severity: Critical. Est: 2–3 hrs. Depends on WO-01, WO-04.**

**Problem:** `/api/submit` and `/api/generate-report` accept client-supplied `valuation`, `offer`, and `adjusted_offer` objects and treat them as truth. Offer math (`computeGradeAdjustment`, `applyAdjustmentToOffer`) runs in the browser.

**Tasks:**
1. Change the request contract for both routes: the client sends `seller` (questionnaire), and per book only `identification`, `condition`, and `valuation`. The server:
   - Recomputes `adjustment` from the questionnaire via `computeGradeAdjustment` (ignore any client-sent adjustment).
   - Recomputes `offer` from each valuation via `calculateBookOffer`, and `adjusted_offer` via `applyAdjustmentToOffer`.
   - Rejects (400) any book whose valuation fails schema or whose FMV fields are internally inconsistent (midpoint outside [low, high], low > high).
2. Note the residual risk in a code comment: valuations themselves are still client-echoed (they originated from `/api/valuate`, but a client could tamper). Full closure requires persisting pipeline results server-side keyed by session — defer to WO-09 (sessions) and log it in the PR description as a known limitation.
3. Update `app/appraise/page.tsx` to the slimmer payload. Client-side adjustment math may remain for *display preview only* — label it clearly in code; the authoritative numbers come back from the server response. Have `/api/submit` return the recomputed summary and per-book adjusted offers, and render the confirmation from that response, not from local state.

**Acceptance:** Tampering with `offer_low` in DevTools before submit has zero effect on the stored record, the emails, or the PDF. The confirmation screen reflects server-computed numbers.

---

## WORK ORDER 06 — Concurrency pool + resumable client state
**Severity: Critical for bulk use case. Est: 3–4 hrs.**

**Tasks:**
1. **Worker pool.** Replace `Promise.all(readyImages.map(processOne))` in `app/appraise/page.tsx` with a concurrency-limited pool (limit 4; export as `PIPELINE_CONCURRENCY` in `lib/config/constants.ts`). No new dependency needed — a ~15-line async pool is fine.
2. **Progress UI.** Add "Processing X of N" with a progress bar during the processing phase; individual card statuses already exist.
3. **Per-book retry.** Books that end in `status: 'error'` get a "Retry" button on their result card that re-runs `processOne` for just that book. After the batch completes, if any errors remain, show a banner: "N books couldn't be processed — retry them or continue without."
4. **Session persistence (localStorage).** After each book reaches `complete` or `error`, serialize `{phase, comics-without-base64, questionnaire}` to localStorage under a session key. **Do NOT store `processedBase64`** (quota). On mount, if a saved session exists, offer "Resume your appraisal (N books identified)" vs "Start fresh." Books whose images are gone (refresh cleared memory) but whose results persisted remain fully usable — the pipeline results are what matter downstream. Books that were mid-processing at refresh revert to an "image needed — re-add photo" state.
5. Clear the saved session on successful submit or explicit Start Over.

**Acceptance:** 30-image batch never exceeds 4 in-flight API calls; refresh mid-run preserves all completed results; a single failed book is individually retryable.

---

## WORK ORDER 07 — GoCollect client rewrite (behind a flag)
**Severity: Critical for live valuations; not demo-blocking. Est: half day. ⚠️ Requires Max's live API key to finish — build against the documented shape, keep flag off until verified.**

**Problem:** `lib/services/gocollect.ts` queries `GET /v1/books/fmv?title=...` — this endpoint does not exist. GoCollect's API is item-ID based: search collectibles to resolve an `item_id`, then query insights per item + grade (documented pattern: `GET https://api.gocollect.com/v1/insights/item/{item_id}?grade=9.8`). As written, every call fails, burns ~14s of retries per book, and silently falls to the interpolation table even with a valid key.

**Tasks:**
1. Add `GOCOLLECT_ENABLED` env flag (default false). When false, skip straight to the fallback table with zero network calls and zero retry delay.
2. Rewrite the client as a two-step flow:
   - `searchItem(title, issue)` → GET `/v1/collectibles` with query params per docs → resolve best-match `item_id`. Define a Zod schema with `.passthrough()` and mark it `// UNVERIFIED — confirm against live docs` since the exact response shape needs Max's authenticated docs access.
   - `getInsights(itemId, grade)` → GET `/v1/insights/item/{item_id}?grade={grade}` → map to the internal `FmvData` shape.
3. **Item-ID cache:** create table `gocollect_items` (title_normalized, issue, item_id, resolved_at) in a new migration; check cache before searching. Estate lots are repetitive — this protects the rate limit.
4. Fail fast: no retries on 404/no-match (that's a legitimate "not found" → fallback table). Retries only for 429/5xx/network, and reduce to `MAX_RETRIES = 2` with 1s base delay for this client — a slow valuation is worse than a fallback valuation.
5. Fallback-grade query strategy: query at `condition.grade_midpoint` rounded to the nearest standard CGC grade increment (0.5 steps ≤ 9.0; then 9.2/9.4/9.6/9.8).
6. Write `docs/gocollect-verification.md`: a checklist of the exact requests to run manually with the live key (search response shape, insights response shape, auth header format, rate limits) so Max/Claude Code can verify and finalize the schemas the day the subscription renews.

**Acceptance:** Flag off → zero GoCollect network calls, instant fallback. Flag on with a fake key → graceful fallback with a single logged warning, no 14-second stalls. Schemas marked unverified where docs weren't confirmable.

---

## WORK ORDER 08 — Rate limiting, Turnstile, spend cap
**Severity: Required before public URL. Est: half day. ⚠️ Requires Max: Turnstile keys, Upstash/Vercel KV setup.**

**Tasks:**
1. **Rate limiter.** Add `@upstash/ratelimit` + `@upstash/redis` (env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Create `lib/services/rate-limit.ts` and apply to `/api/identify`, `/api/grade`, `/api/valuate`: sliding window, `RATE_LIMIT_RPH` (50) per IP per hour. Return 429 with a friendly JSON error the client surfaces as "You're moving fast — please wait a moment."
2. **Cloudflare Turnstile.** Widget on the appraise page rendered before the first upload; token sent with each `/api/identify` call (or verified once per session — verify server-side via siteverify, then set a short-lived signed httpOnly cookie the API routes check). Env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. Degrade gracefully in dev when keys are absent.
3. **Daily spend cap.** In `lib/services/claude.ts`, after each API call, record `usage.input_tokens` / `usage.output_tokens` to a Redis daily counter; compute approximate spend from a `MODEL_PRICING` constant. When the day's spend exceeds `DAILY_API_CAP_USD`, `/api/identify` returns 503 with `{ error: 'capacity', message: ... }` and the client shows: "We're at capacity today — leave your email and we'll notify you when the appraiser reopens" (store the email in a `waitlist` table).
4. **Request body limits.** Add explicit base64 length validation to `/api/identify` and `/api/grade` (reject decoded payloads over `MAX_IMAGE_SIZE_BYTES`).

**Acceptance:** 51st request in an hour from one IP → 429. Missing Turnstile token → 403. Simulated cap breach → 503 + waitlist path. Oversized payload → 400.

---

## WORK ORDER 09 — HEIC support + upload polish
**Severity: High (funnel). Est: 2 hrs.**

**Tasks:**
1. Add `heic2any` (client-only, dynamic `import()` inside the handler so it never lands in the server bundle). In `lib/utils/image-validation.ts` `processFile()`: when MIME is `image/heic`/`image/heif` (or extension `.heic`/`.heif` with empty MIME, which iOS Safari sometimes reports), convert to JPEG blob first, then continue the existing pipeline. Remove the "go change your camera settings" rejection copy.
2. Show a per-file "Converting…" state during HEIC conversion (it can take 1–3s per photo).
3. EXIF orientation: verify canvas output orientation for portrait iPhone photos (modern browsers honor EXIF via `createImageBitmap` with `imageOrientation: 'from-image'` — use it in place of the `Image` element path where supported, keep the current path as fallback).

**Acceptance:** An iPhone HEIC photo uploads, converts, processes, and displays right-side-up with no user instruction.

---

## WORK ORDER 10 — SEO plumbing
**Severity: High for the referral channel. Est: half day.**

**Tasks:**
1. `app/sitemap.ts` — all static pages, all `/areas/[state]`, all blog slugs, using `NEXT_PUBLIC_SITE_URL`.
2. `app/robots.ts` — allow all, reference sitemap, disallow `/api/`.
3. Per-page `generateMetadata` for `/areas/[state]`: unique title ("Sell Comic Books in {State} — Free Estate & Collection Appraisal"), unique description using the existing taglines/cities from `lib/config/service-areas.ts`, canonical URL, OpenGraph.
4. JSON-LD on geo pages: `Service` schema with `areaServed` (state), `provider` (Organization), and `potentialAction` pointing at `/appraise`. On blog posts: `Article` schema.
5. Blog and how-it-works metadata pass (unique titles/descriptions; currently inherit the root layout's).

**Acceptance:** `/sitemap.xml` and `/robots.txt` resolve; each geo page has unique title/description/canonical and valid JSON-LD (paste into Google's Rich Results test).

---

## WORK ORDER 11 — Rename pass: TheComicBuyers → Estate Comics
**Severity: Before any external eyes. Est: 2–3 hrs. ⚠️ Coordinate with Max on domain/email cutover (see MAX-TODO).**

**Tasks:**
1. Sweep all 43 `TheComicBuyers`/`thecomicbuyers` occurrences in ts/tsx, plus `claude.md`, `package.json` name, email templates, nav/footer, page copy, and metadata. Replace with "Estate Comics" / `estatecomics.com`.
2. Email addresses: `noreply@estatecomics.com`, `intake@estatecomics.com` (env-driven — just update `.env.local.example` defaults and any hard-coded fallbacks, which WO-03 should have removed).
3. Update `claude.md` project overview and standing instructions; correct "established 1993" if it says otherwise.
4. Do NOT rename the GitHub repo or Vercel project inside this Work Order — that's Max's manual step; note in the PR that code is rename-complete and pending infra rename.
5. Leave `docs/PDR` and `docs/Implementation_Spec` filenames as-is (historical), but add a `docs/README.md` note that the brand is now Estate Comics.

**Acceptance:** `grep -ri "comicbuyers" --include="*.ts*" .` returns zero hits outside `/docs`.

---

## WORK ORDER 12 — Admin review queue
**Severity: Needed before first real offer goes out. Est: 1 day. Depends on WO-04/05.**

**Tasks:**
1. `/admin` route protected by HTTP Basic Auth via middleware (env: `ADMIN_USER`, `ADMIN_PASS` — simple and adequate for a sole operator; note upgrade path to Supabase Auth later).
2. Submissions list: reference number, seller name/state, book count, offer range, status, created date; filter by status; sorted newest first.
3. Submission detail: full seller info, questionnaire answers, adjustment reasons, per-book table (identification, grade range, FMV, source, adjusted offer, flags), hidden gems, below-minimum flag, email send status.
4. Per-book override: editable FMV low/high and grade midpoint → server recomputes that book's offer and the collection totals on save (reuse WO-05 logic). Store an `overrides` jsonb audit trail (who=admin, when, before/after).
5. Status transitions (pending → reviewed → offer_sent → scheduled → completed/declined) with timestamps.
6. "Regenerate report" button → produces a fresh PDF from current (possibly overridden) data under the same reference number, downloadable from the admin page.
7. **Routing checkbox per book:** a private `pipeline_candidate` boolean (label it neutrally, e.g., "Priority review") stored server-side only — never rendered in any seller-facing artifact.

**Acceptance:** Full lifecycle walkable in the UI: submission arrives → review → override one book's FMV → totals update → regenerate PDF → mark offer_sent.

---

## WORK ORDER 13 — Multi-book grid identification (the big unlock)
**Severity: The bulk-estate differentiator. Est: 2–3 days. Do last of this sequence; everything above is its foundation.**

**Spec (from Phase 2 addendum):** covers up, no overlap, maximum 12 books per photo; grid photos drive identification + bulk condition rating; individual detail photos only for flagged high-value books.

**Tasks:**
1. **New prompt** `lib/prompts/grid-identification.ts`: given a photo containing 1–12 comic covers arranged in a grid, return a JSON array of per-book identifications, each with the existing IdentificationResult fields **plus** `grid_position` ({row, col} or index, reading order left-to-right top-to-bottom) and a per-book `confidence_score`. Instruct: if more than 12 books or significant overlap is detected, return a structured error field so the UI can ask for a re-shoot. Temperature 0.
2. **Grid condition prompt:** a lighter-weight bulk assessment returning per-book `grade_low/high/midpoint` and top defect only (full 6-element assessment is unrealistic at grid resolution). Add a `assessment_depth: 'grid' | 'full'` field to ConditionResult (schema change — default 'full' for the existing path).
3. **Escalation rule:** any grid book with `fmv_midpoint ≥ $50` (reuse `HIDDEN_GEM_FMV_THRESHOLD`), any identified key significance, or confidence < 80 → status `needs_detail_photo`. The UI queues these: "3 books look valuable — take a close-up of each for an accurate offer," and each detail photo runs the existing full single-book pipeline, replacing the grid-derived record.
4. **Upload mode toggle:** "One book per photo" (existing) vs "Grid mode — up to 12 per photo (lay them flat, covers up, no overlap)". Grid mode sends the image to a new `/api/identify-grid` route; each returned book becomes a `ComicProcessingState` entry sharing the source image, with a cropped thumbnail if feasible (canvas crop by estimated grid cell; nice-to-have, fall back to whole-image thumbnail).
5. Pipeline: grid books flow into valuate/offer exactly like single books. Image size: allow grid photos to keep 2048px max edge but warn if per-cell resolution implies under ~400px per cover (12-up on a 2048px image is marginal — recommend ≤ 9 per photo in UI copy despite the 12 hard cap).
6. Token/cost note: log grid calls to the WO-08 spend counter with their larger output token counts.

**Acceptance:** A photo of 9 covers produces 9 identified pipeline entries; high-value/low-confidence books visibly request detail shots; a detail shot upgrades the record; totals include all books; concurrency pool applies to grid calls.

---

## BACKLOG (specced in audit, not yet work-ordered — ask Max before starting)
- **Executor Mode** — questionnaire profile toggle → probate-register PDF variant ("fair market value for probate purposes," methodology/defensibility section, signature block). High leverage, low cost; recommend scheduling immediately after WO-12.
- **Sampled appraisal** for 1,000+ book collections (Phase 2 Task 14).
- **Resumable magic-link sessions** (server-side; builds on WO-04/06).
- **Duplicate detection** within a session.
- **CSV inventory import** for downsizing collectors.
- **Provenance brand pass** — Cormorant Garamond, umber/vellum palette (Phase 2 Task 17); Max to supply/approve design tokens first.
- **R2 image storage** — upload once, pass keys instead of re-sending base64 to identify + grade; also enables the admin queue to display the actual photos (currently images are never stored — the admin sees data with no pictures; flag this to Max as a strong reason to prioritize R2).
- **Model upgrade eval** — benchmark identification accuracy on a fixed cover test set before switching from `claude-sonnet-4-5-20250929`.
