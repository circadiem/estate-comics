// Transactional email service via Resend — Provenance treatment
// Templates: seller confirmation (offer summary + next steps)
//            internal notification (full details + PDF/CSV attachments)
// Source: Implementation Spec §XI; brand: docs/04-brand-provenance.md

import { Resend } from 'resend';
import type { ReportData } from '@/lib/types/report';
import { MIN_COLLECTION_SIZE, OFFER_VALIDITY_DAYS } from '@/lib/config/constants';
import { isBelowMinimum } from '@/lib/utils/collection-size';
import { selectHiddenGems } from '@/lib/services/offer';
import { provenance } from '@/design/tailwind.tokens';

// ---------------------------------------------------------------------------
// Client (lazy — only instantiated on first use so missing key = runtime err)
// ---------------------------------------------------------------------------

function requireEnv(name: 'RESEND_API_KEY' | 'FROM_EMAIL' | 'INTAKE_EMAIL'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

function getResend(): Resend {
  return new Resend(requireEnv('RESEND_API_KEY'));
}

/**
 * Sender and intake addresses. Env-only — there is deliberately no fallback
 * address. A misconfigured deployment must fail loudly at first send, exactly
 * as it does for a missing Resend key, rather than route leads to a retired
 * mailbox.
 */
function getEmailConfig(): { from: string; intake: string } {
  return { from: requireEnv('FROM_EMAIL'), intake: requireEnv('INTAKE_EMAIL') };
}

// ---------------------------------------------------------------------------
// Provenance email shell
//
// Every colour below is a token from design/tailwind.tokens.ts. Fonts: the
// brand families are requested via a <link> for clients that honour it (Apple
// Mail, iOS); everything else falls back to Georgia (display) and the system
// sans (body), which is the fallback stack the tokens define. Layout is
// table-based inline CSS for client compatibility. No shadows, no gradients,
// 2px radius, antique-gold hairlines as the only structural device.
// ---------------------------------------------------------------------------

const c = provenance.colors;
const DISPLAY = `'Cormorant Garamond', Georgia, 'Times New Roman', serif`;
const BODY = `'Nunito Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;
const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">';

const TAGLINE = 'Every collection has a story. We honor it.';
const FOOTER_LINE = 'Estate Comics · Powered by Legends of Superheros · Est. 1993';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape seller-supplied text before it lands in HTML. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(n: number): string {
  return n < 1 ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString('en-US')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function offerExpiry(submittedAt: string): string {
  const d = new Date(submittedAt);
  d.setDate(d.getDate() + OFFER_VALIDITY_DAYS);
  return fmtDate(d.toISOString());
}

const textBody = `font-family:${BODY};font-size:16px;line-height:1.65;color:${c.charcoalBrown};`;
const textSm = `font-family:${BODY};font-size:14px;line-height:1.55;color:${c.umber};`;
const textLabel = `font-family:${BODY};font-size:13px;line-height:1.4;font-weight:600;color:${c.umber};`;
const refStyle = `font-family:${BODY};font-size:15px;font-weight:600;letter-spacing:0.04em;color:${c.charcoalBrown};`;
const h2 = `font-family:${DISPLAY};font-size:23px;line-height:1.3;font-weight:600;color:${c.darkUmber};margin:0;`;
const hairline = `<tr><td style="height:1px;background:${c.antiqueGold};font-size:0;line-height:0;">&nbsp;</td></tr>`;

function wordmark(): string {
  return `
    <tr><td style="height:4px;background:${c.darkUmber};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td align="center" style="padding:28px 40px 22px;">
      <div style="font-family:${DISPLAY};font-size:27px;line-height:1;font-weight:700;color:${c.charcoalBrown};letter-spacing:-0.01em;">EstateComics</div>
      <div style="width:150px;height:1px;background:${c.antiqueGold};margin:9px auto 8px;font-size:0;line-height:0;">&nbsp;</div>
      <div style="font-family:${DISPLAY};font-style:italic;font-size:13px;color:${c.patina};letter-spacing:0.02em;">Professional Comic Book Estate Services</div>
    </td></tr>`;
}

function footer(extra: string): string {
  return `
    <tr><td style="padding:20px 40px 26px;border-top:1px solid ${c.bisque};">
      <p style="margin:0 0 4px;font-family:${DISPLAY};font-style:italic;font-size:15px;color:${c.patina};text-align:center;">${TAGLINE}</p>
      <p style="margin:0;font-family:${BODY};font-size:12px;line-height:1.5;color:${c.patina};text-align:center;">${FOOTER_LINE}<br>${extra}</p>
    </td></tr>`;
}

function shell(title: string, width: number, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(title)}</title>
${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:${c.vellum};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.vellum};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%;background:${c.ivory};border:1px solid ${c.bisque};border-radius:2px;">
        ${wordmark()}
        ${inner}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Ivory card with the antique-gold top rule. */
function statCard(label: string, figure: string, sub?: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${c.bisque};border-top:2px solid ${c.antiqueGold};border-radius:2px;background:${c.ivory};">
      <tr><td style="padding:16px 18px;">
        <div style="${textLabel}font-weight:400;">${label}</div>
        <div style="font-family:${DISPLAY};font-size:29px;line-height:1.1;font-weight:600;color:${c.darkUmber};margin-top:4px;">${figure}</div>
        ${sub ? `<div style="${textSm}margin-top:4px;">${sub}</div>` : ''}
      </td></tr>
    </table>`;
}

function sectionHead(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 12px;">
      <tr><td style="padding-bottom:6px;"><h2 style="${h2}">${text}</h2></td></tr>
      ${hairline}
    </table>`;
}

/** Key/value rows: label umber, value charcoal, zebra vellum/bisque. */
function kvTable(rows: [string, string][]): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${c.bisque};border-radius:2px;">
      ${rows
        .map(
          ([k, v], i) => `<tr style="background:${i % 2 ? c.bisque : c.vellum};">
        <td style="padding:9px 14px;width:40%;${textSm}">${k}</td>
        <td style="padding:9px 14px;${textBody}font-size:14px;">${v}</td>
      </tr>`,
        )
        .join('')}
    </table>`;
}

// ---------------------------------------------------------------------------
// Seller confirmation
// ---------------------------------------------------------------------------

export function renderSellerConfirmationHtml(data: ReportData): string {
  const { reference_number, generated_at, seller, summary } = data;
  const gems = summary.hidden_gems_count;
  const steps: [string, string][] = [
    ['We review your appraisal', 'A member of our team checks every identification and value within 1–2 business days.'],
    ['We arrange a time', 'We call or email to schedule a collection time that suits you.'],
    ['Verification and payment', 'We verify the books in person when we collect them, then pay within 48 hours by your preferred method. Offers are contingent on that inspection and valid for 14 days.'],
  ];

  const inner = `
    <tr><td style="padding:8px 40px 0;">
      <p style="${textBody}margin:0 0 20px;">Dear ${esc(seller.name)},</p>
      <p style="${textBody}margin:0 0 24px;">
        Thank you for entrusting us with your collection. We have received your submission and
        the appraisal report is attached to your download; the same figures are summarised below.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.vellum};border:1px solid ${c.bisque};border-radius:2px;margin-bottom:20px;">
        <tr><td style="padding:14px 18px;">
          <div style="${textLabel}">Reference number</div>
          <div style="${refStyle}margin-top:2px;">${reference_number}</div>
          <div style="${textSm}margin-top:2px;">Submitted ${fmtDate(generated_at)}</div>
        </td></tr>
      </table>

      ${statCard(
        'Cash offer range',
        `${fmt(summary.total_offer_low)} – ${fmt(summary.total_offer_high)}`,
        `Based on ${summary.total_books_identified} identified ${summary.total_books_identified === 1 ? 'book' : 'books'} · fair market value ${fmt(summary.total_fmv_low)} – ${fmt(summary.total_fmv_high)}`,
      )}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border:1px solid ${c.bisque};border-radius:2px;">
        <tr>
          <td width="34%" style="padding:12px 14px;border-right:1px solid ${c.bisque};">
            <div style="${textLabel}font-weight:400;">Books appraised</div>
            <div style="font-family:${DISPLAY};font-size:23px;font-weight:600;color:${c.darkUmber};">${summary.total_books_identified}</div>
          </td>
          <td width="33%" style="padding:12px 14px;border-right:1px solid ${c.bisque};">
            <div style="${textLabel}font-weight:400;">Key issues</div>
            <div style="font-family:${DISPLAY};font-size:23px;font-weight:600;color:${c.darkUmber};">${summary.key_issues_count}</div>
          </td>
          <td width="33%" style="padding:12px 14px;">
            <div style="${textLabel}font-weight:400;">Hidden gems</div>
            <div style="font-family:${DISPLAY};font-size:23px;font-weight:600;color:${c.darkUmber};">${gems}</div>
          </td>
        </tr>
      </table>

      ${sectionHead('What happens next')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${steps
          .map(
            ([title, body], i) => `
        <tr>
          <td valign="top" width="36" style="padding:6px 0 14px;">
            <div style="width:24px;height:24px;border-radius:2px;background:${c.darkUmber};color:${c.vellum};font-family:${BODY};font-size:12px;font-weight:700;text-align:center;line-height:24px;">${i + 1}</div>
          </td>
          <td valign="top" style="padding:6px 0 14px;">
            <div style="${textBody}font-size:15px;font-weight:600;">${title}</div>
            <div style="${textSm}">${body}</div>
          </td>
        </tr>`,
          )
          .join('')}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bisque};border-radius:2px;margin:8px 0 28px;">
        <tr><td style="padding:12px 16px;${textBody}font-size:14px;">
          <strong>Offer valid until ${offerExpiry(generated_at)}.</strong>
          Every figure in this appraisal is an estimate from photographs and is confirmed by physical inspection before any offer is final.
        </td></tr>
      </table>

      <p style="${textBody}font-size:15px;margin:0 0 4px;">Questions at any point? Reply to this email — it reaches us directly.</p>
      <p style="${textBody}font-size:15px;margin:0 0 28px;">— Estate Comics</p>
    </td></tr>
    ${footer('This appraisal is preliminary and subject to physical verification.')}`;

  return shell(`Your appraisal — ${reference_number}`, 600, inner);
}

// ---------------------------------------------------------------------------
// Internal notification
// ---------------------------------------------------------------------------

export function renderInternalNotificationHtml(data: ReportData): string {
  const { reference_number, generated_at, seller, adjustment, summary } = data;
  const below_minimum = isBelowMinimum(seller.estimated_count);
  const keyBooks = data.books
    .filter((b) => b.adjusted_offer.tier === 'key_issues')
    .sort((a, b) => b.valuation.fmv_midpoint - a.valuation.fmv_midpoint);
  const hiddenGems = selectHiddenGems(data.books);

  const eraSummary = Object.entries(summary.breakdown_by_era)
    .filter(([, n]) => n > 0)
    .map(([era, n]) => `${era.charAt(0).toUpperCase() + era.slice(1)} ${n}`)
    .join(' · ');
  const topPubs = Object.entries(summary.breakdown_by_publisher)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pub, n]) => `${esc(pub)} (${n})`)
    .join(', ');

  const flag = (on: boolean, yes: string, no = 'No') =>
    on
      ? `<span style="color:${c.mutedRed};font-weight:600;">${yes}</span>`
      : `<span style="color:${c.charcoalBrown};">${no}</span>`;

  const bookTable = (rows: string[], head: string[]) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${BODY};font-size:13px;line-height:1.45;color:${c.charcoalBrown};">
      <tr>${head.map((h, i) => `<th align="${i >= head.length - 2 ? 'right' : 'left'}" style="padding:6px 10px;font-weight:600;color:${c.darkUmber};border-bottom:1px solid ${c.antiqueGold};">${h}</th>`).join('')}</tr>
      ${rows.join('')}
    </table>`;
  const cell = (v: string, right = false) =>
    `<td align="${right ? 'right' : 'left'}" style="padding:8px 10px;${right ? 'white-space:nowrap;' : ''}">${v}</td>`;

  const inner = `
    <tr><td style="padding:0 40px;">
      <div style="${textLabel}text-transform:none;">Internal · New submission${below_minimum ? ` · <span style="color:${c.mutedRed};">below minimum</span>` : ''}</div>
      <div style="font-family:${DISPLAY};font-size:30px;line-height:1.2;font-weight:600;color:${c.darkUmber};margin-top:4px;">${reference_number}</div>
      <div style="${textSm}margin-top:2px;">${esc(seller.name)} · ${esc(seller.city)}, ${esc(seller.state)} · ${fmtDate(generated_at)}</div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
        <tr>
          <td width="49%" valign="top">${statCard('Adjusted offer', `${fmt(summary.total_offer_low)} – ${fmt(summary.total_offer_high)}`)}</td>
          <td width="2%"></td>
          <td width="49%" valign="top">${statCard('Fair market value', `${fmt(summary.total_fmv_low)} – ${fmt(summary.total_fmv_high)}`)}</td>
        </tr>
      </table>

      ${sectionHead('Collection')}
      ${kvTable([
        ['Books identified', `${summary.total_books_identified}${summary.total_books_flagged > 0 ? ` · <span style="color:${c.mutedRed};font-weight:600;">${summary.total_books_flagged} held for review</span>` : ''}`],
        ['Key issues', String(summary.key_issues_count)],
        ['Hidden gems', String(hiddenGems.length)],
        ['Bulk lot', String(summary.bulk_lot_count)],
        ['By era', eraSummary || '—'],
        ['Top publishers', topPubs || '—'],
      ])}

      ${sectionHead('Seller')}
      ${kvTable([
        ['Name', esc(seller.name)],
        ['Email', `<a href="mailto:${esc(seller.email)}" style="color:${c.darkUmber};">${esc(seller.email)}</a>`],
        ['Phone', esc(seller.phone)],
        ['Location', `${esc(seller.city)}, ${esc(seller.state)} ${esc(seller.zip)}`],
        ['Estimated count', `${seller.estimated_count} books`],
        ['Below minimum', flag(below_minimum, `Yes — ${seller.estimated_count} of ${MIN_COLLECTION_SIZE} (soft gate, operator decides)`)],
        ['Pickup', seller.pickup_available ? 'Available' : 'Seller delivers'],
        ['Timeline', esc(seller.timeline)],
        ...(seller.notes ? ([['Notes', esc(seller.notes)]] as [string, string][]) : []),
      ])}

      ${sectionHead('Storage and adjustment')}
      ${kvTable([
        ['Storage type', esc(seller.storage_type)],
        ['Storage location', esc(seller.storage_location)],
        ['FMV multiplier', `×${adjustment.fmv_multiplier.toFixed(3)}`],
        ['Restoration declared', flag(adjustment.restoration_flag, 'Yes — review required')],
      ])}

      ${
        keyBooks.length > 0
          ? sectionHead(`Key issues (${keyBooks.length})`) +
            bookTable(
              keyBooks.map(
                (b, i) => `<tr style="background:${i % 2 ? c.bisque : c.vellum};">
                ${cell(`<strong>${esc(b.identification.title)}</strong> #${esc(b.identification.issue_number)}`)}
                ${cell(`${b.condition.grade_low.toFixed(1)}–${b.condition.grade_high.toFixed(1)}`)}
                ${cell(`${fmt(b.valuation.fmv_low)}–${fmt(b.valuation.fmv_high)}`, true)}
                ${cell(`<strong>${fmt(b.adjusted_offer.offer_low)}–${fmt(b.adjusted_offer.offer_high)}</strong>`, true)}
              </tr>`,
              ),
              ['Book', 'Grade', 'FMV', 'Offer'],
            )
          : ''
      }

      ${
        hiddenGems.length > 0
          ? sectionHead(`Hidden gems (${hiddenGems.length})`) +
            bookTable(
              hiddenGems.map(
                (b, i) => `<tr style="background:${i % 2 ? c.bisque : c.vellum};">
                ${cell(`<strong>${esc(b.identification.title)}</strong> #${esc(b.identification.issue_number)}`)}
                ${cell(`<span style="color:${c.umber};">${esc(b.valuation.hidden_gem_explanation ?? '')}</span>`)}
                ${cell(`${fmt(b.valuation.fmv_low)}–${fmt(b.valuation.fmv_high)}`, true)}
                ${cell(`<strong>${fmt(b.adjusted_offer.offer_low)}–${fmt(b.adjusted_offer.offer_high)}</strong>`, true)}
              </tr>`,
              ),
              ['Book', 'Why it matters', 'FMV', 'Offer'],
            )
          : ''
      }

      <p style="${textSm}margin:28px 0 24px;">The full appraisal report (PDF) and the inventory (CSV) are attached.</p>
    </td></tr>
    ${footer('Internal notification — not for forwarding to the seller.')}`;

  return shell(`New submission ${reference_number}`, 680, inner);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send the seller confirmation email with their offer summary and next steps.
 * The PDF report is NOT attached here (large file for mobile); instead we
 * direct them to download from the appraisal tool.
 */
export async function sendSellerConfirmation(data: ReportData): Promise<void> {
  const resend = getResend();
  const { from } = getEmailConfig();
  const { seller, reference_number } = data;

  const { error } = await resend.emails.send({
    from,
    to: [seller.email],
    subject: `Your appraisal report — ${reference_number}`,
    html: renderSellerConfirmationHtml(data),
  });

  if (error) {
    throw new Error(`Resend seller email failed: ${error.message}`);
  }
}

/**
 * Send the internal ops notification with full details, PDF, and CSV attached.
 */
export async function sendInternalNotification(
  data: ReportData,
  pdfBuffer: Buffer,
  csv: string,
): Promise<void> {
  const resend = getResend();
  const { from, intake } = getEmailConfig();
  const { seller, reference_number } = data;
  const below_minimum = isBelowMinimum(seller.estimated_count);

  const { error } = await resend.emails.send({
    from,
    to: [intake],
    subject: `${below_minimum ? '[BELOW MINIMUM] ' : ''}New submission ${reference_number} — ${seller.name} — ${seller.city}, ${seller.state}`,
    html: renderInternalNotificationHtml(data),
    attachments: [
      {
        filename: `${reference_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      {
        filename: `${reference_number}.csv`,
        content: csv,
        contentType: 'text/csv',
      },
    ],
  });

  if (error) {
    throw new Error(`Resend internal email failed: ${error.message}`);
  }
}
