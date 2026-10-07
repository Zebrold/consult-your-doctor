// Supabase Auth "Send SMS" hook: Supabase calls this with the one-time code for a phone sign-in, and it sends the
// text through Fast2SMS (Indian numbers only).
//
// Deploy without JWT checks (Supabase signs hook requests instead):
//   npx supabase functions deploy send-otp --no-verify-jwt
// Secrets:
//   FAST2SMS_API_KEY       your Fast2SMS API key
//   SEND_SMS_HOOK_SECRET   the hook's secret from Authentication → Hooks → Send SMS (starts with "v1,whsec_")
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"

const JSON_HEADERS = { "Content-Type": "application/json" }

/** The error shape Supabase Auth passes back to the app as the sign-in error message. */
function hookError(httpCode: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), { status: httpCode, headers: JSON_HEADERS })
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("SEND_SMS_HOOK_SECRET")
  const apiKey = Deno.env.get("FAST2SMS_API_KEY")
  if (!secret || !apiKey) {
    console.error("send-otp: SEND_SMS_HOOK_SECRET or FAST2SMS_API_KEY is not set")
    return hookError(500, "SMS sign-in isn't set up yet. Please continue with Google.")
  }

  // Only Supabase Auth may ask for a text: anyone else could spend the SMS balance or send their own message.
  let user: { phone?: string } | undefined
  let sms: { otp?: string } | undefined
  try {
    const payload = await req.text()
    const verified = new Webhook(secret.replace("v1,whsec_", "")).verify(payload, Object.fromEntries(req.headers)) as {
      user?: { phone?: string }
      sms?: { otp?: string }
    }
    user = verified.user
    sms = verified.sms
  } catch (error) {
    console.error("send-otp: rejected an unsigned or invalid request", error)
    return hookError(401, "Invalid request")
  }

  const otp = String(sms?.otp ?? "")
  if (!/^\d{4,10}$/.test(otp)) return hookError(400, "Invalid code")

  // Supabase stores numbers without the "+" (e.g. 919876543210); Fast2SMS wants the 10-digit Indian number.
  const digits = String(user?.phone ?? "").replace(/\D/g, "")
  const mobile = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 10 ? digits : ""
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return hookError(400, "We can only text codes to Indian (+91) mobile numbers. Please check the number or continue with Google.")
  }

  try {
    // The Quick SMS route ("q") needs no DLT template registration (it costs more per SMS).
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: apiKey },
      body: JSON.stringify({
        route: "q",
        message: `Your Consult Your Doctor login code is ${otp}. It expires soon. Don't share it with anyone.`,
        language: "english",
        flash: 0,
        numbers: mobile,
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.return) {
      console.error("send-otp: Fast2SMS refused the message", response.status, data)
      return hookError(502, "We couldn't send the code right now. Please try again in a minute or continue with Google.")
    }
    return new Response(JSON.stringify({}), { status: 200, headers: JSON_HEADERS })
  } catch (error) {
    console.error("send-otp: Fast2SMS request failed", error)
    return hookError(502, "We couldn't send the code right now. Please try again in a minute or continue with Google.")
  }
})
