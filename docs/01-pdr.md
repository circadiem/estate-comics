---
doc: Product Design & Requirements (v1)
status: ACTIVE — strategy, user flow, and business logic remain authoritative
superseded_in_part_by: docs/03-implementation-addendum-phase2.md
---

> **READ THIS BANNER FIRST — v1 naming is retired.**
>
> This document was written in February 2026 under the working name *TheComicBuyers*.
> The brand is now **Estate Comics** (`estatecomics.com`). The following are superseded:
>
> | v1 says | Current truth |
> |---|---|
> | TheComicBuyers.com as primary domain | **estatecomics.com** is the only domain. thecomicbuyers.com is retired with no redirect. |
> | Two sites / two skins | **One site, one brand.** The "EstateComics.com as niche reskin" model is dead. |
> | Reference format `TCB-YYYYMMDD-XXXX` | **`EC-YYYYMMDD-XXXX`** |
> | Offer % tiers in §III.A Step 4 | Use the tier table in `CLAUDE.md` (from the EstateComics skill), not this one. |
> | Phase plan in §XI | Superseded by `docs/05-build-sequence.md` |
>
> Everything else — market analysis, seller profiles, user flow, AI engine approach,
> PDF/CSV output spec, Hidden Gems, SEO and referral strategy, risk register — stands.

**PRODUCT DESIGN & REQUIREMENTS**

**DOCUMENT**

TheComicBuyers.com \| EstateComics.com

*AI-Powered Collection Acquisition Platform*

**CONFIDENTIAL**

Powered by Legends of Superheros • Est. 1993

Version 1.0 \| February 2026

## I. EXECUTIVE SUMMARY

TheComicBuyers.com and EstateComics.com are companion web properties
that serve as the acquisition arm of the Legends of Superheros
ecosystem. While The Corner Box operates as the premium sell-side
platform for curated vintage comics, TheComicBuyers is the buy-side
engine that sources inventory at scale through an AI-powered collection
appraisal and offer tool.

The core product is a web-based application that allows individuals to
photograph their comic book collections, receive instant AI-driven
identification and valuation, and submit a structured appraisal for a
cash offer. The tool handles the labor-intensive work of identifying
titles, estimating condition, pulling fair market value data, and
generating professional appraisal documents, enabling the team to
evaluate collections efficiently and make competitive offers with speed
no traditional dealer can match.

**The Value Proposition**

For sellers: Transparency, speed, and fair pricing. Most people selling
collections have no idea what they own or what it is worth. The tool
gives them clarity and a legitimate offer within hours, not weeks.
Payment is delivered via stablecoin, BTC, or ACH within 48 hours of
physical verification.

For the business: A scalable acquisition pipeline that feeds The Corner
Box inventory while generating standalone revenue through bulk resale of
non-premium books. AI handles the identification and valuation labor;
human expertise handles the final verification and offer negotiation.

## II. STRATEGIC CONTEXT

### A. Market Opportunity

The comic book acquisition market is fragmented and inefficient. Sellers
currently face three options, each with significant friction:

-   **Local dealers:** Require in-person visits, offer opaque pricing,
    and typically lowball because the seller has no leverage or
    knowledge. The experience is intimidating for non-collectors.

-   **eBay / online marketplaces:** Require individual listing,
    photography, and shipping for each book. A 300-book collection
    becomes a months-long project. Most sellers abandon the process.

-   **Auction houses (Heritage, etc.):** Serve the high end only.
    Minimum consignment values of \$2,500+ exclude the vast majority of
    collections. Timelines are measured in months.

There is no digital-first solution that says: photograph your books, get
an instant appraisal, receive a fair cash offer, and get paid fast.
TheComicBuyers fills that gap.

### B. Target Sellers

The tool is designed for three primary seller profiles:

-   **Estate Executors:** Attorneys, family members, or estate sale
    companies liquidating collections from deceased owners. They need
    speed, professionalism, and a defensible valuation for probate
    purposes. This is the EstateComics.com audience.

-   **Downsizing Collectors:** Aging collectors who have decided to
    liquidate part or all of their holdings. They know what they have
    but want a fair process without the hassle of selling piecemeal.
    They value expertise and respect.

-   **Inheritors:** People who have received collections they did not
    build. They often know nothing about comics and are overwhelmed by
    the volume. They need education and trust. The \"hidden gems\"
    callout feature is designed specifically for this audience.

### C. Geographic Focus

Initial service area covers two primary corridors:

-   **Northeast:** New England (CT, MA, RI, NH, VT, ME), New York, New
    Jersey, and Pennsylvania. This region contains some of the densest
    concentrations of vintage comic collections in the country, driven
    by decades of newsstand distribution and urban collecting culture.

-   **South Florida:** Miami-Dade, Broward, and Palm Beach counties. The
    snowbird estate market and retiree downsizing pipeline make this a
    high-value secondary market.

Collections outside these regions can be shipped. The geographic focus
determines where in-person pickups and local advertising are
prioritized, not where submissions are accepted.

### D. Competitive Positioning

TheComicBuyers competes on three axes simultaneously:

  -------------------- ----------------- ----------------- -------------------
                       **FAIREST PRICE** **EASIEST         **FASTEST PAYOUT**
                                         PROCESS**         

  **Local Dealers**    Opaque / lowball  In-person only    Cash on spot (if
                                                           fair)

  **eBay**             Market rate       Extremely         Weeks per item
                       (minus fees)      difficult         

  **Heritage           Premium (high end Moderate          60--90 days
  Auctions**           only)                               

  **TheComicBuyers**   Transparent       Photo → Offer →   48 hours
                       FMV-based         Paid              post-verification
  -------------------- ----------------- ----------------- -------------------

The combination of transparent pricing, AI-driven ease, and
crypto-enabled speed is the moat. No current competitor offers all
three.

### E. Relationship to The Corner Box

TheComicBuyers operates as a separate brand with distinct visual
identity and voice. The tone is approachable and helpful, not archival
and exclusive. The sites should feel like a professional service, not a
luxury gallery.

On the backend, the two businesses are symbiotic. Premium books acquired
through TheComicBuyers flow into The Corner Box drops with provenance
documentation. Bulk and mid-grade inventory is resold through secondary
channels (wholesale, convention sales, or a separate online storefront).
The Corner Box provenance stories can reference acquisitions with the
line: \"Acquired from a private collection in \[city\].\"

The two brands should never cross-reference each other publicly. A
seller on TheComicBuyers does not need to know about The Corner Box. A
collector on The Corner Box does not need to know where the inventory
came from. The pipeline is invisible to both audiences.

## III. PRODUCT SPECIFICATION

### A. Core User Flow

The user journey from landing to submission follows a linear, five-step
process designed to minimize friction and maximize completion rate:

#### Step 1: Landing & Qualification

The user arrives at TheComicBuyers.com or EstateComics.com. The homepage
immediately communicates three things: what we do (buy comic book
collections), how it works (photograph, appraise, offer), and why we are
different (AI-powered instant appraisal, transparent pricing, 48-hour
payment). A single CTA button initiates the process: \"Get Your Free
Appraisal.\"

Before entering the tool, the user provides basic qualifying
information: name, email, phone (optional), zip code, and estimated
collection size (dropdown: 100--250, 250--500, 500--1000, 1000+). The
100-book minimum is enforced here. Collections under 100 books receive a
message: \"We specialize in collections of 100 books or more. For
smaller collections, we recommend \[local resource or alternative\].\"

#### Step 2: Photo Upload & AI Identification

The user uploads photographs of comic book covers. The interface
supports two modes:

-   **Single Upload:** Standard file picker for individual cover photos.
    Drag-and-drop supported on desktop.

-   **Rapid Scan Mode:** Camera-first interface optimized for mobile.
    The user points their phone camera at each cover and taps to
    capture. Photos queue automatically without returning to a gallery
    view between shots. Designed for scanning long boxes efficiently.

Each uploaded image is processed by the AI identification engine (see
Section IV). The system returns: title, issue number, volume, publisher,
cover date, era designation (Golden/Silver/Bronze/Copper/Modern), print
run variant (newsstand vs. direct edition, price variants, Mark Jewelers
inserts), and a confidence score (0--100%).

Results populate in real-time as each photo is processed. The user sees
a growing list of identified comics with key data. Books with confidence
scores below 80% are flagged with an orange indicator and a note:
\"Identification uncertain. Our team will verify this book manually.\"

#### Step 3: Condition Estimation & Seller Input

For each identified book, the AI performs a visual condition assessment
based on the cover photograph. The system evaluates: cover gloss and
reflectivity, spine condition (ticks, rolls, stress lines), corner
sharpness, visible tears or chips, color fading or staining, and staple
condition (where visible).

The AI outputs a condition range rather than a single grade. Example:
\"Estimated Grade: 5.5--7.0 (Fine to Fine/Very Fine).\" The range
acknowledges the inherent limitations of grading from a photograph.
Interior page quality, staple migration, and subscription creases cannot
be assessed visually.

The user is presented with a brief supplemental questionnaire for the
overall collection (not per book): \"Are pages generally
white/off-white, or are they yellowed/brittle?\" \"Are any books missing
pages or have cut coupons?\" \"Were these books stored in bags and
boards, loose in boxes, or other?\" \"Were they stored in a
climate-controlled environment?\" Answers adjust the condition estimate
range for the entire batch.

#### Step 4: Valuation & Offer Generation

Once identification and condition estimation are complete, the system
pulls fair market value data from the GoCollect API for each book at the
estimated grade range. The valuation engine calculates:

-   **Fair Market Value (FMV):** The median recent sale price for that
    title, issue, and grade from GoCollect data. Displayed as a range
    corresponding to the condition estimate range.

-   **Key Issue Premium:** Books with first appearances, origin stories,
    deaths, or other significant events are flagged and their historical
    significance noted.

-   **Variant Premium:** Newsstand editions, price variants, and Mark
    Jewelers inserts receive adjusted valuations reflecting their
    relative scarcity.

-   **Bulk Lot Valuation:** Books with individual FMV below \$10 are
    grouped as a bulk lot and valued per-book at a flat rate rather than
    individually priced. This keeps the report focused on material
    value.

The cash offer is calculated as a percentage of FMV. The offer
percentage varies by tier:

  ----------------------- ----------------------- -----------------------
  **BOOK TIER**           **FMV RANGE**           **OFFER % OF FMV**

  **Key Issues / Grails** \$500+                  50--60%

  **Mid-Tier              \$50--\$499             40--50%
  Collectibles**                                  

  **Common / Reader       \$10--\$49              30--40%
  Copies**                                        

  **Bulk Lot**            Under \$10 each         \$0.50--\$2.00 per book
  ----------------------- ----------------------- -----------------------

*Note: These percentages are initial guidelines and should be adjusted
based on market conditions, acquisition strategy, and individual
collection quality. The system should allow manual override of offer
percentages before submission.*

#### Step 5: Report Generation & Submission

The user reviews the complete appraisal and can view it in two formats:

-   **On-Screen Summary:** A sortable, filterable table showing every
    identified book with its data, FMV, and the cash offer. Summary
    statistics at the top: total books identified, total FMV range,
    total cash offer range, number of key issues flagged.

-   **Downloadable PDF:** A professional appraisal document branded to
    TheComicBuyers.com or EstateComics.com (depending on the originating
    site). Includes: header with brand logo, unique reference number and
    QR code, date of appraisal, itemized table of all books, summary
    totals, offer terms, and next steps for accepting the offer.

-   **Downloadable CSV:** Raw data export for users who want to analyze
    the data independently or share it with advisors.

When the user clicks \"Submit for Offer,\" the appraisal data, PDF, and
CSV are emailed to the designated intake address. The user receives a
confirmation email with their reference number, a copy of the PDF, and a
clear statement of next steps: \"Our team will review your collection
within 24 hours. If the appraisal meets our acquisition criteria, we
will contact you to arrange inspection and payment.\"

## IV. AI ENGINE SPECIFICATION

### A. Identification Model

The AI identification engine is the core technology of the product. It
must perform four functions from a single cover photograph:

-   **Title Recognition:** Identify the series title from the cover
    masthead, logo design, and visual cues. This must handle variant
    logos across eras (e.g., the multiple masthead designs of Amazing
    Spider-Man across 60 years).

-   **Issue Number Extraction:** Read the issue number from the cover.
    This is complicated by inconsistent placement across publishers and
    eras, corner box placement, and the occasional absence of visible
    issue numbers on variant covers.

-   **Publisher Identification:** Determine the publisher from logo
    placement, trade dress, and cover design conventions.

-   **Variant Detection:** Distinguish newsstand editions from direct
    editions (UPC barcode vs. publisher logo in the corner box),
    identify price variants (30-cent, 35-cent variants), and flag
    potential Mark Jewelers inserts (though these cannot be confirmed
    from a cover photo alone).

### B. Technical Approach

The recommended approach uses a multimodal LLM (Claude) as the primary
identification engine, supplemented by a structured comic book database
for validation. The workflow:

-   User photo is submitted to the Claude API with a structured prompt
    requesting title, issue, publisher, cover date, and variant
    information.

-   Claude returns a structured JSON response with the identification
    and a confidence score.

-   The response is validated against a reference database (Grand Comics
    Database API or a custom-built lookup table from GoCollect data) to
    confirm accuracy.

-   If Claude\'s identification and the database match, confidence is
    high (90--100%). If they diverge, the book is flagged for human
    review.

-   For condition assessment, the same photo is analyzed with a second
    prompt focused on visual defect detection. The model evaluates cover
    integrity, spine condition, and corner sharpness, outputting a grade
    range.

This approach leverages Claude\'s visual comprehension rather than
requiring a custom-trained CV model, dramatically reducing development
time and cost while maintaining high accuracy for well-known titles.

### C. Prompt Engineering Requirements

The identification prompt must instruct the model to:

-   Return data in a strict JSON schema (title, issue_number, volume,
    publisher, cover_date, era, variant_type, confidence_score).

-   Default to conservative confidence scores. If any element is
    uncertain, reduce the overall confidence below 80% to trigger human
    review.

-   Identify the specific print run variant (newsstand vs. direct) based
    on the UPC/logo configuration in the corner box area.

-   Note any visible significance markers (first appearance banners,
    \"Origin of\...\" text, crossover event indicators).

The condition assessment prompt must instruct the model to:

-   Return a grade range (low estimate and high estimate) rather than a
    single grade.

-   Note specific observed defects with location descriptions (e.g.,
    \"color-breaking spine tick at 2 o\'clock position\").

-   Flag any defects that suggest the book may grade lower than the
    visual estimate (subscription creases, potential interior damage
    indicated by cover distortion).

-   Explicitly state what cannot be assessed from the photo (interior
    page quality, staple condition behind cover, centerfold attachment).

### D. Known Limitations & Mitigations

  ----------------------- ----------------------- -----------------------
  **LIMITATION**          **IMPACT**              **MITIGATION**

  Interior pages not      Grade could be lower    Seller questionnaire
  visible                 than estimate           adjusts range; final
                                                  offer contingent on
                                                  inspection

  Photo quality varies    Poor photos reduce      Photo quality check
                          identification accuracy with re-upload prompt
                                                  for blurry/dark images

  Obscure titles / indie  Low confidence on       Human review queue;
  publishers              non-mainstream books    bulk lot pricing for
                                                  unidentifiable books

  Mark Jewelers inserts   Cannot confirm from     Seller questionnaire
                          cover photo             asks about inserts;
                                                  verified at inspection

  Restored / cleaned      Professional            Seller attestation;
  books                   restoration not visible inspection
                          in photos               verification; offer
                                                  contingency clause
  ----------------------- ----------------------- -----------------------

## V. OUTPUT SPECIFICATIONS

### A. PDF Appraisal Document

The PDF is the primary deliverable and must function as a professional
appraisal document. It should be clean, authoritative, and suitable for
sharing with estate attorneys, family members, or financial advisors.

**Document Structure**

-   **Header:** Brand logo (TheComicBuyers.com or EstateComics.com),
    unique reference number (format: TCB-YYYYMMDD-XXXX), QR code linking
    to the online version of the appraisal, and the date of generation.

-   **Collection Summary:** Total books identified, total estimated FMV
    range, total cash offer range, number of key issues identified,
    breakdown by era (Golden/Silver/Bronze/Copper/Modern), and breakdown
    by publisher.

-   **Key Issues Section:** Highlighted section listing only the books
    with identified significance (first appearances, deaths, key
    storylines). Each entry includes: cover thumbnail, title and issue,
    significance description, estimated grade range, and FMV range. This
    section is designed to show the seller their most valuable assets
    upfront.

-   **Complete Inventory:** Full itemized table with columns: thumbnail,
    title, issue, publisher, cover date, era, variant type, estimated
    grade, FMV low, FMV high, offer low, offer high. Sorted by FMV
    descending so the most valuable books appear first.

-   **Bulk Lot Summary:** Aggregated summary of books valued under \$10
    each. Total count, total estimated FMV, total offer amount. No
    individual listings for bulk books.

-   **Terms & Next Steps:** Clear language explaining that the offer is
    preliminary and contingent on physical inspection. Accepted payment
    methods (USDC, BTC, ACH). Expected timeline from acceptance to
    payment. Contact information for questions.

### B. CSV Data Export

The CSV should contain one row per identified book with the following
columns: reference_id, title, issue_number, volume, publisher,
cover_date, era, variant_type, confidence_score, estimated_grade_low,
estimated_grade_high, fmv_low, fmv_high, offer_low, offer_high,
significance, defects_noted, and flagged_for_review (boolean).

### C. Hidden Gems Feature

The \"Hidden Gems\" callout is a strategic trust-building feature. When
the AI identifies books that are unexpectedly valuable, these are
highlighted in a dedicated section of the PDF and on-screen report with
the header: \"Books You Might Not Know Are Valuable.\"

Criteria for flagging a hidden gem: the book\'s FMV exceeds \$50, AND
the book is not an obvious key issue that a casual seller would
recognize (i.e., not Action Comics #1 or Amazing Fantasy #15). Examples
include first cameo appearances in team books, newsstand variants of
common titles, and books with significance that requires collector
knowledge to recognize (e.g., Marvel Spotlight #5 as the first Ghost
Rider, or New Mutants #98 as the first Deadpool).

This feature generates enormous trust and word-of-mouth referrals. The
seller\'s experience of discovering value they did not know they had
creates a positive emotional association with the brand, even if they
ultimately choose not to sell. It is also highly shareable content for
social media and testimonials.

## VI. PAYMENT INFRASTRUCTURE

### A. Payment Rails

TheComicBuyers offers three payment methods, positioned in order of
speed:

-   **USDC (Stablecoin):** Primary recommended rail. Dollar-equivalent
    value, no volatility risk for the seller, settles in minutes.
    Delivered to the seller\'s wallet address or a custodial onboarding
    wallet if the seller is new to crypto. Positioned as \"instant
    payment\" in marketing materials.

-   **BTC (Bitcoin):** Optional alternative for sellers who prefer BTC
    exposure. Same-day delivery. The offer amount is denominated in USD
    and converted at the spot rate at the time of payment. The seller
    acknowledges volatility in the acceptance terms.

-   **ACH Bank Transfer:** Fallback for sellers who prefer traditional
    banking. Settlement in 1--3 business days. This is the slowest
    option and should be positioned as such to incentivize crypto
    adoption without excluding traditional sellers.

### B. Payment Flow

The payment process follows the appraisal and inspection workflow:

-   Seller submits collection through the tool and receives the
    preliminary appraisal and offer.

-   Seller accepts the preliminary offer via the confirmation link in
    their email.

-   The team contacts the seller to arrange physical inspection
    (in-person pickup for local collections, or shipping instructions
    with a prepaid label for remote collections).

-   Upon receiving the collection, the team performs physical
    verification against the appraisal. If the physical condition
    matches the AI estimate, the offer stands. If condition is
    materially different, an adjusted offer is presented.

-   Seller confirms final offer and selects payment method.

-   Payment is executed. USDC/BTC: same day. ACH: 1--3 business days.

### C. Crypto Onboarding for Non-Crypto Sellers

Many sellers, particularly estate executors and older collectors, will
have no crypto experience. The onboarding must be frictionless. Two
approaches:

-   **Direct-to-Exchange:** The seller provides their Coinbase, Kraken,
    or other exchange account email. Payment is sent directly. The
    seller can hold or convert to USD at their discretion.

-   **Guided Wallet Setup:** For sellers who want to receive crypto but
    have no account, provide a step-by-step guide (or a brief assisted
    phone call) to set up a Coinbase account. This adds 10--15 minutes
    to the process but opens the fastest payment rail.

The marketing message is always about speed, not about crypto. \"Get
paid in 48 hours\" is the headline. The payment mechanism is the
supporting detail, not the lead.

## VII. SITE ARCHITECTURE

### A. TheComicBuyers.com (Primary Domain)

This is the flagship acquisition site. Broad positioning: we buy comic
book collections. Optimized for search queries like \"sell my comic
books,\" \"comic book buyers near me,\" \"sell comic collection,\" and
\"how much are my comics worth.\"

**Page Structure**

-   **Homepage (/):** Hero section with value proposition, three-step
    process visual (Photograph → Appraise → Get Paid), trust indicators
    (years in business, books appraised, average payout time), and the
    primary CTA: \"Get Your Free Appraisal.\"

-   **How It Works (/how-it-works):** Detailed walkthrough of the
    process with screenshots or illustrations of each step. FAQ section
    addressing common seller concerns. Trust-building content: \"Your
    collection is evaluated by AI trained on decades of market data,
    then verified by experts with 30+ years of experience.\"

-   **Appraisal Tool (/appraise):** The core application. Photo upload
    interface, real-time identification feed, condition questionnaire,
    valuation results, and submission form. This page is the product.

-   **About (/about):** Origin story connecting to Legends of Superheros
    without naming The Corner Box. Emphasis on 30+ years in the
    industry, the expertise behind the AI, and the commitment to fair
    dealing.

-   **Service Areas (/areas):** Geographic landing pages for SEO:
    /areas/connecticut, /areas/massachusetts, /areas/new-york,
    /areas/new-jersey, /areas/pennsylvania, /areas/south-florida, etc.
    Each page targets local search queries: \"sell comic books in
    \[state/city\].\"

-   **Blog (/blog):** SEO content targeting informational queries: \"How
    much are my comic books worth,\" \"What to do with inherited comic
    books,\" \"Most valuable comic books from the 1970s,\" etc. Content
    strategy detailed in Section IX.

### B. EstateComics.com (Niche Domain)

Same core tool and backend as TheComicBuyers.com, reskinned with
messaging targeted specifically at estate executors, attorneys, and
inheritors. The tone is more formal and professional, emphasizing the
appraisal-as-documentation angle.

**Messaging Differences**

-   **Hero:** \"Professional Comic Book Appraisals for Estate
    Liquidation.\"

-   **Trust angle:** \"Our AI-generated appraisal reports are suitable
    for probate documentation and estate valuation.\"

-   **CTA:** \"Get Your Estate Appraisal\" rather than \"Get Your Free
    Appraisal.\"

-   **Service areas:** Same geographic pages but with estate-specific
    copy: \"Estate comic book appraisal services in Connecticut.\"

EstateComics.com should also include a dedicated \"For Attorneys\" page
targeting probate and estate attorneys who encounter comic collections
and need a reliable appraisal resource. This page is a referral
generator: attorneys who discover the tool become repeat referral
sources for every collection they encounter.

### C. Technical Stack

  ----------------------- -----------------------------------------------
  **COMPONENT**           **TECHNOLOGY**

  **Frontend**            Next.js (React) with Tailwind CSS. Server-side
                          rendering for SEO pages. Client-side rendering
                          for the appraisal tool.

  **Backend / API**       Next.js API routes or a lightweight
                          Node/Express server. Handles image processing,
                          Claude API calls, GoCollect API calls, and PDF
                          generation.

  **AI Engine**           Anthropic Claude API (multimodal) for image
                          identification and condition assessment.
                          Structured JSON output via system prompts.

  **Valuation Data**      GoCollect API for fair market value data.
                          Fallback: manual lookup table for books not in
                          GoCollect's database.

  **PDF Generation**      Puppeteer (headless Chrome) or a library like
                          pdf-lib for server-side PDF rendering.

  **Database**            PostgreSQL (via Supabase or Railway) for
                          storing appraisal records, user data, and
                          submission status.

  **File Storage**        Cloudflare R2 or AWS S3 for uploaded photos and
                          generated PDFs.

  **Email**               Resend or SendGrid for transactional emails
                          (confirmation, offer delivery). Klaviyo for
                          marketing sequences if cross-referencing with
                          The Corner Box CRM.

  **Hosting**             Vercel (Next.js native) for frontend and API.
                          Edge functions for image preprocessing.

  **Payments**            Circle (USDC), Strike or OpenNode (BTC), Stripe
                          (ACH/card). All connected through a unified
                          payment selection flow.
  ----------------------- -----------------------------------------------

## VIII. CHANNEL STRATEGY & REFERRAL NETWORK

### A. Referral Partners

The most scalable acquisition channel is not advertising; it is referral
partnerships with professionals who regularly encounter comic book
collections as part of their work. These partners become a recurring
source of qualified leads.

**Priority Partner Categories**

-   **Estate Attorneys & Probate Lawyers:** Every law firm that handles
    estates encounters personal property that needs valuation and
    liquidation. A one-page partner guide and a referral incentive (flat
    fee per qualified referral, or a percentage of the acquisition
    value) turns these attorneys into a distribution channel. Target: 50
    firms across the service area in Year 1.

-   **Estate Sale Companies:** Companies like MaxSold, EstateSales.net
    operators, and local estate liquidators frequently encounter comic
    collections they are not equipped to evaluate. A partnership where
    TheComicBuyers handles the comics and the estate sale company
    handles everything else is mutually beneficial. The estate company
    earns a referral fee and avoids the headache of pricing comics.

-   **Storage Facility Operators:** When storage units are abandoned or
    auctioned, the facility operator or buyer often encounters comics. A
    posted flyer or a digital referral link in the facility\'s
    communication to unit holders creates low-cost visibility.

-   **Moving Companies:** Downsizing moves are a trigger event for
    collection liquidation. A referral partnership with regional movers
    (particularly those specializing in senior moves) puts
    TheComicBuyers in front of sellers at the exact moment of decision.

-   **Senior Living / Downsizing Consultants:** A growing profession
    that assists aging individuals with transitioning to smaller living
    spaces. Comic collections are a common item that needs to be
    addressed. Referral partnership model is identical to estate
    attorneys.

### B. SEO Strategy

The blog and geographic landing pages are designed to capture three
types of search intent:

-   **Transactional:** \"Sell comic books \[city/state\],\" \"comic book
    buyers near me,\" \"how to sell inherited comics.\" These queries
    have direct purchase intent and should be targeted with service area
    pages and the homepage.

-   **Informational:** \"How much are my comic books worth,\" \"most
    valuable comics from the 1980s,\" \"are my old comics worth
    anything.\" These queries are top-of-funnel and should be captured
    with blog content that educates and funnels to the appraisal tool.

-   **Navigational:** \"TheComicBuyers,\" \"EstateComics appraisal.\"
    Brand searches after initial awareness. Ensure both domains rank #1
    for their brand terms.

### C. Paid Acquisition (Phase 2)

Once the organic foundation is established, targeted paid campaigns on
Google Ads and Meta can drive immediate submissions. The highest-intent
keywords (\"sell comic book collection,\" \"comic book appraisal\")
should be tested with small budgets to establish cost-per-submission
benchmarks before scaling.

Meta ads targeting users 50+ in the service area with messaging around
estate liquidation and downsizing can reach the inheritor and downsizer
segments effectively. Creative should emphasize ease and speed, not
comic book expertise (the target is the seller who does NOT know comics,
not the collector).

## IX. CONTENT STRATEGY

The blog on TheComicBuyers.com serves a single purpose: capture search
traffic from people who are considering selling comics and funnel them
to the appraisal tool. Every article should end with a natural CTA to
the tool. Content categories:

**Category 1: Value Guides**

\"The 25 Most Valuable Comic Books from the 1970s.\" \"Which Marvel
Comics from the 1990s Are Actually Worth Money?\" \"Golden Age Comics:
What Makes Them Valuable?\" These articles target the curiosity-driven
searcher who suspects they have valuable comics but does not know how to
confirm. Each article educates on what drives value (first appearances,
condition, variant scarcity) and ends with: \"Want to know what your
collection is worth? Use our free appraisal tool.\"

**Category 2: How-To Guides**

\"How to Sell an Inherited Comic Book Collection.\" \"What to Do When
You Find Comics in an Estate.\" \"How to Prepare Your Comics for
Appraisal.\" These target the process-oriented searcher who has already
decided to sell but does not know how. Practical, step-by-step content
that positions TheComicBuyers as the easiest path forward.

**Category 3: Local Service Pages**

\"Selling Comic Books in Connecticut: Your Complete Guide.\" \"Estate
Comic Book Appraisals in South Florida.\" These are SEO landing pages
disguised as informational content. Each targets a specific geographic
area with local keywords, local context (mention of local conventions,
shops, or collecting culture), and a direct CTA to the tool.

## X. METRICS & SUCCESS CRITERIA

### A. Primary KPIs

  ----------------------- ----------------------- -----------------------
  **METRIC**              **TARGET (MONTH 1--3)** **TARGET (MONTH
                                                  4--12)**

  **Appraisals            20--50 per month        100--250 per month
  Submitted**                                     

  **Offer Acceptance      25--35%                 35--50%
  Rate**                                          

  **Avg. Acquisition      \$500--\$2,000 per      \$1,000--\$5,000 per
  Value**                 collection              collection

  **Time: Submission to   \< 24 hours             \< 12 hours (automated)
  Offer**                                         

  **Time: Acceptance to   \< 72 hours             \< 48 hours
  Payment**                                       

  **Referral Partner      10--20 partners         50+ partners
  Signups**                                       
  ----------------------- ----------------------- -----------------------

### B. Secondary KPIs

-   AI identification accuracy rate (target: 90%+ for mainstream titles)

-   Photo rejection rate (photos too blurry or dark to process)

-   Conversion rate from appraisal view to submission

-   Organic search traffic growth (monthly)

-   Referral partner conversion rate (referrals that become
    acquisitions)

-   Net Promoter Score from sellers post-transaction

-   Percentage of acquired books that qualify for Corner Box drops

## XI. DEVELOPMENT PHASES

#### Phase 1: MVP (Weeks 1--4)

The minimum viable product focuses on proving the core loop: photo
upload, AI identification, and appraisal output. No payment integration,
no referral system, no geographic landing pages.

-   Single-page web application with photo upload and AI identification

-   Claude API integration for cover identification and condition
    estimation

-   GoCollect API integration for FMV data

-   On-screen appraisal results with summary statistics

-   PDF generation and download

-   CSV export

-   Email submission to designated intake address

-   Basic landing page for TheComicBuyers.com

*Success criteria: 10 appraisals submitted; AI identifies \>80% of
mainstream titles correctly; PDF output is professional and usable.*

#### Phase 2: Full Platform (Weeks 5--8)

Expand the MVP into a complete acquisition platform with both domains
live, geographic SEO pages, and the full submission-to-offer workflow.

-   EstateComics.com launched with tailored messaging

-   Geographic landing pages for all target service areas

-   Rapid Scan Mode for mobile

-   Seller questionnaire for collection-level condition data

-   Hidden Gems feature

-   Unique reference numbers and QR codes on PDFs

-   Automated confirmation emails with PDF attachment

-   Blog launched with initial 10--15 SEO articles

-   Admin dashboard for reviewing and managing submissions

*Success criteria: 50 appraisals submitted; EstateComics.com generating
organic traffic; admin workflow functional.*

#### Phase 3: Payment & Referrals (Weeks 9--12)

Integrate payment rails and launch the referral partner program.

-   USDC payment integration (Circle)

-   BTC payment integration (Strike or OpenNode)

-   ACH payment integration (Stripe)

-   Referral partner portal with tracking codes and payout management

-   \"For Attorneys\" page on EstateComics.com

-   Partner one-pager (printable PDF for referral partners)

-   Automated offer calculation with manual override capability

*Success criteria: First 5 acquisitions completed with crypto payment;
10 referral partners onboarded; full loop from submission to payment
operational.*

#### Phase 4: Scale & Optimize (Months 4+)

-   Paid acquisition campaigns (Google Ads, Meta)

-   A/B testing between TheComicBuyers.com and EstateComics.com for
    conversion optimization

-   Advanced AI features: automatic resubmission prompts for low-quality
    photos, batch processing improvements, historical price trend data
    in appraisals

-   Testimonial and case study content from completed acquisitions

-   Integration with The Corner Box inventory system for seamless
    premium book routing

-   Expansion of geographic service areas based on demand data

## XII. RISK ASSESSMENT

  ---------------- ---------------- ------------ ------------------------------------
  **RISK**         **LIKELIHOOD**   **IMPACT**   **MITIGATION**

  AI misidentifies Medium           High         All offers contingent on physical
  books, leading                                 inspection. Conservative grading
  to inaccurate                                  bias. Human review for
  offers                                         low-confidence books. Offer
                                                 adjustment clause in terms.

  GoCollect API    Low              Medium       Build a fallback lookup table for
  unavailable or                                 the top 500 most commonly
  rate-limited                                   encountered books. Cache GoCollect
                                                 data for repeat titles.

  Sellers          Medium           Medium       Physical verification step before
  misrepresent                                   payment. Offer adjustment clause.
  condition                                      Seller attestation in terms of
                                                 service.

  Low submission   Medium           Medium       Referral partner outreach in
  volume at launch                               parallel with site launch. Seed blog
                                                 content for SEO before tool goes
                                                 live. Consider a soft launch with
                                                 the Legends customer base.

  Crypto payment   Medium           Low          ACH always available as fallback.
  friction deters                                Crypto positioned as speed
  sellers                                        advantage, never as requirement.
                                                 Guided onboarding for first-time
                                                 crypto users.

  Regulatory       Low              High         Use regulated providers (Circle,
  scrutiny on                                    Coinbase, Strike). Maintain KYC/AML
  crypto payments                                compliance for transactions above
                                                 thresholds. Legal counsel review of
                                                 payment terms.
  ---------------- ---------------- ------------ ------------------------------------

**END OF DOCUMENT**

TheComicBuyers.com \| EstateComics.com

Powered by Legends of Superheros • Est. 1993
