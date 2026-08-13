import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const headers = { "Content-Type": "application/json" }

  try {
    const body = await req.json()
    
    // Supabase Auth Hook payload structure
    const phone = body.user?.phone
    const otp = body.sms?.otp

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Missing phone or OTP" }), { status: 400, headers })
    }

    // Fast2SMS expects a 10-digit number. Remove the '+91' country code.
    const cleanPhone = phone.replace('+91', '')

    // Get the Fast2SMS API Key from Supabase Secrets
    const FAST2SMS_API_KEY = Deno.env.get('FAST2SMS_API_KEY')

    // Call Fast2SMS API using the 'otp' route (Extremely cheap, ~0.20 INR)
    // We cannot use custom messages here without DLT, but Fast2SMS automatically sends "Your OTP is: {otp}"
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': FAST2SMS_API_KEY as string,
      },
      body: JSON.stringify({
        route: 'otp', 
        variables_values: otp, 
        numbers: cleanPhone,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.return) {
      console.error("Fast2SMS Error:", data)
      return new Response(JSON.stringify({ error: "SMS failed to send via Fast2SMS" }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  } catch (error) {
    console.error("Hook Error:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers })
  }
})
