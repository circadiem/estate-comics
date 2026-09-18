---
doc: Implementation Spec v1 — prompt suite, schemas, pipeline
status: ACTIVE — prompts and schemas are the build reference
superseded_in_part_by: docs/03-implementation-addendum-phase2.md
---

> **READ THIS BANNER FIRST.**
>
> This is the engineering blueprint: the production system prompts, JSON schemas,
> valuation/offer engines, PDF spec, image validation, questionnaire, and email templates.
> **These are still the source of truth for all of the above.**
>
> Superseded items only:
>
> | v1 says | Current truth |
> |---|---|
> | `TCB-YYYYMMDD-XXXX` reference numbers | **`EC-YYYYMMDD-XXXX`** |
> | Brand strings "TheComicBuyers" | **Estate Comics** everywhere |
> | Task sequence §XIII (Tasks 1–10) | **Complete.** Continue at `docs/03-implementation-addendum-phase2.md` (Tasks 11–17) and `docs/05-build-sequence.md` |
> | GoCollect endpoint `/v1/books/fmv` | **Does not exist.** Correct flow is two-step: `/v1/collectibles` search → `/v1/insights/item/{item_id}?grade=`. See CLAUDE.md. |
> | Unspecified model | Pin `claude-sonnet-4-5-20250929`, temperature 0 |
>
> The prompt text in §III, §IV and §V is production copy. Do not paraphrase it when
> porting into `lib/prompts/`.

**IMPLEMENTATION SPECIFICATION**

**& AI PROMPT SUITE**

TheComicBuyers.com \| EstateComics.com

*Claude Code Build Reference • Prompt Engineering • API Contracts*

**CONFIDENTIAL**

Powered by Legends of Superheros • Est. 1993

Version 1.0 \| February 2026

## I. DOCUMENT PURPOSE

This document is the build reference for implementing the AI-powered
comic book identification and appraisal engine described in the Product
Design & Requirements document. It contains three categories of
deliverables:

-   **Prompt Suite:** The complete, production-ready system prompts and
    user prompt templates for every AI interaction in the application.
    These are the exact prompts to be used in Claude API calls.

-   **API Contracts:** The expected input and output schemas for each AI
    function, including the JSON structures the prompts instruct the
    model to return.

-   **Implementation Spec:** Technical guidance for Claude Code on file
    structure, processing pipeline, error handling, and integration
    points with external services (GoCollect, payment providers, email).

This document assumes the developer (or Claude Code) has read the PDR
and understands the product context, user flow, and business logic. It
does not repeat strategic rationale. It provides the engineering
blueprint.

## II. SYSTEM ARCHITECTURE OVERVIEW

### A. Processing Pipeline

Every photo uploaded by a user passes through a sequential pipeline.
Each stage has a defined input, a processing step, and a structured
output. The stages are:

  -------- ---------------- ------------------- ------------------------ ----------------------
  **\#**   **STAGE**        **PROCESS**         **INPUT**                **OUTPUT**

  1        Image Validation Check photo         Raw image file           Pass/fail with
                            quality,            (JPEG/PNG/HEIC)          rejection reason
                            dimensions, and                              
                            content type                                 

  2        Identification   Claude Vision API   Validated image (base64) IdentificationResult
                            call with                                    JSON
                            identification                               
                            prompt                                       

  3        Condition        Claude Vision API   Validated image +        ConditionResult JSON
           Assessment       call with grading   IdentificationResult     
                            prompt                                       

  4        Valuation        GoCollect API       IdentificationResult +   ValuationResult JSON
                            lookup by title,    ConditionResult          
                            issue, grade                                 

  5        Offer            Apply offer % tiers ValuationResult          OfferResult JSON
           Calculation      to FMV data                                  

  6        Report Assembly  Aggregate all       All result objects for   AppraisalReport (PDF +
                            results into        collection               CSV)
                            PDF/CSV/on-screen                            
  -------- ---------------- ------------------- ------------------------ ----------------------

Stages 2 and 3 can be combined into a single API call if latency is a
concern. However, separating them allows independent tuning of the
identification and grading prompts without cross-contamination. The
recommended approach for MVP is two separate calls; optimization can
merge them in Phase 2 if the combined prompt maintains accuracy.

### B. File Structure (Next.js)

The recommended project structure for a Next.js application. Claude Code
should scaffold this structure at project initialization.

+-----------------------------------------------------------------------+
| > thecomicbuyers/                                                     |
| >                                                                     |
| > ├── app/                                                            |
| >                                                                     |
| > │ ├── page.tsx \# Landing page                                      |
| >                                                                     |
| > │ ├── appraise/                                                     |
| >                                                                     |
| > │ │ └── page.tsx \# Appraisal tool (main app)                       |
| >                                                                     |
| > │ ├── how-it-works/                                                 |
| >                                                                     |
| > │ │ └── page.tsx \# Process explainer                               |
| >                                                                     |
| > │ ├── about/                                                        |
| >                                                                     |
| > │ │ └── page.tsx \# About / origin story                            |
| >                                                                     |
| > │ ├── areas/                                                        |
| >                                                                     |
| > │ │ └── \[state\]/page.tsx \# Dynamic geo pages                     |
| >                                                                     |
| > │ ├── blog/                                                         |
| >                                                                     |
| > │ │ ├── page.tsx \# Blog index                                      |
| >                                                                     |
| > │ │ └── \[slug\]/page.tsx \# Individual articles                    |
| >                                                                     |
| > │ └── api/                                                          |
| >                                                                     |
| > │ ├── identify/route.ts \# Identification endpoint                  |
| >                                                                     |
| > │ ├── grade/route.ts \# Condition assessment endpoint               |
| >                                                                     |
| > │ ├── valuate/route.ts \# GoCollect lookup endpoint                 |
| >                                                                     |
| > │ ├── calculate-offer/route.ts \# Offer calculation                 |
| >                                                                     |
| > │ ├── generate-report/route.ts \# PDF/CSV generation                |
| >                                                                     |
| > │ └── submit/route.ts \# Final submission + email                   |
| >                                                                     |
| > ├── lib/                                                            |
| >                                                                     |
| > │ ├── prompts/                                                      |
| >                                                                     |
| > │ │ ├── identification.ts \# Identification system prompt           |
| >                                                                     |
| > │ │ ├── condition.ts \# Condition assessment prompt                 |
| >                                                                     |
| > │ │ └── hidden-gems.ts \# Hidden gems detection logic               |
| >                                                                     |
| > │ ├── schemas/                                                      |
| >                                                                     |
| > │ │ ├── identification.ts \# Zod schemas for ID results             |
| >                                                                     |
| > │ │ ├── condition.ts \# Zod schemas for condition                   |
| >                                                                     |
| > │ │ ├── valuation.ts \# Zod schemas for valuation                   |
| >                                                                     |
| > │ │ └── offer.ts \# Zod schemas for offers                          |
| >                                                                     |
| > │ ├── services/                                                     |
| >                                                                     |
| > │ │ ├── claude.ts \# Claude API client wrapper                      |
| >                                                                     |
| > │ │ ├── gocollect.ts \# GoCollect API client                        |
| >                                                                     |
| > │ │ ├── pdf-generator.ts \# PDF report builder                      |
| >                                                                     |
| > │ │ ├── csv-generator.ts \# CSV export builder                      |
| >                                                                     |
| > │ │ └── email.ts \# Transactional email (Resend)                    |
| >                                                                     |
| > │ ├── config/                                                       |
| >                                                                     |
| > │ │ ├── offer-tiers.ts \# Offer % configuration                     |
| >                                                                     |
| > │ │ └── constants.ts \# App-wide constants                          |
| >                                                                     |
| > │ └── utils/                                                        |
| >                                                                     |
| > │ ├── image-validation.ts \# Photo quality checks                   |
| >                                                                     |
| > │ └── reference-number.ts \# TCB-YYYYMMDD-XXXX generator            |
| >                                                                     |
| > ├── components/                                                     |
| >                                                                     |
| > │ ├── upload/ \# Photo upload + rapid scan                          |
| >                                                                     |
| > │ ├── results/ \# Identification results feed                       |
| >                                                                     |
| > │ ├── report/ \# On-screen appraisal view                           |
| >                                                                     |
| > │ └── ui/ \# Shared UI components                                   |
| >                                                                     |
| > ├── public/                                                         |
| >                                                                     |
| > └── .env.local \# API keys (never committed)                        |
+-----------------------------------------------------------------------+

**III. PROMPT 1: COMIC BOOK IDENTIFICATION**

This is the primary identification prompt. It is sent as the system
message in a Claude API call with the user\'s cover photograph attached
as an image. This prompt must be stored in lib/prompts/identification.ts
and versioned.

### A. System Prompt

+-----------------------------------------------------------------------+
| > SYSTEM PROMPT: COMIC BOOK COVER IDENTIFICATION ENGINE               |
| >                                                                     |
| > You are a specialist comic book identification system with          |
| >                                                                     |
| > expert-level knowledge of American comic book publishing            |
| >                                                                     |
| > from 1938 to present. Your task is to identify a comic book         |
| >                                                                     |
| > from a photograph of its cover and return structured data.          |
| >                                                                     |
| > IDENTIFICATION PRIORITIES (in order):                               |
| >                                                                     |
| > 1\. TITLE: Read the series title from the cover masthead/logo.      |
| >                                                                     |
| > Account for logo redesigns across eras (e.g., Amazing               |
| >                                                                     |
| > Spider-Man has had 12+ distinct masthead designs). If the           |
| >                                                                     |
| > title is partially obscured, infer from visual context,             |
| >                                                                     |
| > character depiction, publisher trade dress, and cover               |
| >                                                                     |
| > layout conventions of the era.                                      |
| >                                                                     |
| > 2\. ISSUE NUMBER: Locate the issue number. Common locations:        |
| >                                                                     |
| > corner box (pre-1980s), near masthead, UPC area, or                 |
| >                                                                     |
| > integrated into cover design. For books with no visible             |
| >                                                                     |
| > issue number (some variants, ashcans), note this and                |
| >                                                                     |
| > attempt identification from cover art recognition.                  |
| >                                                                     |
| > 3\. VOLUME: Determine the volume/series number. Many titles         |
| >                                                                     |
| > have been relaunched (e.g., Amazing Spider-Man Vol. 1               |
| >                                                                     |
| > #1-441, Vol. 2 #1-58, Vol. 3 #1-20.1, etc.). Use cover              |
| >                                                                     |
| > date, price, trade dress, and publisher logo era to                 |
| >                                                                     |
| > distinguish volumes.                                                |
| >                                                                     |
| > 4\. PUBLISHER: Identify from logo, trade dress, corner box          |
| >                                                                     |
| > design, and cover conventions. Key publishers: Marvel               |
| >                                                                     |
| > Comics (and predecessors: Timely, Atlas), DC Comics                 |
| >                                                                     |
| > (and predecessors: National, Detective Comics Inc.),                |
| >                                                                     |
| > Image, Dark Horse, Valiant, Eclipse, First, Comico,                 |
| >                                                                     |
| > Archie, Harvey, Dell, Gold Key, Charlton, Fawcett,                  |
| >                                                                     |
| > EC Comics, and independents.                                        |
| >                                                                     |
| > 5\. COVER DATE: Read from cover if visible. If not visible,         |
| >                                                                     |
| > estimate from trade dress era, price point, logo design,            |
| >                                                                     |
| > and publishing conventions. Note: cover dates typically             |
| >                                                                     |
| > run 2-3 months ahead of actual sale date.                           |
| >                                                                     |
| > 6\. ERA DESIGNATION: Assign based on cover date:                    |
| >                                                                     |
| > \- Golden Age: 1938-1956                                            |
| >                                                                     |
| > \- Silver Age: 1956-1970                                            |
| >                                                                     |
| > \- Bronze Age: 1970-1985                                            |
| >                                                                     |
| > \- Copper Age: 1985-1992                                            |
| >                                                                     |
| > \- Modern Age: 1992-present                                         |
| >                                                                     |
| > 7\. VARIANT DETECTION: Examine the corner box / UPC area:           |
| >                                                                     |
| > \- NEWSSTAND: UPC barcode visible in corner box area.               |
| >                                                                     |
| > These are rarer in high grade for post-1979 issues.                 |
| >                                                                     |
| > \- DIRECT EDITION: Publisher logo or character portrait             |
| >                                                                     |
| > in corner box area instead of UPC barcode.                          |
| >                                                                     |
| > \- PRICE VARIANT: Non-standard cover price for the era              |
| >                                                                     |
| > (e.g., 30-cent vs 25-cent, 35-cent variant, UK price                |
| >                                                                     |
| > variant). Note the specific price if visible.                       |
| >                                                                     |
| > \- If a Mark Jewelers insert is visible (rare), note it.            |
| >                                                                     |
| > \- Other variants: Canadian price variant, whitman,                 |
| >                                                                     |
| > second printing, newsstand reprint, etc.                            |
| >                                                                     |
| > 8\. KEY SIGNIFICANCE: Based on the identified title and             |
| >                                                                     |
| > issue, note any known significance:                                 |
| >                                                                     |
| > \- First appearance (full or cameo)                                 |
| >                                                                     |
| > \- First cover appearance                                           |
| >                                                                     |
| > \- Origin story                                                     |
| >                                                                     |
| > \- Death of major character                                         |
| >                                                                     |
| > \- First issue of series                                            |
| >                                                                     |
| > \- Key storyline (e.g., Dark Phoenix Saga)                          |
| >                                                                     |
| > \- Notable creator run debut                                        |
| >                                                                     |
| > \- Cross-title significance                                         |
| >                                                                     |
| > If no known significance, return null.                              |
| >                                                                     |
| > 9\. CREATORS: If identifiable from cover credits, signatures,       |
| >                                                                     |
| > or art style recognition, note cover artist and writer.             |
| >                                                                     |
| > If not identifiable from the photo, return null.                    |
| >                                                                     |
| > CONFIDENCE SCORING:                                                 |
| >                                                                     |
| > Return a confidence_score from 0-100 based on:                      |
| >                                                                     |
| > \- 90-100: Title, issue, publisher clearly legible. No              |
| >                                                                     |
| > ambiguity. High certainty on all fields.                            |
| >                                                                     |
| > \- 80-89: Most fields clear. Minor ambiguity on one field           |
| >                                                                     |
| > (e.g., volume number uncertain but title and issue clear).          |
| >                                                                     |
| > \- 60-79: Identification probable but not certain. One or           |
| >                                                                     |
| > more key fields inferred rather than read directly.                 |
| >                                                                     |
| > ALWAYS flag for human review.                                       |
| >                                                                     |
| > \- Below 60: Low confidence. Significant uncertainty.               |
| >                                                                     |
| > Return best guess but flag prominently for review.                  |
| >                                                                     |
| > CONSERVATIVE BIAS: When uncertain between two possible              |
| >                                                                     |
| > identifications, choose the more common/likely option and           |
| >                                                                     |
| > reduce the confidence score rather than guessing at the             |
| >                                                                     |
| > rarer identification. It is better to be right about a              |
| >                                                                     |
| > common book than wrong about a rare one.                            |
| >                                                                     |
| > RESPONSE FORMAT: Return ONLY valid JSON matching the schema         |
| >                                                                     |
| > below. No preamble, no markdown, no explanation outside the         |
| >                                                                     |
| > JSON structure.                                                     |
+-----------------------------------------------------------------------+

### B. Output Schema: IdentificationResult

+-----------------------------------------------------------------------+
| > {                                                                   |
| >                                                                     |
| > \"title\": string, // Series title                                  |
| >                                                                     |
| > \"issue_number\": string, // Issue \# (string for decimals,         |
| > annuals)                                                            |
| >                                                                     |
| > \"volume\": number \| null, // Volume/series number if determinable |
| >                                                                     |
| > \"publisher\": string, // Publisher name                            |
| >                                                                     |
| > \"cover_date\": string, // Month Year format: \"July 1963\"         |
| >                                                                     |
| > \"cover_date_year\": number, // Numeric year for sorting: 1963      |
| >                                                                     |
| > \"era\": string, // Golden\|Silver\|Bronze\|Copper\|Modern          |
| >                                                                     |
| > \"variant_type\": string, // direct\|newsstand\|price_variant\|     |
| >                                                                     |
| > // mark_jewelers\|unknown                                           |
| >                                                                     |
| > \"variant_detail\": string\|null, // Specific variant info if       |
| > applicable                                                          |
| >                                                                     |
| > \"cover_price\": string \| null, // Cover price if legible:         |
| > \"\$0.12\"                                                          |
| >                                                                     |
| > \"significance\": {                                                 |
| >                                                                     |
| > \"type\": string \| null, //                                        |
| > first_appearance\|first_cameo\|origin\|                             |
| >                                                                     |
| > // death\|first_issue\|key_storyline\|null                          |
| >                                                                     |
| > \"description\": string \| null // e.g., \"First appearance of      |
| > Wolverine\"                                                         |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"creators\": {                                                     |
| >                                                                     |
| > \"cover_artist\": string \| null,                                   |
| >                                                                     |
| > \"writer\": string \| null,                                         |
| >                                                                     |
| > \"interior_artist\": string \| null                                 |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"confidence_score\": number, // 0-100                              |
| >                                                                     |
| > \"confidence_notes\": string, // Explanation of any uncertainty     |
| >                                                                     |
| > \"flagged_for_review\": boolean, // true if confidence \< 80        |
| >                                                                     |
| > \"photo_quality\": string // good\|acceptable\|poor                 |
| >                                                                     |
| > }                                                                   |
+-----------------------------------------------------------------------+

### C. User Message Template

The user message is constructed programmatically for each photo. It
attaches the image and provides minimal context:

+-----------------------------------------------------------------------+
| > Identify this comic book cover. Return only JSON.                   |
| >                                                                     |
| > \[Image attached as base64 content block\]                          |
+-----------------------------------------------------------------------+

*Note: Do not include additional context (like \"this is from a
collection in Connecticut\") in the user message. The identification
should be based purely on the visual evidence to prevent bias.*

### D. API Call Configuration

+-----------------------------------------------------------------------+
| > Model: claude-sonnet-4-5-20250929                                   |
| >                                                                     |
| > Max tokens: 1024                                                    |
| >                                                                     |
| > Temperature: 0 (deterministic identification)                       |
| >                                                                     |
| > System: \[identification system prompt\]                            |
| >                                                                     |
| > Messages: \[                                                        |
| >                                                                     |
| > {                                                                   |
| >                                                                     |
| > role: \"user\",                                                     |
| >                                                                     |
| > content: \[                                                         |
| >                                                                     |
| > {                                                                   |
| >                                                                     |
| > type: \"image\",                                                    |
| >                                                                     |
| > source: {                                                           |
| >                                                                     |
| > type: \"base64\",                                                   |
| >                                                                     |
| > media_type: \"image/jpeg\",                                         |
| >                                                                     |
| > data: \[base64_encoded_image\]                                      |
| >                                                                     |
| > }                                                                   |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > {                                                                   |
| >                                                                     |
| > type: \"text\",                                                     |
| >                                                                     |
| > text: \"Identify this comic book cover. Return only JSON.\"         |
| >                                                                     |
| > }                                                                   |
| >                                                                     |
| > \]                                                                  |
| >                                                                     |
| > }                                                                   |
| >                                                                     |
| > \]                                                                  |
+-----------------------------------------------------------------------+

Use Sonnet for identification. It provides the best balance of accuracy,
speed, and cost for visual recognition tasks at this volume. Opus is
unnecessary for structured identification; reserve it only if accuracy
on edge cases requires escalation in a future phase.

**IV. PROMPT 2: CONDITION ASSESSMENT**

This prompt evaluates the physical condition of the comic from the cover
photograph. It is called after identification so the model has context
about the specific title and era, which informs condition expectations.

### A. System Prompt

+-----------------------------------------------------------------------+
| > SYSTEM PROMPT: COMIC BOOK CONDITION ASSESSMENT ENGINE               |
| >                                                                     |
| > You are a specialist comic book grading system applying the         |
| >                                                                     |
| > Overstreet / CGC grading scale (0.5 to 10.0). Your task is          |
| >                                                                     |
| > to assess the physical condition of a comic book from a             |
| >                                                                     |
| > photograph of its cover and return a conservative grade range.      |
| >                                                                     |
| > GRADING PHILOSOPHY: You grade to buy, not to sell. This means       |
| >                                                                     |
| > you deliberately estimate below the optimistic scenario. Your       |
| >                                                                     |
| > grade range should represent a realistic floor and a probable       |
| >                                                                     |
| > ceiling. The actual grade, determined by physical inspection,       |
| >                                                                     |
| > should ideally fall at or above your midpoint estimate.             |
| >                                                                     |
| > ASSESSMENT CRITERIA (evaluate each):                                |
| >                                                                     |
| > 1\. COVER GLOSS & REFLECTIVITY                                      |
| >                                                                     |
| > \- Assess visible sheen and light reflection                        |
| >                                                                     |
| > \- Note: flash photography can artificially enhance gloss           |
| >                                                                     |
| > \- Compare reflectivity to expected baseline for the era            |
| >                                                                     |
| > (Golden/Silver Age covers had different printing processes          |
| >                                                                     |
| > than Modern covers)                                                 |
| >                                                                     |
| > 2\. SPINE CONDITION                                                 |
| >                                                                     |
| > \- Spine stress lines (count and severity)                          |
| >                                                                     |
| > \- Spine roll (visible lean when viewed from above)                 |
| >                                                                     |
| > \- Color-breaking vs non-color-breaking stress                      |
| >                                                                     |
| > \- Spine splits (length and position)                               |
| >                                                                     |
| > \- Overall spine alignment and tightness                            |
| >                                                                     |
| > 3\. CORNER CONDITION                                                |
| >                                                                     |
| > \- Sharpness vs blunting                                            |
| >                                                                     |
| > \- Corner creases or bends                                          |
| >                                                                     |
| > \- Assess all visible corners (typically 2-3 from a                 |
| >                                                                     |
| > front cover photo)                                                  |
| >                                                                     |
| > \- Note if any corner is notably weaker than others                 |
| >                                                                     |
| > 4\. SURFACE CONDITION                                               |
| >                                                                     |
| > \- Tears, chips, or missing pieces (note size and location)         |
| >                                                                     |
| > \- Foxing or brown spots                                            |
| >                                                                     |
| > \- Staining (water, liquid, fingerprint oils)                       |
| >                                                                     |
| > \- Writing, stamps, or stickers on cover                            |
| >                                                                     |
| > \- Color fading or sun bleaching                                    |
| >                                                                     |
| > \- Production defects (miscut, miswrap, ink spots)                  |
| >                                                                     |
| > 5\. STAPLE CONDITION (if visible)                                   |
| >                                                                     |
| > \- Rust (none, minor, significant)                                  |
| >                                                                     |
| > \- Staple migration                                                 |
| >                                                                     |
| > \- Loose or popped staples                                          |
| >                                                                     |
| > \- Staple alignment                                                 |
| >                                                                     |
| > 6\. GENERAL ASSESSMENT                                              |
| >                                                                     |
| > \- Overall impression of preservation quality                       |
| >                                                                     |
| > \- Assessment of storage conditions (was this book cared            |
| >                                                                     |
| > for, or is it a survivor of neglect?)                               |
| >                                                                     |
| > \- Any signs of professional cleaning or pressing                   |
| >                                                                     |
| > (unnaturally flat for an older book, etc.)                          |
| >                                                                     |
| > GRADE SCALE REFERENCE:                                              |
| >                                                                     |
| > 10.0 (Gem Mint) - Perfect in every way                              |
| >                                                                     |
| > 9.8 (Near Mint/Mint) - Nearly perfect; minor printing defects only  |
| >                                                                     |
| > 9.6 (Near Mint+) - Minor defect; nearly flat cover                  |
| >                                                                     |
| > 9.4 (Near Mint) - Minor wear; almost perfect                        |
| >                                                                     |
| > 9.2 (Near Mint-) - Minor cover wear; small defects                  |
| >                                                                     |
| > 9.0 (Very Fine/Near Mint) - Minor wear beginning to show            |
| >                                                                     |
| > 8.0 (Very Fine) - Minor wear; small creases or bends                |
| >                                                                     |
| > 7.0 (Fine/Very Fine) - Minor to moderate wear                       |
| >                                                                     |
| > 6.0 (Fine) - Above-average but with wear evident                    |
| >                                                                     |
| > 5.0 (Very Good/Fine) - Average but presentable                      |
| >                                                                     |
| > 4.0 (Very Good) - Below-average; significant wear                   |
| >                                                                     |
| > 3.0 (Good/Very Good) - Heavily read; multiple defects               |
| >                                                                     |
| > 2.0 (Good) - Major defects; complete but damaged                    |
| >                                                                     |
| > 1.0 (Fair) - Severely damaged; barely complete                      |
| >                                                                     |
| > LIMITATIONS YOU MUST ACKNOWLEDGE:                                   |
| >                                                                     |
| > You CANNOT assess from a cover photo alone:                         |
| >                                                                     |
| > \- Interior page quality (white, off-white, cream, tan)             |
| >                                                                     |
| > \- Centerfold attachment                                            |
| >                                                                     |
| > \- Interior writing, stamps, or cut coupons                         |
| >                                                                     |
| > \- Marvel Value Stamp presence/absence                              |
| >                                                                     |
| > \- Subscription crease (may not be visible from front)              |
| >                                                                     |
| > \- Staple migration behind cover                                    |
| >                                                                     |
| > \- Professional restoration (color touch, tear seals)               |
| >                                                                     |
| > Because of these limitations, your grade range should span          |
| >                                                                     |
| > at least 1.0 full grade points (e.g., 6.0-7.0, not 6.5-7.0)         |
| >                                                                     |
| > unless the book is clearly in exceptional or very poor condition.   |
| >                                                                     |
| > RESPONSE FORMAT: Return ONLY valid JSON matching the schema.        |
| >                                                                     |
| > No preamble, no markdown, no explanation outside JSON.              |
+-----------------------------------------------------------------------+

### B. Output Schema: ConditionResult

+-----------------------------------------------------------------------+
| > {                                                                   |
| >                                                                     |
| > \"grade_low\": number, // Conservative floor (e.g., 5.5)            |
| >                                                                     |
| > \"grade_high\": number, // Probable ceiling (e.g., 7.0)             |
| >                                                                     |
| > \"grade_midpoint\": number, // Calculated (low+high)/2              |
| >                                                                     |
| > \"grade_label_low\": string, // \"Fine\"                            |
| >                                                                     |
| > \"grade_label_high\": string, // \"Fine/Very Fine\"                 |
| >                                                                     |
| > \"primary_defects\": \[                                             |
| >                                                                     |
| > {                                                                   |
| >                                                                     |
| > \"type\": string, // spine_stress\|corner_blunt\|tear\|             |
| >                                                                     |
| > // stain\|foxing\|writing\|chip\|crease\|                           |
| >                                                                     |
| > // color_loss\|staple_rust\|fading                                  |
| >                                                                     |
| > \"severity\": string, // minor\|moderate\|significant               |
| >                                                                     |
| > \"location\": string, // Descriptive: \"lower spine, 1/3 up\"       |
| >                                                                     |
| > \"color_breaking\": boolean, // Does defect break through ink?      |
| >                                                                     |
| > \"description\": string // Detailed observation                     |
| >                                                                     |
| > }                                                                   |
| >                                                                     |
| > \],                                                                 |
| >                                                                     |
| > \"cover_assessment\": {                                             |
| >                                                                     |
| > \"gloss\": string, // high\|moderate\|low\|absent                   |
| >                                                                     |
| > \"color_integrity\": string, // excellent\|good\|fair\|poor         |
| >                                                                     |
| > \"notes\": string                                                   |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"spine_assessment\": {                                             |
| >                                                                     |
| > \"stress_lines\": number, // Count of visible stress lines          |
| >                                                                     |
| > \"roll\": string, // none\|slight\|moderate\|significant            |
| >                                                                     |
| > \"splits\": boolean,                                                |
| >                                                                     |
| > \"notes\": string                                                   |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"corner_assessment\": {                                            |
| >                                                                     |
| > \"sharpness\": string, // sharp\|slightly_blunted\|blunted\|rounded |
| >                                                                     |
| > \"weakest_corner\": string, //                                      |
| > top_left\|top_right\|bottom_left\|bottom_right                      |
| >                                                                     |
| > \"notes\": string                                                   |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"limitations_noted\": \[string\], // What CANNOT be assessed from  |
| > photo                                                               |
| >                                                                     |
| > \"storage_inference\": string, // Assessment of likely storage      |
| > quality                                                             |
| >                                                                     |
| > \"pressing_potential\": string, //                                  |
| > none\|minor_improvement\|significant                                |
| >                                                                     |
| > \"grade_limiting_factor\": string // The single biggest factor      |
| > limiting grade                                                      |
| >                                                                     |
| > }                                                                   |
+-----------------------------------------------------------------------+

### C. User Message Template

The condition assessment receives the image plus the identification
context to calibrate era-appropriate expectations:

+-----------------------------------------------------------------------+
| > Assess the condition of this comic book cover.                      |
| >                                                                     |
| > Context: This has been identified as \[title\] #\[issue\]           |
| >                                                                     |
| > (\[cover_date\]), \[publisher\]. \[era\] era.                       |
| >                                                                     |
| > Grade conservatively. Return only JSON.                             |
| >                                                                     |
| > \[Image attached as base64 content block\]                          |
+-----------------------------------------------------------------------+

### D. API Call Configuration

+-----------------------------------------------------------------------+
| > Model: claude-sonnet-4-5-20250929                                   |
| >                                                                     |
| > Max tokens: 1500                                                    |
| >                                                                     |
| > Temperature: 0                                                      |
| >                                                                     |
| > System: \[condition assessment system prompt\]                      |
+-----------------------------------------------------------------------+

The condition prompt gets more token headroom than identification
because the defect descriptions can be verbose. 1500 tokens is
sufficient for even heavily damaged books.

**V. PROMPT 3: HIDDEN GEMS DETECTION**

This is not a separate API call. It is a post-processing logic layer
that runs after identification and valuation are complete. However, it
uses a Claude call to generate the natural-language explanation that
appears in the report.

### A. Detection Logic (Code, Not Prompt)

A book qualifies as a \"hidden gem\" if ALL of the following are true:

-   The FMV midpoint exceeds \$50.

-   The significance type is NOT null (the book has collector
    significance).

-   The book is NOT one of the \"obvious keys\" that even non-collectors
    would recognize. Maintain a hardcoded exclusion list of the top 50
    most culturally recognizable comic books (Action Comics #1, Amazing
    Fantasy #15, Detective Comics #27, Batman #1, Superman #1,
    Incredible Hulk #1, X-Men #1, etc.). If the book is on this list, it
    is not a hidden gem---it is an expected find.

For each book that passes the filter, the system calls Claude to
generate a one-paragraph explanation of why this book is unexpectedly
valuable.

### B. Explanation Generation Prompt

+-----------------------------------------------------------------------+
| > SYSTEM PROMPT: HIDDEN GEM EXPLANATION GENERATOR                     |
| >                                                                     |
| > You write brief, clear explanations of why a comic book is          |
| >                                                                     |
| > more valuable than a non-collector would expect. Your audience      |
| >                                                                     |
| > is someone who knows nothing about comics and has just learned      |
| >                                                                     |
| > that a book in their collection is worth money.                     |
| >                                                                     |
| > Tone: Warm, informative, slightly surprising. Not salesy.           |
| >                                                                     |
| > Think: a knowledgeable friend explaining something interesting.     |
| >                                                                     |
| > Length: 2-3 sentences maximum. No jargon without explanation.       |
| >                                                                     |
| > Structure: What the book IS, why it MATTERS to collectors,          |
| >                                                                     |
| > and what it is WORTH in plain language.                             |
+-----------------------------------------------------------------------+

User message template:

+-----------------------------------------------------------------------+
| > Explain why this book is a hidden gem for a non-collector:          |
| >                                                                     |
| > Title: \[title\] #\[issue\] (\[cover_date\])                        |
| >                                                                     |
| > Significance: \[significance.description\]                          |
| >                                                                     |
| > Estimated Value: \$\[fmv_low\] - \$\[fmv_high\]                     |
| >                                                                     |
| > Write 2-3 sentences. Plain language. No collector jargon.           |
+-----------------------------------------------------------------------+

### C. Example Output

For Marvel Spotlight #5 (1972):

*\"This issue from 1972 is where Ghost Rider first appeared in Marvel
Comics. The character went on to star in multiple series, a Nicolas Cage
film franchise, and a recent MCU appearance. Copies in this condition
range typically sell for \$800--\$1,200 at auction.\"*

## VI. VALUATION ENGINE

### A. GoCollect API Integration

The valuation engine queries GoCollect for fair market value data based
on the identified title, issue number, and estimated grade range. The
integration requires a GoCollect API subscription.

**Lookup Logic**

1.  Construct the GoCollect query using title, issue_number, and
    publisher from the IdentificationResult.

2.  Request sales data for the grade_low and grade_high from the
    ConditionResult. GoCollect returns recent sale prices by grade.

3.  If the exact grade is not in GoCollect\'s data, interpolate between
    the nearest available grades.

4.  Calculate the FMV as the median of the last 90 days of sales for
    each grade point in the range.

5.  If GoCollect returns no data for this title/issue (common for
    obscure books), flag the book for manual valuation and assign a
    placeholder value based on era and publisher averages.

### B. Output Schema: ValuationResult

+-----------------------------------------------------------------------+
| > {                                                                   |
| >                                                                     |
| > \"gocollect_match\": boolean, // Was the book found in GoCollect?   |
| >                                                                     |
| > \"fmv_low\": number, // FMV at grade_low (dollars)                  |
| >                                                                     |
| > \"fmv_high\": number, // FMV at grade_high (dollars)                |
| >                                                                     |
| > \"fmv_midpoint\": number, // Calculated average                     |
| >                                                                     |
| > \"data_source\": string, //                                         |
| > \"gocollect\"\|\"interpolated\"\|\"manual\"                         |
| >                                                                     |
| > \"last_sale_date\": string\|null, // Most recent sale date in data  |
| >                                                                     |
| > \"sales_volume_90d\": number\|null,// Number of sales in last 90    |
| > days                                                                |
| >                                                                     |
| > \"trend\": string\|null, //                                         |
| > \"rising\"\|\"stable\"\|\"declining\"\|null                         |
| >                                                                     |
| > \"census_count\": number\|null, // CGC census count if available    |
| >                                                                     |
| > \"is_hidden_gem\": boolean, // Flagged by hidden gem logic          |
| >                                                                     |
| > \"hidden_gem_explanation\": string\|null // Generated if            |
| > is_hidden_gem                                                       |
| >                                                                     |
| > }                                                                   |
+-----------------------------------------------------------------------+

### C. Fallback Valuation Table

When GoCollect has no data, use these conservative fallback estimates by
era and condition. These are placeholder values intended to keep the
appraisal moving; they should be clearly marked as \"estimated\" in the
report.

  -------------- -------------- -------------- -------------- -----------------
  **ERA**        **GRADE        **GRADE        **GRADE        **GRADE 8.0+**
                 2.0-3.9**      4.0-5.9**      6.0-7.9**      

  **Golden Age** \$25--\$75     \$50--\$200    \$100--\$500   \$250--\$1,500+

  **Silver Age** \$10--\$40     \$25--\$100    \$50--\$250    \$100--\$750+

  **Bronze Age** \$3--\$15      \$8--\$40      \$15--\$100    \$30--\$300+

  **Copper Age** \$1--\$5       \$3--\$15      \$5--\$40      \$10--\$100+

  **Modern Age** \$0.50--\$3    \$1--\$8       \$3--\$20      \$5--\$50+
  -------------- -------------- -------------- -------------- -----------------

*These ranges apply to non-key, non-significant books. Any book with
identified significance should be flagged for manual valuation rather
than using the fallback table.*

## VII. OFFER CALCULATION ENGINE

### A. Tier Configuration

The offer calculation is pure business logic with no AI involvement. It
applies configurable percentage tiers to the FMV data. Store these tiers
in lib/config/offer-tiers.ts so they can be adjusted without changing
application logic.

+-----------------------------------------------------------------------+
| > // lib/config/offer-tiers.ts                                        |
| >                                                                     |
| > export const OFFER_TIERS = {                                        |
| >                                                                     |
| > key_issues: {                                                       |
| >                                                                     |
| > label: \"Key Issues / Grails\",                                     |
| >                                                                     |
| > fmv_floor: 500, // Books with FMV \>= \$500                         |
| >                                                                     |
| > offer_pct_low: 0.50, // 50% of FMV low                              |
| >                                                                     |
| > offer_pct_high: 0.60, // 60% of FMV high                            |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > mid_tier: {                                                         |
| >                                                                     |
| > label: \"Mid-Tier Collectibles\",                                   |
| >                                                                     |
| > fmv_floor: 50, // Books with FMV \$50-\$499                         |
| >                                                                     |
| > offer_pct_low: 0.40,                                                |
| >                                                                     |
| > offer_pct_high: 0.50,                                               |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > common: {                                                           |
| >                                                                     |
| > label: \"Common / Reader Copies\",                                  |
| >                                                                     |
| > fmv_floor: 10, // Books with FMV \$10-\$49                          |
| >                                                                     |
| > offer_pct_low: 0.30,                                                |
| >                                                                     |
| > offer_pct_high: 0.40,                                               |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > bulk: {                                                             |
| >                                                                     |
| > label: \"Bulk Lot\",                                                |
| >                                                                     |
| > fmv_floor: 0, // Books with FMV \< \$10                             |
| >                                                                     |
| > flat_rate_low: 0.50, // \$0.50 per book                             |
| >                                                                     |
| > flat_rate_high: 2.00, // \$2.00 per book                            |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > };                                                                  |
+-----------------------------------------------------------------------+

### B. Output Schema: OfferResult

+-----------------------------------------------------------------------+
| > {                                                                   |
| >                                                                     |
| > \"tier\": string, // key_issues\|mid_tier\|common\|bulk             |
| >                                                                     |
| > \"tier_label\": string, // Human-readable tier name                 |
| >                                                                     |
| > \"fmv_low\": number,                                                |
| >                                                                     |
| > \"fmv_high\": number,                                               |
| >                                                                     |
| > \"offer_low\": number, // Calculated offer floor                    |
| >                                                                     |
| > \"offer_high\": number, // Calculated offer ceiling                 |
| >                                                                     |
| > \"offer_pct_applied\": number, // The % used (for transparency)     |
| >                                                                     |
| > \"is_bulk\": boolean, // true if in bulk lot                        |
| >                                                                     |
| > }                                                                   |
+-----------------------------------------------------------------------+

### C. Collection-Level Summary Calculation

After individual book offers are calculated, the system computes the
collection summary:

+-----------------------------------------------------------------------+
| > {                                                                   |
| >                                                                     |
| > \"total_books_identified\": number,                                 |
| >                                                                     |
| > \"total_books_flagged\": number, // Low confidence, needs review    |
| >                                                                     |
| > \"total_fmv_low\": number, // Sum of all fmv_low values             |
| >                                                                     |
| > \"total_fmv_high\": number,                                         |
| >                                                                     |
| > \"total_offer_low\": number, // Sum of all offer_low values         |
| >                                                                     |
| > \"total_offer_high\": number,                                       |
| >                                                                     |
| > \"key_issues_count\": number, // Books with significance != null    |
| >                                                                     |
| > \"hidden_gems_count\": number,                                      |
| >                                                                     |
| > \"bulk_lot_count\": number,                                         |
| >                                                                     |
| > \"breakdown_by_era\": {                                             |
| >                                                                     |
| > \"golden\": number,                                                 |
| >                                                                     |
| > \"silver\": number,                                                 |
| >                                                                     |
| > \"bronze\": number,                                                 |
| >                                                                     |
| > \"copper\": number,                                                 |
| >                                                                     |
| > \"modern\": number                                                  |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"breakdown_by_publisher\": {                                       |
| >                                                                     |
| > \[publisher: string\]: number                                       |
| >                                                                     |
| > },                                                                  |
| >                                                                     |
| > \"reference_number\": string // TCB-YYYYMMDD-XXXX                   |
| >                                                                     |
| > }                                                                   |
+-----------------------------------------------------------------------+

## VIII. PDF REPORT SPECIFICATION

### A. Design Requirements

The PDF appraisal document must look professional and authoritative. It
should feel like a document you would hand to an estate attorney, not a
receipt from a comic shop. Design guidelines:

-   **Typography:** Clean sans-serif (Inter or similar) for body text.
    Heavier weight for headers. Monospace for data tables.

-   **Color palette:** Minimal. Dark charcoal for text, a single accent
    color (the brand blue or green of TheComicBuyers.com), and light
    gray for table alternating rows.

-   **Logo:** TheComicBuyers.com or EstateComics.com logo in the header,
    determined by the originating domain. The logo should be subtle, not
    dominant.

-   **White space:** Generous margins. The document should breathe.
    Dense data tables are acceptable; dense paragraphs are not.

-   **Page headers:** Brand logo (left), reference number (right), on
    every page after the cover.

-   **Page footers:** \"This appraisal is preliminary and subject to
    physical verification. TheComicBuyers.com\" centered, with page
    number.

### B. Page Structure

**Page 1: Cover Page**

-   Brand logo (centered, large)

-   \"Comic Book Collection Appraisal\" title

-   Reference number: TCB-YYYYMMDD-XXXX

-   Date generated

-   QR code linking to the online version

-   Prepared for: \[seller name\]

**Page 2: Collection Summary**

-   Total books identified

-   Total estimated fair market value range

-   Total cash offer range

-   Key issues identified (count and total value)

-   Hidden gems identified (count)

-   Breakdown by era (pie chart or simple bar)

-   Breakdown by publisher (top 5)

**Pages 3+: Hidden Gems Section (if applicable)**

-   Header: \"Books You Might Not Know Are Valuable\"

-   Each hidden gem: cover thumbnail (small), title/issue, significance
    explanation (from the hidden gems prompt), FMV range, and offer
    range

-   This section appears BEFORE the full inventory to front-load the
    trust-building moment

**Key Issues Section**

-   All books with non-null significance, sorted by FMV descending

-   Each entry: title, issue, significance, grade range, FMV range,
    offer range

-   This section highlights the collection\'s most valuable assets

**Complete Inventory Table**

-   Full itemized table: title, issue, publisher, date, era, variant,
    grade range, FMV range, offer range

-   Sorted by FMV descending

-   Alternating row shading for readability

-   Books flagged for review marked with a visual indicator

**Bulk Lot Summary**

-   Aggregate line: \"\[X\] books valued under \$10 each\"

-   Total bulk FMV and total bulk offer

-   No individual line items for bulk books

**Final Page: Terms & Next Steps**

-   Clear statement that the offer is preliminary and contingent on
    physical inspection

-   Payment methods: USDC, BTC, ACH with expected timelines

-   How to accept: reply to confirmation email or call the provided
    number

-   Offer validity: 14 days from the date of the appraisal

-   Contact information

## IX. IMAGE VALIDATION SPECIFICATION

### A. Pre-Processing Checks

Before sending any image to the Claude API, validate it on the server.
Reject images that will produce poor results and prompt the user to
re-upload.

  ----------------- ----------------- ------------------- -----------------
  **CHECK**         **THRESHOLD**     **REJECTION         **NOTES**
                                      MESSAGE**           

  File type         JPEG, PNG, HEIC,  \"Please upload a   Convert HEIC to
                    WebP              JPEG, PNG, or HEIC  JPEG server-side
                                      image.\"            before API call

  File size         Max 20MB          \"Image is too      Compress to \~2MB
                                      large. Please use a before API call
                                      smaller file.\"     regardless

  Resolution        Min 640x480       \"Image resolution  Very small images
                                      is too low for      cannot show
                                      accurate            detail
                                      identification.\"   

  Aspect ratio      Between 1:2 and   \"Image appears to  Extreme ratios
                    2:1               be cropped          suggest non-comic
                                      incorrectly.\"      content

  Blur detection    Laplacian         \"This image        Optional for MVP;
                    variance \> 100   appears blurry.     add in Phase 2
                                      Please retake the   
                                      photo.\"            
  ----------------- ----------------- ------------------- -----------------

### B. Image Optimization Pipeline

After validation, process the image before sending to Claude:

6.  Convert HEIC to JPEG (if applicable).

7.  Resize to a maximum of 2048px on the longest edge (maintains aspect
    ratio). This is the optimal resolution for Claude\'s vision
    capabilities without excessive token consumption.

8.  Compress JPEG to quality 85. This reduces file size while preserving
    detail sufficient for identification and grading.

9.  Convert to base64 for the API call.

10. Store the original full-resolution image in cloud storage (S3/R2)
    for reference during physical inspection.

## X. SELLER QUESTIONNAIRE SPECIFICATION

### A. Questionnaire Fields

The seller questionnaire appears after all photos have been uploaded and
processed. It collects collection-level information that the AI cannot
determine from cover photos alone. Answers modify the condition
assessment ranges for the entire batch.

  -------------------- ---------------------- ----------------------------
  **QUESTION**         **OPTIONS**            **GRADE ADJUSTMENT**

  How were these       Bags & boards in boxes Bags & boards: no
  comics stored?       / Loose in boxes /     adjustment. Loose in boxes:
                       Loose on shelves /     -0.5 from high. Loose on
                       Attic or basement /    shelves: -0.5 from both.
                       Unknown                Attic/basement: -1.0 from
                                              both. Unknown: -0.5 from
                                              high.

  What is the general  White / Off-white /    White: no adjustment.
  page color?          Yellowed / Brittle /   Off-white: no adjustment
                       Mixed / I don't know   (expected for age).
                                              Yellowed: -0.5 from both.
                                              Brittle: -1.5 from both.
                                              Mixed/Unknown: -0.5 from
                                              high.

  Are any pages        None / A few / Many /  None: no adjustment. A few:
  missing or coupons   I don't know           flag affected books for
  cut?                                        review. Many: -2.0 from both
                                              across batch. Unknown: -0.5
                                              from high.

  Were these stored in Yes / No / Partially / Yes: no adjustment. No: -0.5
  a climate-controlled I don't know           from high.
  space?                                      Partially/Unknown: -0.25
                                              from high.

  Do any books have    Yes (describe) / No /  No grade adjustment. \"Yes\"
  inserts or extras?   I don't know           triggers a note for the
                                              review team to check for
                                              Mark Jewelers, posters,
                                              tattoos, etc.
  -------------------- ---------------------- ----------------------------

Grade adjustments are applied to the ConditionResult grade_low and
grade_high values. Adjustments are cumulative but capped: the adjusted
grade can never go below 0.5 or drop more than 3.0 points total from the
AI\'s original estimate.

## XI. EMAIL SPECIFICATIONS

### A. Submission Confirmation Email (to Seller)

Sent immediately when the seller clicks \"Submit for Offer.\" This is a
transactional email via Resend or SendGrid.

+-----------------------------------------------------------------------+
| > Subject: Your Comic Book Appraisal \| Ref: \[REFERENCE_NUMBER\]     |
| >                                                                     |
| > Hi \[FIRST_NAME\],                                                  |
| >                                                                     |
| > Thank you for submitting your collection for appraisal.             |
| >                                                                     |
| > Your reference number is \[REFERENCE_NUMBER\].                      |
| >                                                                     |
| > Here is a summary of your collection:                               |
| >                                                                     |
| > \- Books identified: \[TOTAL_BOOKS\]                                |
| >                                                                     |
| > \- Estimated fair market value: \$\[FMV_LOW\] - \$\[FMV_HIGH\]      |
| >                                                                     |
| > \- Our preliminary cash offer: \$\[OFFER_LOW\] - \$\[OFFER_HIGH\]   |
| >                                                                     |
| > Your full appraisal report is attached as a PDF.                    |
| >                                                                     |
| > WHAT HAPPENS NEXT:                                                  |
| >                                                                     |
| > Our team will review your appraisal within 24 hours. If your        |
| >                                                                     |
| > collection meets our acquisition criteria, we will contact you      |
| >                                                                     |
| > to arrange inspection and finalize the offer.                       |
| >                                                                     |
| > If you have questions, reply to this email or call us at            |
| >                                                                     |
| > \[PHONE_NUMBER\].                                                   |
| >                                                                     |
| > Thank you,                                                          |
| >                                                                     |
| > The Comic Buyers                                                    |
| >                                                                     |
| > \[BRAND_URL\]                                                       |
+-----------------------------------------------------------------------+

### B. Internal Notification Email (to Team)

Sent to the designated intake email address simultaneously with the
seller confirmation. Contains the full data payload for review.

+-----------------------------------------------------------------------+
| > Subject: NEW SUBMISSION \| \[REFERENCE_NUMBER\] \| \[TOTAL_BOOKS\]  |
| >                                                                     |
| > books \| \$\[OFFER_LOW\]-\$\[OFFER_HIGH\] offer range               |
| >                                                                     |
| > Seller: \[FULL_NAME\]                                               |
| >                                                                     |
| > Email: \[SELLER_EMAIL\]                                             |
| >                                                                     |
| > Phone: \[SELLER_PHONE\]                                             |
| >                                                                     |
| > Zip: \[SELLER_ZIP\]                                                 |
| >                                                                     |
| > Source: \[thecomicbuyers.com \| estatecomics.com\]                  |
| >                                                                     |
| > Collection size: \[TOTAL_BOOKS\] books                              |
| >                                                                     |
| > Flagged for review: \[FLAGGED_COUNT\] books                         |
| >                                                                     |
| > KEY ISSUES IDENTIFIED:                                              |
| >                                                                     |
| > \[list of books with significance != null\]                         |
| >                                                                     |
| > HIDDEN GEMS:                                                        |
| >                                                                     |
| > \[list of hidden gem books with explanations\]                      |
| >                                                                     |
| > COLLECTION SUMMARY:                                                 |
| >                                                                     |
| > Total FMV: \$\[FMV_LOW\] - \$\[FMV_HIGH\]                           |
| >                                                                     |
| > Total Offer: \$\[OFFER_LOW\] - \$\[OFFER_HIGH\]                     |
| >                                                                     |
| > Key issues: \[COUNT\] (\$\[KEY_FMV\])                               |
| >                                                                     |
| > Bulk lot: \[COUNT\] books (\$\[BULK_OFFER\])                        |
| >                                                                     |
| > SELLER QUESTIONNAIRE RESPONSES:                                     |
| >                                                                     |
| > \[all responses listed\]                                            |
| >                                                                     |
| > ATTACHMENTS: PDF report, CSV data export                            |
+-----------------------------------------------------------------------+

### C. Offer Acceptance Email (Phase 2)

When the seller clicks the acceptance link in their confirmation email,
trigger a second email confirming next steps. This email is not needed
for MVP; the initial launch uses manual follow-up after the team reviews
the submission.

## XII. ERROR HANDLING & EDGE CASES

### A. AI Failure Modes

  ------------------- ------------------------- -------------------------
  **SCENARIO**        **DETECTION**             **HANDLING**

  Claude API returns  JSON.parse fails on       Retry once with the same
  non-JSON            response                  image. If second attempt
                                                fails, flag book as
                                                \"unidentifiable\" and
                                                add to manual review
                                                queue.

  Claude identifies   Cannot detect             Physical inspection will
  wrong book          automatically (human      catch misidentifications.
                      review)                   Offer is contingent. Low
                                                confidence scores reduce
                                                impact.

  Image is not a      Confidence score returns  Return message: \"We
  comic book          \< 30 or title field is   could not identify a
                      empty/nonsensical         comic book in this image.
                                                Please upload a clear
                                                photo of the front
                                                cover.\"

  Claude API rate     429 response status       Implement exponential
  limit hit                                     backoff: wait 2s, 4s, 8s.
                                                After 3 retries, queue
                                                the image for processing
                                                and notify the user:
                                                \"Processing your
                                                collection. We will email
                                                you when complete.\"

  GoCollect API       Empty response or 404 for Use fallback valuation
  returns no data     the title                 table. Mark the book as
                                                \"estimated\" in the
                                                report. Flag for manual
                                                valuation.

  GoCollect API is    Timeout or 5xx response   Use fallback table for
  down                                          all books. Display notice
                                                to user: \"Market data is
                                                temporarily unavailable.
                                                Values shown are
                                                estimates.\" Retry
                                                GoCollect lookups
                                                asynchronously and update
                                                the report.

  Duplicate photo     Perceptual hash           Alert user: \"This image
  uploaded            comparison between images appears to be a duplicate
                                                of a previously uploaded
                                                photo. Skip or
                                                re-upload?\"
  ------------------- ------------------------- -------------------------

### B. Rate Limiting & Cost Management

Each photo requires 2 Claude API calls (identification + condition). For
a 300-book collection, that is 600 API calls. Cost and rate management
considerations:

-   **Batching:** Process images in parallel batches of 10. This
    balances speed against rate limits. Each batch completes before the
    next begins. Total processing time for 300 books: approximately 5--8
    minutes at 10 concurrent calls.

-   **Caching:** If the identification step returns a title/issue
    combination that has already been valued via GoCollect in the same
    session, reuse the cached FMV data rather than making a redundant
    API call. Common in collections with runs of the same title.

-   **Cost estimate:** At Sonnet pricing (\~\$3/M input, \~\$15/M output
    tokens), each photo costs approximately \$0.01--\$0.03 for both
    calls. A 300-book collection costs \$3--\$9 in API fees. This is
    well within margin for collections valued at \$500+.

-   **Daily budget cap:** Implement a daily spending cap on API calls to
    prevent runaway costs from abuse or bugs. Recommended cap: \$100/day
    for MVP, adjustable as volume scales.

### C. Security Considerations

-   All uploaded images must be scanned for malicious content (EXIF
    stripping, content-type validation) before processing.

-   API keys (Anthropic, GoCollect, Resend) must be stored in
    environment variables, never in client-side code.

-   Rate limit the /api/identify and /api/grade endpoints to prevent
    abuse (max 50 requests per IP per hour for unauthenticated users).

-   Implement CAPTCHA or similar bot protection on the submission form.

-   Seller personal data (name, email, phone) must be stored encrypted
    at rest. Comply with applicable state privacy laws (CCPA for Florida
    users, CT data privacy act for Connecticut users).

## XIII. CLAUDE CODE BUILD INSTRUCTIONS

This section provides the task sequence for implementing the MVP using
Claude Code. Each task is scoped to be completable in a single Claude
Code session.

#### Task 1: Project Scaffold

Initialize a Next.js 14+ project with TypeScript, Tailwind CSS, and the
file structure defined in Section II.B. Install dependencies:
\@anthropic-ai/sdk, zod, puppeteer (or \@react-pdf/renderer), papaparse,
resend. Configure .env.local with placeholder keys.

#### Task 2: Prompts & Schemas

Create the prompt files in lib/prompts/ with the exact system prompts
from Sections III, IV, and V of this document. Create the Zod validation
schemas in lib/schemas/ matching the output schemas defined in this
document. The schemas must validate every API response before it enters
the processing pipeline.

#### Task 3: Claude API Client

Build lib/services/claude.ts as a wrapper around the Anthropic SDK. It
should expose two functions: identifyComic(imageBase64: string):
Promise\<IdentificationResult\> and assessCondition(imageBase64: string,
context: IdentificationResult): Promise\<ConditionResult\>. Both
functions should handle retries, JSON parsing, and Zod validation.
Return typed, validated results or throw structured errors.

#### Task 4: Image Validation & Upload

Build the image validation pipeline (lib/utils/image-validation.ts) and
the upload components (components/upload/). Implement the checks from
Section IX. Build both the standard file picker and the Rapid Scan
camera interface. Processed images should be stored temporarily in
application state and uploaded to cloud storage.

#### Task 5: Processing Pipeline & Results UI

Build the /api/identify and /api/grade route handlers. Build the
real-time results feed (components/results/) that shows identified books
populating as each photo is processed. The feed should display: cover
thumbnail, title, issue, publisher, confidence indicator
(green/yellow/orange), and a loading state for books still processing.

#### Task 6: GoCollect Integration & Valuation

Build lib/services/gocollect.ts for the GoCollect API integration. Build
the /api/valuate route handler. Implement the fallback valuation table
from Section VI.C. Build the offer calculation logic from the tier
configuration in Section VII.A.

#### Task 7: Seller Questionnaire

Build the questionnaire component that appears after all photos are
processed. Implement the grade adjustment logic from Section X. Apply
adjustments to all ConditionResult objects and recalculate offers
accordingly.

#### Task 8: PDF & CSV Generation

Build lib/services/pdf-generator.ts following the specification in
Section VIII. Build lib/services/csv-generator.ts with the column
structure defined in the PDR (Section V.B). Generate the reference
number (TCB-YYYYMMDD-XXXX format). Build the /api/generate-report
endpoint.

#### Task 9: Submission & Email

Build the /api/submit endpoint that packages the appraisal data,
generates the PDF and CSV, sends the seller confirmation email, and
sends the internal notification email. Use the templates from Section
XI. Build lib/services/email.ts with Resend integration.

#### Task 10: Landing Page & SEO Pages

Build the homepage (app/page.tsx), How It Works page, About page, and
the dynamic geographic landing page template
(app/areas/\[state\]/page.tsx). Implement SEO metadata, Open Graph tags,
and structured data (JSON-LD) for local business schema.
TheComicBuyers.com styling first; EstateComics.com as a theme variant.

**END OF DOCUMENT**

TheComicBuyers.com \| EstateComics.com

Powered by Legends of Superheros • Est. 1993
