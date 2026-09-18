# MAX TO-DO — things only you can do

Companion to `docs/05-build-sequence.md`. Claude Code cannot create accounts, hold keys, or make
brand decisions. Everything below is yours, ordered to unblock the stages in sequence.

---

## Start these now — long lead times

**GoCollect API access.** The subscription needs to be live before valuations mean anything, and
access is an approval queue rather than an instant key. Start it today regardless of where the
build is. Until it lands, every valuation falls to the fallback table — which is acceptable for
the investor demo as long as `fmv_source` labeling is in place.

**Domain and email.** Point `estatecomics.com` at Vercel. Verify the domain in Resend so
`noreply@estatecomics.com` and `intake@estatecomics.com` can send. DNS propagation and domain
verification both take longer than you expect.

---

## Before Stage 2 (persistence)

**Supabase project.** New project named `estatecomics`, region US East to match the Vercel
default. From Project Settings → API, collect:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** key, not anon. It is server-only and
  bypasses row-level security. It never goes into client code or git.

Claude Code produces `supabase/migrations/0001_init.sql`. Run it from the dashboard SQL editor
or `supabase db push`. Confirm the `submissions` and `submission_books` tables and the
`create_submission` function exist afterward. (The `images` table arrives with R2 in a second
migration — see the schema resolution in `docs/05-build-sequence.md`.)

**Cloudflare R2.** Bucket `estatecomics-uploads`. Collect the account ID, access key ID, and
secret. No photo is stored anywhere today — this is the fix.

---

## Before Stage 4 (public readiness)

**Cloudflare Turnstile.** Site key and secret for bot protection on the submission form.

**Upstash Redis.** For rate limiting. Collect the REST URL and token. The rate-limit constants
already exist in the codebase; nothing consumes them.

**Repo and project rename.** GitHub `thecomicbuyers` → `estatecomics`, then update the Vercel
project to match. Do this when you have twenty quiet minutes, not mid-build — the rename breaks
the local remote and any in-flight branches.

---

## Decisions — two open, three already settled in the work orders

Reading the Work Order text back, three of the five queued decisions were answered inside the
orders themselves. Only two still need you.

### Still open

**D1 — Storage multiplier cap.** How far the storage-conditions questionnaire answer may move a
grade estimate. WO-01 fixes the summary math around the multiplier but sets no policy on its
range. *Recommendation: cap the upward adjustment tighter than the downward one. Climate-
controlled storage should never lift an estimate more than half a grade; loose in a damp basement
should be free to drop it further. Conservative bias means the multiplier has more room below 1.0
than above it.*

**D4 — R2 image storage timing.** *Recommendation, and I've written it into the sequence: Stage 2,
not backlog.* When the admin queue lands you would be reviewing AI identifications with no covers
to check them against. The audit flagged this itself in its backlog note. Say the word if you
disagree and I'll move it back.

### Settled in the work order text — confirm, don't re-decide

**D2 — Submit before report, or report before submit.** WO-02 offers both paths and tells Claude
Code to pick whichever produces the cleaner flow, with the hard constraint that one session
never produces two reference numbers. *Recommendation: take WO-02's simpler alternative — submit
first, `/api/submit` returns the PDF and CSV in its response. It removes the state-passing
entirely and makes the submission the canonical event. The counter-argument — that withholding
the appraisal behind a form costs leads — is real, but the invitation-capture gate in Task 16
means nobody is being asked for anything they weren't going to give anyway.*

**D3 — Sub-100-book gate hardness.** WO-03 task 3 already specs it as a **soft** gate: an inline
notice, submission still allowed, `below_minimum: true` on the internal email so you decide.
That is the right call and it is already written.

**D5 — Naming crypto rails before they exist.** WO-03 task 1 names them — *"bank transfer, USDC,
or BTC."* **This is the one I'd push back on.** The rails are not wired; Circle and Strike are
Stage 5 at the earliest. Naming a payment method you cannot currently execute is the only claim
on the site that could be called false, and the audience is lawyers. *Recommendation: amend
WO-03 to "payment within 48 hours of verification, by your preferred method," and add the rails
back when they exist.* Your call — but decide it before WO-03 runs, because it is one line of
copy now and a correction to a sent email later.

---

## Launch gates

**Quiet-live** — share the URL with Marcus and advisors:
Stage 1 and Stage 2 merged, R2 wired, plus one real five-book submission pulled off the Legends
shelf and verified by hand end to end. That submission becomes the regression baseline for every
merge that follows.

**Investor demo** — Stage 3 complete. The Provenance brand pass and demo mode. Nothing an
investor sees should depend on a live API call.

**Public** — Stage 4 complete. Geo pages indexed. Only then does attorney outreach or paid
traffic begin.

---

## Still undocumented

Flagging these because they are the gaps in the handoff, not the build:

- **The Legends of Superheros arrangement.** The most serious undocumented item across the whole
  operation. Nothing downstream can be structured properly until it is written down.
- Structural risk register and legal/entity basics.
- Whether estatecomics.com terms of service, privacy policy, and the seller attestation clause
  have been drafted. The site cannot accept real submissions without them, and the audience is
  literally lawyers.
