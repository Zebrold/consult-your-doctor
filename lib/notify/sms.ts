/**
 * SMS service module for Consult Your Doctor platform.
 * Supports OTP verification, appointment confirmations, and patient notifications via Fast2SMS and standard gateway APIs.
 */

export const smsConfigured = () => Boolean(process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY)

/** Formats a phone number for Indian SMS providers (10 digits). */
export function formatIndianSmsNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  return digits
}

export type SmsPayload = {
  phone: string
  message: string
  otp?: string
}

/**
 * Sends an SMS message using Fast2SMS Quick SMS route or standard API.
 * Failures are safely caught, logged, and return false rather than breaking the application flow.
 */
export async function sendSms(payload: SmsPayload): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY
  if (!apiKey) {
    // SMS provider not yet provisioned in environment; logged gracefully for monitoring
    return false
  }

  const number = formatIndianSmsNumber(payload.phone)
  if (number.length !== 10) {
    console.warn('sendSms: Invalid 10-digit Indian mobile number:', payload.phone)
    return false
  }

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q', // Quick transactional route
        message: payload.message,
        numbers: number,
        flash: 0,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok || (data && data.return === false)) {
      console.error('sendSms failed:', res.status, data)
      return false
    }

    return true
  } catch (error) {
    console.error('sendSms network exception:', error)
    return false
  }
}

/** Sends OTP SMS to user for mobile verification using Fast2SMS Quick OTP route */
export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY
  if (!apiKey) return false

  const number = formatIndianSmsNumber(phone)
  if (number.length !== 10) return false

  // 1. Try Fast2SMS dedicated OTP route first
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: number,
      }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.return !== false) {
      return true
    }
  } catch (err) {
    console.warn('sendOtpSms route otp failed, attempting transactional fallback:', err)
  }

  // 2. Fallback to Quick transactional route
  return sendSms({
    phone,
    otp,
    message: `Your Consult Your Doctor verification code is ${otp}. Valid for 10 minutes. Please do not share this code.`,
  })
}


/** Sends appointment booking confirmation SMS */
export async function sendBookingConfirmationSms(
  phone: string,
  details: { bookingId: string; tokenNumber?: string | number; doctorOrLab: string; date: string; hospital: string }
): Promise<boolean> {
  const tokenPart = details.tokenNumber ? ` Token #${details.tokenNumber}.` : ''
  return sendSms({
    phone,
    message: `Consult Your Doctor: Your booking with ${details.doctorOrLab} at ${details.hospital} is confirmed.${tokenPart} ID: ${details.bookingId}. Date: ${details.date}.`,
  })
}

/** Sends support ticket status update SMS */
export async function sendTicketUpdateSms(phone: string, ticketCode: string, status: string): Promise<boolean> {
  return sendSms({
    phone,
    message: `Consult Your Doctor: Your support ticket ${ticketCode} status has been updated to ${status.toUpperCase().replace(/_/g, ' ')}. View details in your portal.`,
  })
}

/** Sends SMS notification that a prescription or lab report is ready */
export async function sendReportReadySms(
  phone: string,
  details: { patientName: string; what: string; from: string }
): Promise<boolean> {
  return sendSms({
    phone,
    message: `Consult Your Doctor: Hello ${details.patientName}, your ${details.what} from ${details.from} is ready. View it in your account portal.`,
  })
}

/** Sends account credentials SMS to new patient registered at the desk */
export async function sendAccountCreatedSms(
  phone: string,
  details: { patientName: string; patientCode: string; password: string }
): Promise<boolean> {
  return sendSms({
    phone,
    message: `Consult Your Doctor: Hello ${details.patientName}, your account is ready. Patient ID: ${details.patientCode}, Password: ${details.password}. Keep these details private.`,
  })
}

