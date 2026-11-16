import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadInsurance } from '@/lib/insurance'
import { generateInsuranceCardPdf } from '@/lib/pdf/insurance-card'

// The signed-in patient's own saved policy as a PDF card. Nothing but their own row is ever read.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in to download your card.' }, { status: 401 })

    const admin = createAdminClient()
    const { policy } = await loadInsurance(admin, user.id)
    if (!policy) return NextResponse.json({ error: 'Add your insurance policy first.' }, { status: 404 })

    const holder = policy.holderName?.trim() || String((await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle()).data?.full_name ?? '').trim()
    const bytes = await generateInsuranceCardPdf({
      holder: holder || 'Policy holder',
      policyNumber: policy.policyNumber,
      insurer: policy.insurer,
      validUntil: policy.validUntil,
      memberId: policy.memberId,
      tpa: [policy.tpaName, policy.tpaPhone].filter(Boolean).join(' · ') || null,
    })
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Insurance_Card.pdf"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('Error generating insurance card:', err)
    return NextResponse.json({ error: 'Failed to generate the card' }, { status: 500 })
  }
}
