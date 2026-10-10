import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=')
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  })
}

const resendApiKey = process.env.RESEND_API_KEY?.trim()
const host = resendApiKey ? 'smtp.resend.com' : process.env.SMTP_HOST?.trim()
const port = resendApiKey ? 465 : Number(process.env.SMTP_PORT || 587)
const user = resendApiKey ? 'resend' : process.env.SMTP_USER?.trim()
const pass = resendApiKey ? resendApiKey : process.env.SMTP_PASS?.trim()
const from = process.env.MAIL_FROM?.trim() || (resendApiKey ? 'Consult Your Doctor <no-reply@consultyourdoctor.de>' : user ? `Consult Your Doctor <${user}>` : 'Consult Your Doctor <no-reply@consultyourdoctor.de>')

console.log('--- Email / Resend Diagnostic Test ---')
if (resendApiKey) {
  console.log('Mode: RESEND API KEY detected')
  console.log(`RESEND_API_KEY: ${resendApiKey.slice(0, 6)}...********`)
  console.log(`Relay Host: ${host}:${port}`)
} else {
  console.log(`SMTP_HOST: ${host ? host : '[NOT SET - MISSING!]'}`)
  console.log(`SMTP_PORT: ${port}`)
  console.log(`SMTP_USER: ${user ? user : '[NOT SET]'}`)
  console.log(`SMTP_PASS: ${pass ? '******** (configured)' : '[NOT SET]'}`)
}
console.log(`MAIL_FROM: ${from}`)
console.log('-------------------------------------\n')

if (!resendApiKey && !host) {
  console.error('❌ Error: Neither RESEND_API_KEY nor SMTP_HOST is configured in .env.local.')
  console.error('To use your verified domain zebrold.de, add:')
  console.error('RESEND_API_KEY=re_your_api_key_here')
  console.error('to .env.local.')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
})

console.log('1. Testing SMTP connection and Resend API Key...')
try {
  await transporter.verify()
  console.log('✅ Connection and API Key verified successfully!\n')
} catch (err) {
  console.error('❌ Connection / authentication failed:')
  console.error(err)
  process.exit(1)
}

const targetEmail = process.argv[2]
if (!targetEmail) {
  console.log('💡 Resend is ready to send!')
  console.log('To send a real test email to your inbox, run:')
  console.log('npm run test:email your-email@example.com')
  process.exit(0)
}

console.log(`2. Sending test email to: ${targetEmail}...`)
try {
  const info = await transporter.sendMail({
    from,
    to: targetEmail,
    subject: 'Consult Your Doctor - Test Email Verification',
    text: 'This is a test email from Consult Your Doctor to verify your SMTP setup is working correctly.',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f6fb;">
        <div style="max-width: 500px; margin: auto; background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0066ff; margin-top: 0;">Consult Your Doctor</h2>
          <p style="font-size: 16px; color: #1e293b;">Your email integration is working properly! 🎉</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 13px; color: #64748b;">Sender: <code>${from}</code></p>
          <p style="font-size: 13px; color: #64748b;">SMTP Host: <code>${host}:${port}</code></p>
        </div>
      </div>
    `,
  })
  console.log('✅ Test email dispatched successfully!')
  console.log(`Message ID: ${info.messageId}`)
  console.log(`Server response: ${info.response}`)
} catch (err) {
  console.error('❌ Failed to send email:')
  console.error(err)
  process.exit(1)
}
