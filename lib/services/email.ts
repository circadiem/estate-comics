// Task 9 — Transactional email service via Resend
// Templates: seller confirmation (offer summary + next steps)
//            internal notification (full details + PDF/CSV attachments)
// Source: Implementation Spec §XI

import { Resend } from 'resend';
import type { ReportData } from '@/lib/types/report';
import { MIN_COLLECTION_SIZE, OFFER_VALIDITY_DAYS } from '@/lib/config/constants';
import { isBelowMinimum } from '@/lib/utils/collection-size';
import { selectHiddenGems } from '@/lib/services/offer';

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
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n < 1 ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function offerExpiry(submittedAt: string): string {
  const d = new Date(submittedAt);
  d.setDate(d.getDate() + OFFER_VALIDITY_DAYS);
  return fmtDate(d.toISOString());
}

// ---------------------------------------------------------------------------
// Seller confirmation template
// ---------------------------------------------------------------------------

function sellerConfirmationHtml(data: ReportData): string {
  const { reference_number, generated_at, seller, summary } = data;
  const hiddenGems = summary.hidden_gems_count;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr><td style="background:#111827;padding:32px 40px;">
          <p style="margin:0;color:#9ca3af;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">TheComicBuyers.com</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Appraisal Submitted</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi ${seller.name},</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Thank you for submitting your comic book collection for appraisal. We've received
            your information and our team will be in touch within <strong>1–2 business days</strong>
            to discuss next steps.
          </p>

          <!-- Reference -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Reference Number</p>
              <p style="margin:0;color:#111827;font-size:18px;font-weight:700;font-family:monospace;">${reference_number}</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Submitted ${fmtDate(generated_at)}</p>
            </td></tr>
          </table>

          <!-- Offer summary -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 4px;color:#166534;font-size:13px;font-weight:600;">Estimated Cash Offer</p>
              <p style="margin:0 0 4px;color:#14532d;font-size:28px;font-weight:800;">${fmt(summary.total_offer_low)} – ${fmt(summary.total_offer_high)}</p>
              <p style="margin:0;color:#15803d;font-size:12px;">Based on ${summary.total_books_identified} identified book${summary.total_books_identified !== 1 ? 's · ' : ' · '}FMV estimate ${fmt(summary.total_fmv_low)}–${fmt(summary.total_fmv_high)}</p>
            </td></tr>
          </table>

          <!-- Collection highlights -->
          <table width="100%" cellpadding="12" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="33%" align="center" style="border:1px solid #e5e7eb;border-radius:6px;">
                <p style="margin:0;color:#6b7280;font-size:11px;">Books Identified</p>
                <p style="margin:4px 0 0;color:#111827;font-size:20px;font-weight:700;">${summary.total_books_identified}</p>
              </td>
              <td width="4%"></td>
              <td width="30%" align="center" style="border:1px solid #e5e7eb;border-radius:6px;">
                <p style="margin:0;color:#6b7280;font-size:11px;">Key Issues</p>
                <p style="margin:4px 0 0;color:#111827;font-size:20px;font-weight:700;">${summary.key_issues_count}</p>
              </td>
              <td width="4%"></td>
              <td width="29%" align="center" style="border:1px solid #e5e7eb;border-radius:6px;">
                <p style="margin:0;color:#6b7280;font-size:11px;">Hidden Gems</p>
                <p style="margin:4px 0 0;color:#111827;font-size:20px;font-weight:700;">${hiddenGems}</p>
              </td>
            </tr>
          </table>

          <!-- Next steps -->
          <h2 style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:700;">What happens next</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${[
              ['1', 'Our team reviews your appraisal', "We'll verify the AI identification and valuation within 1\u20132 business days."],
              ['2', 'We contact you to schedule', 'A team member will call or email to arrange a convenient pickup time.'],
              ['3', 'Verification and payment', 'We verify the books in person when we collect them, then pay within 48 hours by your preferred method. Offers are contingent on that inspection and valid for 14 days.'],
            ]
              .map(
                ([num, title, body]) => `
            <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td width="32" valign="top" style="padding-top:2px;">
                  <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#111827;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:24px;">${num}</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 2px;color:#111827;font-size:13px;font-weight:600;">${title}</p>
                  <p style="margin:0;color:#6b7280;font-size:12px;">${body}</p>
                </td>
              </tr></table>
            </td></tr>`,
              )
              .join('')}
          </table>

          <!-- Offer validity -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-bottom:32px;">
            <tr><td style="padding:12px 16px;">
              <p style="margin:0;color:#92400e;font-size:12px;">
                <strong>Offer valid until ${offerExpiry(generated_at)}.</strong>
                This estimate is contingent on in-person verification of condition and authenticity.
              </p>
            </td></tr>
          </table>

          <p style="margin:0 0 4px;color:#374151;font-size:13px;">Questions? Reply to this email or call us at <strong>(800) 555-COMIC</strong>.</p>
          <p style="margin:0;color:#374151;font-size:13px;">— The TheComicBuyers Team</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
            TheComicBuyers.com · New England &amp; Mid-Atlantic · South Florida<br>
            This offer is non-binding and subject to in-person review.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Internal notification template
// ---------------------------------------------------------------------------

function internalNotificationHtml(data: ReportData): string {
  const { reference_number, generated_at, seller, adjustment, summary } = data;
  const below_minimum = isBelowMinimum(seller.estimated_count);
  const keyBooks = data.books.filter((b) => b.adjusted_offer.tier === 'key_issues');
  const hiddenGems = selectHiddenGems(data.books);

  const eraSummary = Object.entries(summary.breakdown_by_era)
    .filter(([, count]) => count > 0)
    .map(([era, count]) => `${era.charAt(0).toUpperCase() + era.slice(1)}: ${count}`)
    .join(' · ');

  const topPubs = Object.entries(summary.breakdown_by_publisher)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pub, count]) => `${pub} (${count})`)
    .join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr><td style="background:#1e3a5f;padding:24px 32px;">
          <p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">Internal · New Submission</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;">${reference_number}</h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${seller.name} · ${seller.city}, ${seller.state} · ${fmtDate(generated_at)}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px;">

          <!-- Offer -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td width="48%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 16px;">
                <p style="margin:0 0 2px;color:#166534;font-size:11px;font-weight:600;">TOTAL ADJUSTED OFFER</p>
                <p style="margin:0;color:#14532d;font-size:22px;font-weight:800;">${fmt(summary.total_offer_low)} – ${fmt(summary.total_offer_high)}</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;">
                <p style="margin:0 0 2px;color:#6b7280;font-size:11px;font-weight:600;">TOTAL FMV ESTIMATE</p>
                <p style="margin:0;color:#111827;font-size:22px;font-weight:700;">${fmt(summary.total_fmv_low)} – ${fmt(summary.total_fmv_high)}</p>
              </td>
            </tr>
          </table>

          <!-- Collection stats -->
          <h2 style="margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Collection</h2>
          <table width="100%" cellpadding="6" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:20px;font-size:13px;">
            <tr><td style="color:#6b7280;width:40%;">Total books</td><td style="color:#111827;font-weight:600;">${summary.total_books_identified}${summary.total_books_flagged > 0 ? ` (${summary.total_books_flagged} flagged)` : ''}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Key issues</td><td style="color:#111827;font-weight:600;">${summary.key_issues_count}</td></tr>
            <tr><td style="color:#6b7280;">Hidden gems</td><td style="color:#111827;font-weight:600;">${hiddenGems.length}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Bulk lot</td><td style="color:#111827;font-weight:600;">${summary.bulk_lot_count}</td></tr>
            <tr><td style="color:#6b7280;">Era breakdown</td><td style="color:#111827;">${eraSummary || 'N/A'}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Top publishers</td><td style="color:#111827;">${topPubs || 'N/A'}</td></tr>
          </table>

          <!-- Seller info -->
          <h2 style="margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Seller</h2>
          <table width="100%" cellpadding="6" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:20px;font-size:13px;">
            <tr><td style="color:#6b7280;width:40%;">Name</td><td style="color:#111827;font-weight:600;">${seller.name}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Email</td><td style="color:#111827;">${seller.email}</td></tr>
            <tr><td style="color:#6b7280;">Phone</td><td style="color:#111827;">${seller.phone}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Location</td><td style="color:#111827;">${seller.city}, ${seller.state} ${seller.zip}</td></tr>
            <tr><td style="color:#6b7280;">Est. count</td><td style="color:#111827;">${seller.estimated_count} books</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Below minimum</td><td style="color:${below_minimum ? '#dc2626' : '#16a34a'};font-weight:600;">${below_minimum ? `YES — ${seller.estimated_count} of ${MIN_COLLECTION_SIZE} (soft gate, operator decides)` : 'No'}</td></tr>
            <tr><td style="color:#6b7280;">Pickup</td><td style="color:#111827;">${seller.pickup_available ? 'Available' : 'Seller delivers'}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Timeline</td><td style="color:#111827;">${seller.timeline}</td></tr>
            ${seller.notes ? `<tr><td style="color:#6b7280;">Notes</td><td style="color:#111827;">${seller.notes}</td></tr>` : ''}
          </table>

          <!-- Storage & adjustment -->
          <h2 style="margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Storage & Adjustment</h2>
          <table width="100%" cellpadding="6" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:20px;font-size:13px;">
            <tr><td style="color:#6b7280;width:40%;">Storage type</td><td style="color:#111827;">${seller.storage_type}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Storage location</td><td style="color:#111827;">${seller.storage_location}</td></tr>
            <tr><td style="color:#6b7280;">FMV multiplier</td><td style="color:#111827;font-weight:600;">×${adjustment.fmv_multiplier.toFixed(3)}</td></tr>
            <tr style="background:#fff;"><td style="color:#6b7280;">Restoration flag</td><td style="color:${adjustment.restoration_flag ? '#dc2626' : '#16a34a'};font-weight:600;">${adjustment.restoration_flag ? 'YES — review required' : 'No'}</td></tr>
          </table>

          ${
            keyBooks.length > 0
              ? `<!-- Key issues -->
          <h2 style="margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Key Issues (${keyBooks.length})</h2>
          <table width="100%" cellpadding="6" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:20px;font-size:12px;">
            <tr style="background:#e8e0f0;"><td style="font-weight:600;color:#4b5563;">Title</td><td style="font-weight:600;color:#4b5563;">#</td><td style="font-weight:600;color:#4b5563;">Grade</td><td style="font-weight:600;color:#4b5563;">FMV</td><td style="font-weight:600;color:#4b5563;">Offer</td></tr>
            ${keyBooks
              .map(
                (b, i) =>
                  `<tr style="${i % 2 ? 'background:#fff;' : ''}"><td>${b.identification.title}</td><td>${b.identification.issue_number}</td><td>${b.condition.grade_low.toFixed(1)}–${b.condition.grade_high.toFixed(1)}</td><td>${fmt(b.valuation.fmv_low)}–${fmt(b.valuation.fmv_high)}</td><td style="font-weight:600;">${fmt(b.adjusted_offer.offer_low)}–${fmt(b.adjusted_offer.offer_high)}</td></tr>`,
              )
              .join('')}
          </table>`
              : ''
          }

          ${
            hiddenGems.length > 0
              ? `<!-- Hidden gems -->
          <h2 style="margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Hidden Gems (${hiddenGems.length})</h2>
          <table width="100%" cellpadding="6" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:20px;font-size:12px;">
            <tr style="background:#dcfce7;"><td style="font-weight:600;color:#4b5563;">Title</td><td style="font-weight:600;color:#4b5563;">FMV</td><td style="font-weight:600;color:#4b5563;">Why</td></tr>
            ${hiddenGems
              .map(
                (b, i) =>
                  `<tr style="${i % 2 ? 'background:#fff;' : ''}"><td>${b.identification.title} #${b.identification.issue_number}</td><td>${fmt(b.valuation.fmv_low)}–${fmt(b.valuation.fmv_high)}</td><td style="color:#166534;">${b.valuation.hidden_gem_explanation ?? ''}</td></tr>`,
              )
              .join('')}
          </table>`
              : ''
          }

          <p style="margin:0;color:#6b7280;font-size:12px;">Full PDF report and CSV inventory are attached.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Internal use only · TheComicBuyers.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
    subject: `Your Comic Collection Appraisal — ${reference_number}`,
    html: sellerConfirmationHtml(data),
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
    subject: `${below_minimum ? '[BELOW MINIMUM] ' : ''}New Submission: ${reference_number} — ${seller.name} — ${seller.city}, ${seller.state}`,
    html: internalNotificationHtml(data),
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
