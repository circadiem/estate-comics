---
doc: Build Sequence — reconciled
status: ACTIVE — this is the order of work. Start here.
reconciles: CLAUDE_CODE_HANDOFF.md (July 2026) + docs/03-implementation-addendum-phase2.md (June 2026)
---

# Build sequence

## Why this document exists

There are two prior plans, written a month apart, and they overlap:

- **June 2026 — Implementation Addendum Phase 2**, Tasks 11–17. Feature-forward: rename,
  persistence, grid capture, tiered grading, sampled appraisal, demo hardening, brand pass.
- **July 2026 — `CLAUDE_CODE_HANDOFF.md`**, Work Orders 01–13. Written after a full codebase
  audit that found eight critical bugs. Fix-forward, with exact file targets.

Both are in this package. Handing Claude Code both without a map produces a stall at the first
conflict — and there are three real ones, resolved at the bottom of this document.

**`CLAUDE_CODE_HANDOFF.md` is the operative document.** It has the file paths, the task lists,
and the acceptance criteria. This document says which Work Orders run when, and what the June
plan adds on top. Where the two disagree on sequencing, the audit wins — it is based on what the
code actually does rather than what it was meant to do.

---

## The eight critical bugs (July 2026 audit)

Type-check and production build both passed clean. None of these are compiler-visible.

| # | Bug | Consequence | Fixed by |
|---|---|---|---|
| 1 | `buildCollectionSummary()` sums unadjusted `offer`; every consumer renders `adjusted_offer` | Whenever the storage multiplier is not 1.0, the headline offer in the PDF and email does not equal the sum of the rows beneath it | WO-01 |
| 2 | No database. `@supabase/supabase-js` installed, never imported | `/api/submit` returns success even when both emails fail. Seller gets a reference number; the lead is unrecoverable | WO-04 |
| 3 | GoCollect client queries `/v1/books/fmv`, which does not exist | Every call fails, burns ~14s of retries per book, silently falls to the interpolation table even with a valid key | WO-07 |
| 4 | `Promise.all` over every image — unbounded concurrency | A 200-book estate rate-limit-storms the API | WO-06 |
| 5 | All pipeline state in memory | The appraisal evaporates if the seller's phone backgrounds the tab | WO-06 |
| 6 | `/api/generate-report` and `/api/submit` each mint a reference number independently | The downloaded PDF and the confirmation email carry different numbers for the same session | WO-02 |
| 7 | Both routes accept client-supplied `valuation`, `offer`, `adjusted_offer` as truth; offer math runs in the browser | The browser can set the offer | WO-05 |
| 8 | Rate-limit constants defined, never consumed | No protection exists | WO-08 |

---

## Stage 1 — Correctness. Start today; no accounts, no keys.

**WO-01** summary math · **WO-02** single reference number in `EC-YYYYMMDD-XXXX` format ·
**WO-03** copy and config corrections.

WO-03 is not the rename — that is WO-11. WO-03 covers the payment-terms copy (replacing
"same-day payment" with the real 48-hours-post-verification policy), env var alignment
(`INTAKE_EMAIL` / `FROM_EMAIL`, killing the hard-coded fallback), the soft 100-book gate, the
10-gem cap at report time, and wiring `photo_quality` through to a visible retake affordance.

**Gate:** with a 0.85 multiplier, the email headline equals the sum of the email table rows
equals the PDF summary equals the on-screen total. One reference number per session, everywhere.

---

## Stage 2 — Durability. Blocked on Max (Supabase, R2).

**WO-04** Supabase persistence · **WO-05** server-side recompute · **WO-06** concurrency pool
(limit 4) plus localStorage session resume and per-book retry.

**R2 image storage — promoted out of the audit's backlog.** No photo is stored anywhere today.
WO-12's admin queue would show you AI identifications with no covers to check them against,
which cuts directly against verify-before-anything. Wire it here. It also lets the pipeline pass
object keys rather than re-sending base64 to both the identify and grade calls.

**Gate — quiet-live** (the audit's own gate, unchanged): WO-01 through WO-06 merged, plus one
**real** five-book submission pulled off the Legends shelf and verified by hand end to end. That
submission is the regression baseline for every merge after it.

---

## Stage 3 — Presentability. The investor demo gate.

This is where the June and July plans disagree most, and where the July plan is now out of date.

The audit left the brand pass in the backlog with the note *"Max to supply/approve design tokens
first."* **That blocker is cleared** — the tokens are in `design/`, the spec is in
`docs/04-brand-provenance.md`, and your standing instruction is that no investor or advisor sees
the product before the brand pass is done. It moves here.

**Task 17 — Provenance brand pass.** Order within the pass: the PDF report first, then the two
emails, then homepage and appraise flow, then nav/footer, then the **For Attorneys** page, which
does not exist yet and must be built in this pass.

**Task 16 — Demo hardening.** `DEMO_MODE` with the seeded 25–30 book fixture collection,
`ACCEPT_SUBMISSIONS=false` invitation capture, `fmv_source` labeling on every valuation, and a
designed failure state for every route.

**WO-07 — GoCollect rewrite** can land here. Build it behind `GOCOLLECT_ENABLED` (default false)
against the documented two-step shape, with schemas marked unverified, so it is ready the day the
subscription renews. WO-07 also produces `docs/gocollect-verification.md` — the checklist of
exact requests to run with the live key.

**Gate — investor demo:** a cold walkthrough on a phone, start to finish, no live API dependency,
ending in a branded PDF you would hand to an estate attorney.

---

## Stage 4 — Public readiness.

**WO-08** rate limiting, Turnstile, daily spend cap · **WO-09** HEIC support — which matters more
than it sounds, since the audience is iPhone users photographing longboxes and the current copy
tells them to go change their camera settings · **WO-10** SEO plumbing, sitemap, robots, geo-page
metadata and JSON-LD · **WO-11** rename pass, 43 occurrences · **WO-12** admin review queue.

**Gate — public:** all of the above, geo pages indexed, before any attorney outreach or paid
traffic.

---

## Stage 5 — The bulk claim.

**WO-13** grid identification. One photo, up to twelve covers, detail photos requested only for
flagged books. Everything above it is its foundation. This is the claim the whole positioning
rests on.

**Task 15 — sampled appraisal** for 1,000+ collections, with the $0.50/$1.50 clamps and the 40%
concentration flag.

**Executor Mode** — questionnaire profile toggle producing a probate-register PDF variant. The
audit recommends scheduling it immediately after WO-12, and I agree: it is the feature that turns
one attorney into a recurring referral channel.

---

## The three conflicts, resolved

### 1. Two different database schemas

WO-04 specifies `submissions` + `submission_books`, status as a text check constraint
(`pending, reviewed, offer_sent, scheduled, completed, declined`), plus `below_minimum` and the
email-sent booleans. Phase 2 Task 12 specifies `submissions` + `images` + `books`, a
`submission_status` enum with different values, plus `declared_count`, `photographed_count` and
`extrapolation`.

**WO-04's schema wins.** WO-12's admin queue is built against its status values, and the
email-outcome columns exist because of a bug that actually happened. Take WO-04 as
`0001_init.sql` verbatim.

The Phase 2 columns are still needed later. Add them in a second migration when their features
land: the `images` table with R2 keys and `capture_type` in Stage 2, and `declared_count`,
`photographed_count`, `extrapolation` plus `crop_region` / `tier` / `needs_detail_photo` on
`submission_books` alongside WO-13 and Task 15. Do not try to merge both schemas up front.

### 2. Rename scope

Phase 2 Task 11 and WO-11 are the same job. Use **WO-11** — it has the real occurrence count (43)
and the correct constraint that Claude Code does not touch the GitHub or Vercel rename.

WO-11 task 5 says to leave the `docs/PDR` and `docs/Implementation_Spec` filenames as-is. This
package already renamed them to `docs/01-pdr.md` and `docs/02-implementation-spec-v1.md` with
supersession banners at the top, which does the same job better. Skip that sub-task.

### 3. There is already a `claude.md` in the repo

WO-11 task 3 updates it. The `CLAUDE.md` in this package is written to **replace** it, not sit
beside it. Merge anything repo-specific from the existing file into this one and delete the old
file — two context files with different casing on a case-insensitive filesystem is a bug waiting
to happen.

---

## Standing rules for every work item

From `CLAUDE_CODE_HANDOFF.md`, unchanged:

1. Never trust client-supplied money math. Server-side, always.
2. Zod at every boundary. No `any`.
3. `npm run type-check` passes with zero errors before commit.
4. Conservative buy-side bias — a change may never raise an offer above photo-graded FMV.
5. No Corner Box references in code, copy, comments, or commit messages.
6. Preserve the existing `ClaudeApiError` / `ClaudeValidationError` pattern and the retry/backoff
   conventions when touching services.
7. One Work Order per branch, one PR each: `fix/wo-01-summary-math`, `feat/wo-04-persistence`.
8. Every Work Order ends with a type-check pass, a build pass, and a short summary of files
   changed plus anything deferred.

Plus: after any change touching the pipeline or offer math, re-run the five-book regression
submission and verify reconciliation across the screen, the PDF, the CSV, and both emails.
