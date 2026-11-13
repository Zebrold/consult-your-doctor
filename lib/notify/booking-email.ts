import { formatINR } from '@/components/patient/format'
import type { BookingCard } from '@/lib/booking-card'
import { cardStamp } from '@/lib/booking-card-format'

// The booking email, in the same layout as the booking page (/book/confirmation/[id]): "Complete your payment to
// confirm" while the booking fee is unpaid (or a payment failed), "Your appointment is confirmed!" once it is paid.
// Email clients take tables and inline styles only, so this mirrors the page's look with those. The logo
// (cid:cydlogo) and the QR code (cid:bookingqr) travel as inline images attached by sendEmail.

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
const C = { ink: '#0B1B3F', muted: '#5B667A', blue: '#2A4DD0', orange: '#C2410C', line: '#D5DBE6', soft: '#F5F7FB', sky: '#EDF1F8' }
const money = (n: number) => formatINR(n).replace(/^₹([\d,]+)$/, '₹$1.00')

export const BOOKING_QR_CID = 'bookingqr'
/** The white stethoscope on the follow-up banner (public/logo-icon-white.png). */
export const WHITE_LOGO_CID = 'stethoscopewhite'

export function bookingEmailSubject(card: BookingCard, failed: boolean) {
  const what = card.kind === 'consultation' ? `${card.title}${card.when ? `, ${card.when.split(' | ')[1] ?? card.when}` : ''}` : 'your lab tests'
  if (card.state === 'confirmed') return `Confirmed: ${what} (Booking ${card.code})`
  if (failed) return `Payment didn't go through: complete it to keep ${what}`
  return `Complete your payment to confirm ${what}`
}

/** The booking email's HTML. `failureReason` is set when an online payment failed or was cancelled. */
export function buildBookingEmailHtml(card: BookingCard, opts: { failureReason?: string | null } = {}): string {
  const confirmed = card.state === 'confirmed'
  const isLab = card.kind === 'lab'
  const headline = confirmed ? (isLab ? 'Your lab booking is confirmed!' : 'Your appointment is confirmed!') : 'Complete your payment to confirm'
  const headColor = confirmed ? C.blue : C.orange
  const label = (t: string) => `<div style="${FONT}font-size:11px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:${C.muted};">${esc(t)}</div>`
  const dashed = `<tr><td colspan="3" style="padding:0;"><div style="border-top:1.5px dashed ${C.line};font-size:0;line-height:0;">&nbsp;</div></td></tr>`

  const image = card.image
    ? `<img src="${esc(card.image)}" width="84" height="112" alt="" style="display:block;width:84px;height:112px;object-fit:cover;border-radius:10px;border:0;" />`
    : `<div style="width:84px;height:112px;border-radius:10px;background:#E3E9F4;"></div>`

  const qr = confirmed
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:12px;padding:6px;"><img src="cid:${BOOKING_QR_CID}" width="96" height="96" alt="Booking QR code" style="display:block;width:96px;height:96px;border:0;" /></td></tr><tr><td align="center" style="${FONT}font-size:11px;font-weight:700;color:${C.muted};padding-top:6px;">Scan at desk</td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td align="center" valign="middle" width="104" height="104" style="width:104px;height:104px;background:#ffffff;border:1px solid ${C.line};border-radius:12px;${FONT}font-size:11px;font-weight:700;line-height:1.35;color:${C.muted};padding:6px;">QR code appears after payment</td></tr></table>`

  const ticketFacts = isLab
    ? `<td width="50%" style="padding:16px 0 16px 24px;">${label('Visit on')}<div style="${FONT}font-size:15px;font-weight:800;color:${C.ink};padding-top:4px;">${esc(card.when ?? 'To be confirmed')}</div></td>
       <td width="50%" style="padding:16px 24px 16px 0;">${label(confirmed ? 'Status' : 'Status')}<div style="${FONT}font-size:15px;font-weight:800;color:${confirmed ? C.blue : C.orange};padding-top:4px;">${confirmed ? 'Booked' : 'Payment pending'}</div></td>`
    : confirmed
      ? `<td style="padding:16px 0 16px 24px;" width="22%">${label('Token')}<div style="${FONT}font-size:30px;font-weight:800;color:${C.blue};line-height:1.1;padding-top:2px;">${esc(card.token)}</div></td>
         <td style="padding:16px 0;" width="30%">${label('Report by')}<div style="${FONT}font-size:15px;font-weight:800;color:${C.ink};padding-top:4px;">${esc(card.reportBy ?? '-')}</div></td>
         <td align="right" style="padding:16px 24px 16px 0;"><div style="display:inline-block;border:2px solid ${C.blue};border-radius:8px;padding:5px 10px;transform:rotate(-8deg);${FONT}color:${C.blue};text-align:center;"><div style="font-size:8.5px;font-weight:800;letter-spacing:1.4px;">&#9733; CONSULT YOUR DOCTOR &#9733;</div><div style="font-size:12.5px;font-weight:800;letter-spacing:0.6px;">BOOKING<br />CONFIRMED</div></div></td>`
      : `<td style="padding:16px 0 16px 24px;" width="40%">${label('Status')}<div style="${FONT}font-size:15px;font-weight:800;color:${C.orange};padding-top:4px;">${card.state === 'cancelled' ? 'Cancelled' : 'Payment pending'}</div></td>
         <td style="padding:16px 24px 16px 0;">${label('Report by')}<div style="${FONT}font-size:15px;font-weight:800;color:${C.ink};padding-top:4px;">${esc(card.reportBy ?? '-')}</div></td>`

  const message = confirmed
    ? isLab
      ? 'Show the QR code at the lab front desk when you arrive.'
      : 'Show the QR code or token at the hospital front desk when you arrive.'
    : card.holdUntil
      ? `Your slot is held for 30 minutes. Pay the booking fee to get your token and QR code.`
      : 'Pay the booking fee to confirm your booking and get your QR code.'
  const button = confirmed
    ? { text: isLab ? 'Open booking' : 'Open appointment', href: card.links.appointment }
    : { text: `Pay ${formatINR(card.amount)} now`, href: card.links.checkout }

  const failure = !confirmed && opts.failureReason
    ? `<tr><td style="padding:0 24px 14px;"><div style="background:#FEF3F2;border:1px solid #FECDCA;border-radius:10px;padding:10px 12px;${FONT}font-size:13px;line-height:1.45;color:#B42318;"><b>Your last payment didn't go through.</b> ${esc(opts.failureReason)} No money was taken for it; you can try again.</div></td></tr>`
    : ''

  const followUp = card.followUp
    ? `<tr><td style="padding:14px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.blue};border-radius:14px;"><tr><td style="padding:18px 22px;${FONT}color:#ffffff;"><div style="font-size:18px;font-weight:800;">Free follow-up for ${card.followUp.days} days</div><div style="font-size:13.5px;line-height:1.5;padding-top:4px;color:#E6ECFF;">Need to see ${esc(card.followUp.doctor)} again about the same problem? Book a follow-up in the app within ${card.followUp.days} days at no booking fee.</div></td><td width="76" align="right" valign="middle" style="padding:0 22px 0 0;"><img src="cid:${WHITE_LOGO_CID}" width="54" height="54" alt="" style="display:block;width:54px;height:54px;border:0;" /></td></tr></table></td></tr>`
    : ''

  const note = isLab
    ? 'Please carry a photo ID and your doctor&#39;s prescription if you have one. The test charges are paid at the lab. In an emergency, call 108.'
    : card.venueTitle === 'PAID AT HOSPITAL'
      ? 'Please carry a photo ID and any previous reports. In an emergency, call 108.'
      : 'Please carry a photo ID and any previous reports. The consultation fee is paid at the hospital counter. In an emergency, call 108.'

  const row = (l: string, r: string, strong = false) =>
    `<tr><td style="${FONT}font-size:13.5px;padding:4px 0;color:${strong ? C.ink : C.muted};font-weight:${strong ? 800 : 500};${strong ? 'letter-spacing:0.3px;' : ''}">${l}</td><td align="right" style="${FONT}font-size:13.5px;padding:4px 0;color:${strong ? C.ink : C.muted};font-weight:${strong ? 800 : 500};">${r}</td></tr>`
  const venueRows =
    card.venueItems.length > 1
      ? card.venueItems.map((i) => row(esc(i.label), i.amount != null ? money(i.amount) : '-')).join('') + row('Paid at', esc(card.venueNote))
      : row(esc(card.venueItems[0]?.label ?? 'Consultation fee'), esc(card.venueNote))

  const summary = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E3E8F0;border-radius:12px;border-collapse:separate;">
      <tr><td style="padding:16px 20px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row(card.isFollowUp ? 'BOOKING FEE (FREE FOLLOW-UP)' : 'BOOKING FEE', money(card.bookingFee), true)}
        ${card.bookingFeeLines.map((l) => row(esc(l.label), esc(l.value))).join('')}
        ${card.convenienceFee > 0 ? row('PAYMENT CONVENIENCE FEE', money(card.convenienceFee), true) : ''}
      </table></td></tr>
      ${card.venueTotal != null ? `<tr><td style="padding:0 20px;"><div style="border-top:1px dashed #E3E8F0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
      <tr><td style="padding:8px 20px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row(card.venueTitle, money(card.venueTotal), true)}
        ${venueRows}
      </table></td></tr>` : ''}
      <tr><td style="background:${C.sky};border-radius:0 0 12px 12px;padding:14px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="${FONT}font-size:15px;font-weight:800;color:${C.ink};">${card.amountLabel}</td><td align="right" style="${FONT}font-size:15px;font-weight:800;color:${C.ink};">${money(card.amount)}</td></tr>
      </table></td></tr>
    </table>`

  const patient = [card.patient.name, card.patient.ageSex].filter(Boolean).join(' · ')
  const fact = (l: string, v: string, color = C.ink) =>
    `<td width="50%" valign="top" style="padding:0 0 14px;">${`<div style="${FONT}font-size:12.5px;color:${C.muted};">${esc(l)}</div>`}<div style="${FONT}font-size:14px;font-weight:800;color:${color};padding-top:3px;">${esc(v)}</div></td>`
  const facts = confirmed
    ? `<tr>${fact('Booking date & time', cardStamp(card.bookedAt))}${fact('Payment type', card.paymentType ?? 'Online')}</tr><tr>${fact('Transaction ID', card.transactionId ?? card.code)}${fact('Patient', patient)}</tr>`
    : `<tr>${card.holdUntil ? fact('Slot held until', cardStamp(card.holdUntil), C.orange) : fact('Booked on', cardStamp(card.bookedAt))}${fact('Patient', patient)}</tr>`

  const link = (text: string, href: string | null) =>
    href ? `<a href="${esc(href)}" target="_blank" style="${FONT}font-size:13.5px;font-weight:800;color:${C.blue};text-decoration:none;padding:0 10px;">${text}</a>` : ''

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(headline)}</title></head>
<body style="margin:0;padding:0;background:#EEF2F7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F7;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #E3E8F0;border-radius:14px;">
  <tr><td style="padding:26px 26px 6px;" align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:10px;"><img src="cid:cydlogo" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;" /></td>
      <td valign="middle" style="${FONT}font-size:22px;font-weight:800;color:${C.ink};">Consult your Doctor</td>
    </tr></table>
    <div style="${FONT}font-size:22px;font-weight:800;color:${headColor};padding-top:18px;">${esc(headline)}</div>
    <div style="${FONT}font-size:14px;color:${C.muted};padding-top:6px;">Booking ID <b style="color:${C.ink};">${esc(card.code)}</b></div>
  </td></tr>

  <tr><td style="padding:18px 26px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.soft};border-radius:16px;border-collapse:separate;">
      <tr><td colspan="3" style="padding:22px 24px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" width="96" style="padding-right:14px;">${image}</td>
          <td valign="top" style="${FONT}">
            <div style="font-size:17px;font-weight:800;color:${C.ink};">${esc(card.title)}${card.verified ? ' <span style="color:#1D9BF0;">&#10004;</span>' : ''}</div>
            <div style="font-size:13.5px;font-weight:700;color:${C.blue};padding-top:3px;">${esc(card.subtitle)}</div>
            ${card.when ? `<div style="font-size:14px;font-weight:800;color:${C.ink};padding-top:8px;">${esc(card.when)}</div>` : ''}
            <div style="font-size:13px;line-height:1.5;color:${C.muted};padding-top:6px;">${[card.place, ...card.placeLines].map(esc).join('<br />')}</div>
            <div style="font-size:13.5px;font-weight:800;color:${C.ink};padding-top:8px;">${esc(card.typeLabel)}</div>
          </td>
          <td valign="top" width="112" style="padding-left:8px;">${qr}</td>
        </tr></table>
      </td></tr>
      ${dashed}
      <tr><td colspan="3"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${ticketFacts}</tr></table></td></tr>
      ${dashed}
      ${failure}
      <tr><td colspan="3" align="center" style="padding:16px 24px 22px;">
        <div style="${FONT}font-size:14px;line-height:1.5;color:${C.muted};max-width:400px;">${esc(message)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr><td align="center" style="background:${C.blue};border-radius:10px;">
          <a href="${esc(button.href)}" target="_blank" style="display:inline-block;padding:13px 60px;${FONT}font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;">${esc(button.text)}</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${followUp}</table></td></tr>

  <tr><td style="padding:14px 26px 0;"><div style="background:${C.soft};border-radius:10px;padding:12px 16px;${FONT}font-size:13px;line-height:1.5;color:#3F4A5E;text-align:center;"><b style="color:${C.ink};">Note:</b> ${note}</div></td></tr>

  <tr><td style="padding:24px 26px 8px;${FONT}font-size:12px;font-weight:800;letter-spacing:0.8px;color:${C.muted};">ORDER SUMMARY</td></tr>
  <tr><td style="padding:0 26px;">${summary}</td></tr>

  <tr><td style="padding:22px 26px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${facts}</table></td></tr>

  <tr><td align="center" style="padding:8px 26px 4px;border-top:1px solid #EEF1F6;">
    <div style="padding-top:14px;">${link('Get directions', card.links.directions)}${link('Reschedule', card.links.support)}${link('Help &amp; Support', card.links.support)}</div>
  </td></tr>
  <tr><td align="center" style="padding:12px 26px 24px;${FONT}font-size:11.5px;line-height:1.6;color:#8A94A6;">
    This is a booking confirmation, not a medical record or prescription.<br />Consult your Doctor &middot; Zebrold Private Limited &middot; Hyderabad
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

/** The same email as plain-text lines, for clients that don't show HTML. */
export function bookingEmailLines(card: BookingCard, opts: { failureReason?: string | null } = {}): string[] {
  const confirmed = card.state === 'confirmed'
  return [
    confirmed ? 'Your booking is confirmed.' : 'Complete your payment to confirm your booking.',
    opts.failureReason && !confirmed ? `Your last payment didn't go through: ${opts.failureReason}` : null,
    `Booking ID: ${card.code}`,
    `${card.title} · ${card.subtitle}`,
    card.when,
    [card.place, ...card.placeLines].join(', '),
    confirmed && card.token ? `Token: ${card.token}` : null,
    card.reportBy ? `Report by: ${card.reportBy}` : null,
    `Booking fee: ${formatINR(card.bookingFee)}`,
    ...(card.convenienceFee > 0 ? [`Payment convenience fee: ${formatINR(card.convenienceFee)}`] : []),
    card.venueTotal != null ? `${card.venueTitle.toLowerCase()}: ${formatINR(card.venueTotal)}` : null,
    `${card.amountLabel.toLowerCase()}: ${formatINR(card.amount)}`,
    confirmed ? `Open your appointment: ${card.links.appointment}` : `Pay now: ${card.links.checkout}`,
  ].filter((line): line is string => !!line)
}
