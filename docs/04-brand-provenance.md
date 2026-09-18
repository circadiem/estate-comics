---
doc: Provenance — Estate Comics Brand & Design System
status: ACTIVE — source of truth for every visual decision
approved: Max, March 2026 (direction) · June 2026 (applied as Task 17)
---

# Provenance

The brand direction for Estate Comics. Approved March 2026 from three candidate directions.

**Concept:** archival design, museum catalogues, and the quiet confidence of institutions that
have done one thing well for a very long time. A high-contrast display serif against a warm,
rounded sans. Warm, but with gravitas.

**Mood:** The title page of a rare first edition. An archivist's white gloves. The satisfying
weight of a well-made business card.

**Tagline:** *Every collection has a story. We honor it.*

**What it is not:** it is not comic-book-y. No primary colors, no halftone dots, no Ben-Day
pattern, no speech balloons, no bold slab display. The audience is an executor, an attorney, or
a grieving adult child holding a longbox they did not ask for. Nothing on the page should
suggest a hobby shop.

**Zero shared DNA with The Corner Box.** The two brands must not look related.

> **A note on the palette for whoever builds this.** A warm cream background with a
> high-contrast serif is a common default. Here it is a deliberate, approved decision made
> against two alternatives — it is the vellum of an archival document, and it is the right call
> for this audience. Follow it exactly. Spend the distinctiveness elsewhere: in the antique-gold
> hairline as a structural device, in the appraisal report treated as the primary surface, and
> in the restraint. Do not add a second accent, a gradient, or a card shadow to "modernize" it.

---

## 1. Palette

### Core

| Token | Hex | Name | Role |
|---|---|---|---|
| `charcoalBrown` | `#2E2620` | Charcoal Brown | Primary body text |
| `darkUmber` | `#4A3F35` | Dark Umber | Headings, nav, footer ground, PDF header rule |
| `umber` | `#6F6358` | Umber | Secondary text, captions, table meta |
| `patina` | `#7D6E5C` | Patina | Tertiary text, large labels, muted UI |
| `antiqueGold` | `#A67C52` | Antique Gold | Rules, dividers, the wordmark hairline, focus rings |
| `vellum` | `#F3EDE4` | Vellum | Page background |
| `bisque` | `#E8DFD2` | Bisque | Alternating rows, inset panels, table zebra |
| `ivory` | `#FAF6F0` | Ivory | Cards and raised surfaces on vellum |
| `warmBlack` | `#1E1A16` | Warm Black | Deepest ground; PDF rules, high-emphasis surfaces |

### Status

| Token | Hex | Role |
|---|---|---|
| `accentSage` | `#8A9A7E` | Confirmed, verified, high-confidence. Fill only — never text. |
| `mutedRed` | `#A65252` | Restoration suspected, error, excluded from offer. |

Confidence indicators in the results feed: **sage** high, **antique gold** medium,
**muted red** low. There is no fourth color; do not introduce one.

### Contrast — read this before assigning any text color

Measured against `vellum #F3EDE4`. The audience skews 50+ and will read this on a phone in a
storage unit. WCAG AA requires 4.5:1 for body text and 3:1 for large text (18pt+, or 14pt bold).

| Token | Ratio on vellum | Verdict |
|---|---|---|
| `charcoalBrown` | 12.7 : 1 | Body text. Default. |
| `darkUmber` | 8.8 : 1 | Body and headings. Safe anywhere. |
| `umber` | 5.0 : 1 | Body text — the secondary text color. |
| `mutedRed` | 4.6 : 1 | Passes body, narrowly. Fine for error text. |
| `patina` | 4.2 : 1 | **Large text only** (18pt+). Not for body copy or small labels. |
| `antiqueGold` | 3.2 : 1 | **Not a text color.** Rules, borders, icon strokes, large display only. |
| `accentSage` | 2.6 : 1 | **Fill only.** Requires `charcoalBrown` text on top. |

The commonest failure mode here is antique gold used for small labels or link text because it
looks handsome. It is unreadable at 14px for the person this product is for. Use `umber`.

---

## 2. Typography

**Display — Cormorant Garamond.** High-contrast old-style serif. Weights 400, 500, 600, 700.
Headings, the wordmark, pull quotes, and large figures. Its personality lives at large sizes; it
gets thin and fragile below ~20px. Never use it under 18px except in the wordmark.

**Body — Nunito Sans.** Rounded humanist sans. Weights 300, 400, 600, 700. All body copy, UI,
forms, tables, buttons, and anything under 20px. The warmth in it is what keeps the serif from
reading cold.

Load both via `next/font/google` (see `design/fonts.ts`). Do not add a third family. Do not add
a monospace face for data labels — reference numbers set in Nunito Sans 600 with `+0.04em`
letter-spacing read as deliberate; a mono face reads as a dashboard.

### Scale

| Role | Family | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| Display | Cormorant | 56 / 1.1 | 600 | Homepage hero only |
| H1 | Cormorant | 40 / 1.15 | 600 | One per page |
| H2 | Cormorant | 30 / 1.2 | 600 | |
| H3 | Cormorant | 23 / 1.3 | 500 | |
| Subhead | Cormorant italic | 19 / 1.5 | 400 | Patina. The register-setter — use it. |
| Body large | Nunito | 18 / 1.65 | 400 | Intro paragraphs |
| Body | Nunito | 16 / 1.65 | 400 | Default |
| Small | Nunito | 14 / 1.55 | 400 | Captions, table cells, help text |
| Label | Nunito | 13 / 1.4 | 600 | Form labels, sentence case |
| Reference no. | Nunito | 14 / 1.4 | 600 | `+0.04em` tracking |

Mobile: scale display to 38, H1 to 30, H2 to 24. Body stays 16 — do not shrink it.

Measure: **62–72 characters** for Nunito body. Cormorant tolerates longer; cap at 78.

**Avoid:** tracked-out all-caps eyebrow labels above headings, accenting a single word of a
headline in a different color, and `→` appended to link text. The italic Cormorant subhead does
the job an eyebrow would, with more grace.

---

## 3. The wordmark

Typographic. There is no icon and none should be designed.

```
        E s t a t e C o m i c s          ← Cormorant Garamond 700, charcoalBrown
        ───────────────────────          ← 1px antiqueGold rule, full wordmark width
      Professional Comic Book             ← Cormorant italic 400, patina,
           Estate Services                   centered, ~34% of wordmark size
```

The antique-gold hairline is **part of the logo**, not decoration around it. It is the single
recurring structural device of the whole system — it reappears as the section rule, the table
header rule, the PDF header rule, and the email divider. That repetition is what makes the
brand feel like one thing.

- Minimum clear space on all sides: the cap-height of the wordmark.
- Minimum width: 140px. Below that, drop the descriptor and keep wordmark + rule.
- On dark umber or warm black grounds, the wordmark goes `vellum`, the rule stays `antiqueGold`.
- Never stretch, never add a shadow, never place on a photograph without a solid underlay.

---

## 4. Layout

Left-aligned throughout. No centered body copy; centering reads as a landing-page template and
undercuts the documentary register. The only centered elements are the wordmark lockup and the
PDF report header.

- Content column: max 720px for prose, 1140px for the appraisal table and results feed.
- Vertical rhythm on an 8px base. Section spacing 72px desktop / 48px mobile.
- Border radius: **2px**. Effectively square. Not zero — zero reads as brutalist broadsheet,
  which is a different brand. One radius value across the whole system.
- **No drop shadows.** Elevation is expressed with a 1px `bisque` border and an `ivory` fill on
  the `vellum` ground. This is the rule that most distinguishes the system from a generic SaaS
  card kit; do not break it.
- Section rules: 1px `antiqueGold`, not full-bleed — inset to the content column.

### Motion

One orchestrated moment: the results feed, where identified books resolve into place as each
photo processes. That is the product's proof and it earns animation. Everything else is static.
No fade-and-slide-up on section entry, no hover lift on cards. Respect
`prefers-reduced-motion` — replace the resolve with an immediate state change.

---

## 5. Components

**Buttons.** Primary: `darkUmber` fill, `vellum` text, 2px radius, 14px/28px padding, Nunito
600, sentence case. Hover darkens to `warmBlack`. Secondary: transparent, 1px `patina` border,
`darkUmber` text. Text link: `darkUmber`, 1px underline at 2px offset, underline goes
`antiqueGold` on hover. No arrow glyphs in button labels.

**Focus.** 2px `antiqueGold` outline at 2px offset, on every interactive element. Visible,
always, including for mouse users. Keyboard access is not optional in a product being shown to
attorneys.

**Forms.** `ivory` fill, 1px `bisque` border, `antiqueGold` border on focus. Labels above the
field in Nunito 600 / 13px, sentence case. Help text `umber` 14px directly under the label, not
under the field. Errors in `mutedRed` with a plain statement of what to fix — never an apology,
never vague.

**Tables (results feed and appraisal inventory).** Header row: `darkUmber` text, Nunito 600
14px, 1px `antiqueGold` bottom rule. Body rows alternate `vellum` / `bisque`. Money right-aligned
and tabular. Row height 52px — the audience is not scanning dense data, they are reading.

**Cards.** `ivory` fill, 1px `bisque` border, 2px radius, 24px padding. No shadow.

**Confidence chips.** 2px radius, Nunito 600 12px, dark text on a 20%-opacity status fill.
Never a bare colored dot — the meaning has to be readable, not decoded.

**Empty and failure states.** An empty upload area is an invitation: *"Add photos of your
covers to begin."* A failure says what happened and what to do: *"That photo was too dark to
read. Try again with the cover flat under even light."* Never a console error, never a shrug.

---

## 6. The appraisal PDF

**The single most important surface in the product.** It is the artifact a seller forwards to
their attorney, their sibling, and their accountant. It is doing the job a business card and a
storefront would do for a traditional dealer. Style it first, not last.

Structure per `docs/02-implementation-spec-v1.md` §VIII. The Provenance treatment:

- **Header:** `darkUmber` rule across the full width. Wordmark centered beneath it in
  Cormorant 700. Reference number `EC-YYYYMMDD-XXXX` right-aligned, Nunito 600, tracked.
- **Meta band:** `vellum` fill, full width, holding date of appraisal, seller name, and book
  count. Nunito 14px.
- **Summary cards:** total books, FMV range, offer range, key issues. `ivory` fill, 1px
  `antiqueGold` top rule on each. The figures in Cormorant 600 at 30px — this is where the
  serif earns its place.
- **Key Issues section:** the seller's most valuable books, up front, before the full inventory.
  Cover thumbnail, significance in one plain sentence, grade range, FMV range.
- **Hidden Gems:** headed *"Books you might not know are valuable."* Set apart with a `bisque`
  panel. This section builds more trust than anything else in the document.
- **Complete inventory:** alternating `vellum`/`bisque` rows, sorted FMV descending.
- **Bulk lot:** aggregate only. Count, total FMV, total offer. No line items.
- **Methodology note:** plain language. Where values came from, that `fmv_source` may be
  fallback data, that offers are contingent on physical inspection, 14-day validity.
- **Footer, every page:** *Estate Comics · Powered by Legends of Superheros · Est. 1993* and the
  page number.

Print-safe: the palette is warm and low-contrast by design, so verify a grayscale print still
separates rows and reads at 100%. If it does not, deepen the `bisque` rows for print media only.

---

## 7. Voice

| Not this | This |
|---|---|
| Exclusive, archival, withholding | Accessible, professional, clear |
| Hobby vocabulary (grail, slab, spec) | Plain English, defined on first use |
| "Submit" | "Get your appraisal" |
| Hype, exclamation points, emoji | Level, declarative, unhurried |
| Apologetic error copy | What happened, and what to do next |

Clarity is the trust signal. Transparency is the sales argument — show the work, and the number
is believed. Never rush grief-adjacent correspondence. Never negotiate against yourself: *"Our
offer reflects current fair market value at the condition we assessed. We're glad to walk you
through the data."*

---

## 8. Where this gets applied

Task 17 surfaces, in order of importance:

1. The PDF appraisal report
2. The two transactional emails (seller confirmation, internal notification)
3. Homepage hero and trust bar
4. The appraise flow — upload, results feed, questionnaire, summary
5. Nav and footer
6. **For Attorneys** page — this page does not exist yet and must be built in this pass
7. About, How It Works, geographic service pages, blog

Implementation tokens: `design/tokens.css`, `design/tailwind.tokens.ts`, `design/fonts.ts`.
Visual reference: `design/brand-reference.html`.
