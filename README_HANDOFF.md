# Estate Comics — Claude Code handoff package

Everything needed to hand the build to Claude Code. Drop the whole folder into the repo:
`CLAUDE.md` and `MAX_TODO.md` at root, `docs/` and `design/` as-is.

**Repo:** `github.com/circadiem/thecomicbuyers` (rename to `estatecomics` pending)
**Domain:** `estatecomics.com`
**Posture:** quiet-live. Deployed, presentable, not accepting real submissions.

---

## Contents

| File | What it is |
|---|---|
| `CLAUDE.md` | **Repo-root context.** Hard rules, stack, offer tiers, brand summary, session protocol. Claude Code reads this first, every session. |
| `CLAUDE_CODE_HANDOFF.md` | **The work orders.** Thirteen sessions, each with exact file targets, task lists and acceptance criteria. From the July 2026 audit. |
| `MAX_TODO.md` | Accounts, keys, DNS, and the open decisions. Your side of the ledger. |
| `docs/01-pdr.md` | Product Design & Requirements. Market, seller profiles, user flow, AI approach, output specs, SEO and referral strategy, risk register. |
| `docs/02-implementation-spec-v1.md` | The engineering blueprint. Production system prompts, JSON schemas, valuation and offer engines, PDF spec, image validation, questionnaire, email templates. |
| `docs/03-implementation-addendum-phase2.md` | Tasks 11–17. Rename, Supabase and R2 schema, grid capture, tiered grading, sampled appraisal, demo mode, brand pass. |
| `docs/04-brand-provenance.md` | **The design system.** Palette with contrast ratios, type scale, wordmark, layout rules, components, PDF report treatment, voice. |
| `docs/05-build-sequence.md` | **The order of work.** Reconciles the July audit's work orders with the June task list into one sequence, with launch gates. |
| `design/tokens.css` | CSS custom properties. Import in `app/globals.css`. |
| `design/tailwind.tokens.ts` | Tailwind theme extension. Import in `tailwind.config.ts`. |
| `design/fonts.ts` | `next/font/google` setup for Cormorant Garamond and Nunito Sans. |
| `design/brand-reference.html` | Rendered specimen of the whole system. Open it before writing any UI. |

---

## Read order

**Claude Code:** `CLAUDE.md` → `docs/05-build-sequence.md` → the doc for the stage it is on.

**You:** `docs/05-build-sequence.md` for where things stand, then `MAX_TODO.md` for the five
decisions. Open `design/brand-reference.html` on a phone to see the brand rendered.

---

## What this package resolved

**Two competing plans.** The June 2026 Phase 2 addendum (Tasks 11–17, feature-forward) and the
July 2026 audit handoff (Work Orders 01–13, fix-forward) overlap and disagree on sequencing.
Handing both to Claude Code stalls it at the first conflict. `docs/05-build-sequence.md` is now
the single order; where they disagree, the audit wins, because it is based on what the code
actually does.

**The brand pass moved.** The July audit left it in the backlog. Your standing instruction is
that no investor or advisor sees the product before the brand pass is complete. It now sits at
Stage 3, ahead of public readiness.

**R2 moved up.** No photo is stored anywhere today. The admin review queue would show you AI
identifications with no covers to check them against.

**The design materials existed only as a conversation.** The Provenance system — palette, type,
wordmark, taglines — was approved in March 2026 but had never been written down as a spec or
committed as code. That was the actual blocker on Task 17. It is now `docs/04-brand-provenance.md`
plus three token files plus a rendered reference page.

---

## What this package resolved, part two

With `CLAUDE_CODE_HANDOFF.md` now in hand, three conflicts between the two plans are resolved in
`docs/05-build-sequence.md` rather than left for Claude Code to hit mid-session:

- **Two different database schemas.** WO-04 and Phase 2 Task 12 specify different tables, status
  values, and columns. WO-04 wins; the Phase 2 columns arrive in a second migration when their
  features do.
- **Two rename plans.** WO-11 wins — real occurrence count, correct constraint on the infra rename.
- **A `claude.md` already in the repo.** The `CLAUDE.md` here replaces it. Do not keep both.

Three of the five open decisions also turned out to be already answered inside the work order
text. See `MAX_TODO.md` — two remain, and one of the settled three is worth reversing.

---

## First session

> Read `CLAUDE.md`, `docs/05-build-sequence.md`, and `CLAUDE_CODE_HANDOFF.md`. Execute Work Order
> 01. Do not start the next Work Order without confirmation. Run `npm run type-check` and
> `npm run build` before declaring it complete.

Work Orders 01, 02 and 03 need no accounts and no keys. They can start before you do anything.
