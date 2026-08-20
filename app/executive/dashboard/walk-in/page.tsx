import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { WalkInForm } from './WalkInForm'

export default async function WalkInBookingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/executive')

  const { data: executiveProfile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('id', user.id)
    .single()

  if (!executiveProfile?.hospital_id) redirect('/executive/dashboard')

  // Fetch doctors ONLY in this hospital
  const { data: doctors } = await supabase
    .from('doctors')
    .select(`
      id,
      specialty,
      consultation_fee,
      profiles!doctors_profile_id_fkey ( full_name )
    `)
    .eq('hospital_id', executiveProfile.hospital_id)

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/executive/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            New Walk-In Booking
          </h1>
          <p className="text-gray-500 mt-1">
            Book a consultation for a patient currently at the front desk.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm">
        <WalkInForm doctors={doctors || []} />
      </div>
    </div>
  )
}
