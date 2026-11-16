// The format rules of the join forms (/signup/doctor, /signup/hospital, /signup/diagnostic-centre). The browser checks
// them at each step (app/(auth)/signup/join-ui.tsx) and the server checks the same again (app/actions/doctorAuth.ts,
// app/actions/partnerSignup.ts) with the same words, so an application is never accepted on screen and then turned
// away after its documents were uploaded. Plain data only: client components import this file.

// ---------- Phone numbers ----------

export const INDIA_MOBILE_PATTERN = '[6-9][0-9]{9}'
export const INDIA_MOBILE_MESSAGE = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'
export const OTHER_PHONE_PATTERN = '[0-9]{6,15}'
export const OTHER_PHONE_MESSAGE = 'Enter 6 to 15 digits, without the country code.'

/**
 * Digits only, up to 15. For India, a pasted "+91 98450 12345" or "098450 12345" loses the 91 or 0 when exactly 10
 * digits are left. Nothing else is cut, so a digit too many or too few shows as an error instead of a wrong number.
 */
export function phoneDigits(value: string, india: boolean) {
  let d = value.replace(/\D/g, '')
  if (india) {
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
    else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  }
  return d.slice(0, 15)
}

/** The phone rule for a country code, or the message saying what's wrong. */
export function phoneProblem(countryCode: string, digits: string): string | null {
  if (!/^\+\d{1,4}$/.test(countryCode)) return 'Choose the country code.'
  return countryCode === '+91'
    ? new RegExp(`^${INDIA_MOBILE_PATTERN}$`).test(digits) ? null : INDIA_MOBILE_MESSAGE
    : new RegExp(`^${OTHER_PHONE_PATTERN}$`).test(digits) ? null : OTHER_PHONE_MESSAGE
}

// ---------- Email ----------

/** name@domain.tld: the browser's own email check also takes "name@clinic", which can't receive mail. */
export const EMAIL_PATTERN = '[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}'
export const EMAIL_MESSAGE = 'Enter a valid email address, like name@example.com.'
export const isEmail = (v: string) => new RegExp(`^${EMAIL_PATTERN}$`).test(v)

// ---------- PAN and GSTIN ----------

/** A person's PAN: the 4th letter is P (for "person"). Doctors apply with their own PAN. */
export const PERSONAL_PAN_PATTERN = '[A-Za-z]{3}[Pp][A-Za-z][0-9]{4}[A-Za-z]'
export const PERSONAL_PAN_MESSAGE = 'Enter your PAN as printed on the card: 10 characters like ABCPE1234F. The 4th letter of a personal PAN is P.'
/** Any PAN: 5 letters, 4 digits, 1 letter. */
export const PAN_PATTERN = '[A-Za-z]{5}[0-9]{4}[A-Za-z]'
export const PAN_MESSAGE = 'Enter the PAN as printed on the card: 10 characters, 5 letters, 4 digits and a letter, like AAACS1234F.'
export const GSTIN_PATTERN = '[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z][Zz][0-9A-Za-z]'
export const GSTIN_MESSAGE = 'Enter the 15-character GSTIN, like 29AAACS1234F1Z5.'
export const GSTIN_PAN_MESSAGE = 'The GSTIN should contain the PAN entered above (characters 3 to 12).'

/** Whether a GSTIN belongs to this PAN: characters 3 to 12 of a GSTIN are the PAN. Either one empty counts as a match. */
export const gstinMatchesPan = (gstin: string, pan: string) => !gstin || !pan || gstin.slice(2, 12).toUpperCase() === pan.toUpperCase()

// ---------- Bank ----------

export const ACCOUNT_PATTERN = '[0-9]{9,18}'
export const ACCOUNT_MESSAGE = 'Enter the account number: 9 to 18 digits.'
export const IFSC_PATTERN = '[A-Za-z]{4}0[A-Za-z0-9]{6}'
export const IFSC_MESSAGE = 'Enter the 11-character IFSC: 4 letters, a zero and 6 letters or digits, like HDFC0001234.'
export const UPI_PATTERN = '[A-Za-z0-9._\\-]{2,}@[A-Za-z0-9]{2,}'
export const UPI_MESSAGE = 'Enter the UPI ID, like name@okhdfcbank.'

// ---------- Address ----------

export const PINCODE_PATTERN = '[1-9][0-9]{5}'
export const PINCODE_MESSAGE = 'Enter the 6-digit PIN code.'
/** A landline or mobile with its area code: digits, spaces, + or -. */
export const LANDLINE_PATTERN = '[0-9 +\\-]{6,16}'
export const LANDLINE_MESSAGE = 'Enter the number with its area code, like 080 4123 4567.'

// ---------- Times ----------

/** "18:00" is after "09:00" (HH:MM strings compare in order). */
export const isLaterTime = (from: string, to: string) => !from || !to || to > from
export const LATER_TIME_MESSAGE = 'The closing time should be after the opening time.'
