import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, Search } from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { AccountCard, AccountPage } from '@/components/patient/AccountPage'
import { btnPrimary } from '@/components/patient/app-ui'
import { one } from '@/components/patient/data'
import { doctorName, initials } from '@/components/patient/format'
import { RemoteImage } from '@/components/RemoteImage'

export const metadata: Metadata = { title: 'Your doctors & labs | Consult Your Doctor' }

type Rel<T> = T | T[] | null

/** The doctors and labs the patient has booked, newest first, with a quick way to book them again. */
export default async function SavedPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/saved')

  const [{ data: profile }, { data: visits }, { data: labs }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    supabase
      .from('appointments')
      .select('doctors ( id, specialty, image_url, profiles!doctors_profile_id_fkey ( full_name ) ), hospitals ( name, city )')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('diagnostic_bookings').select('diagnostic_centers ( id, name, city, address )').eq('patient_id', user.id).order('created_at', { ascending: false }),
  ])

  type Visit = { doctors: Rel<{ id: string; specialty: string | null; image_url: string | null; profiles: Rel<{ full_name: string | null }> }>; hospitals: Rel<{ name: string; city: string | null }> }
  const doctors = new Map<string, { id: string; name: string; sub: string; image: string | null }>()
  for (const v of (visits ?? []) as Visit[]) {
    const d = one(v.doctors)
    if (!d || doctors.has(d.id)) continue
    const h = one(v.hospitals)
    doctors.set(d.id, { id: d.id, name: doctorName(one(d.profiles)?.full_name), sub: [d.specialty, h?.name, h?.city].filter(Boolean).join(' · '), image: d.image_url })
  }
  const centers = new Map<string, { id: string; name: string; sub: string }>()
  for (const b of (labs ?? []) as { diagnostic_centers: Rel<{ id: string; name: string; city: string | null; address: string | null }> }[]) {
    const c = one(b.diagnostic_centers)
    if (c && !centers.has(c.id)) centers.set(c.id, { id: c.id, name: c.name, sub: [c.address?.split(',')[0], c.city].filter(Boolean).join(' · ') || 'Diagnostic centre' })
  }

  const row = 'flex items-center gap-3 py-3 border-t border-[#EEF2F7]'
  const again = 'shrink-0 h-9 px-3.5 rounded-[10px] border-[1.5px] border-[#D6DDE8] text-[12.5px] font-extrabold text-[#27324A] flex items-center hover:bg-[#F4F6FA] transition-colors'

  return (
    <AccountPage user={user} profile={profile} title="Your doctors & labs" subtitle="Everyone you have booked, for quick re-booking.">
      {doctors.size === 0 && centers.size === 0 ? (
        <AccountCard>
          <div className="py-4 text-center">
            <p className="text-[15px] font-extrabold">Nobody here yet</p>
            <p className="mt-1 mb-4 text-[13px] text-[#5B667A]">Doctors and labs you book are kept here so you can book them again in a tap.</p>
            <Link href="/find" className={btnPrimary}>
              <Search className="w-4 h-4" /> Find care
            </Link>
          </div>
        </AccountCard>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3.5 lg:gap-5 lg:items-start">
          <AccountCard title="Doctors" sub={doctors.size ? `${doctors.size} you have booked` : 'None booked yet'}>
            {[...doctors.values()].map((d) => (
              <div key={d.id} className={row}>
                {d.image ? (
                  <RemoteImage src={d.image} alt="" width={44} height={44} className="shrink-0 w-11 h-11 rounded-xl object-cover object-top bg-[#EEF1F5]" />
                ) : (
                  <span className="shrink-0 w-11 h-11 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{initials(d.name)}</span>
                )}
                <Link href={`/doctors/${d.id}`} className="flex-1 min-w-0 hover:text-[#2A4DD0]">
                  <span className="block text-[14px] font-extrabold truncate">{d.name}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{d.sub}</span>
                </Link>
                <Link href={`/book/${d.id}`} className={again}>
                  Book again
                </Link>
              </div>
            ))}
          </AccountCard>
          <AccountCard title="Diagnostic centres" sub={centers.size ? `${centers.size} you have booked` : 'None booked yet'}>
            {[...centers.values()].map((c) => (
              <div key={c.id} className={row}>
                <span className="shrink-0 w-11 h-11 rounded-xl bg-[#F4F6FA] text-[#27324A] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-extrabold truncate">{c.name}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{c.sub}</span>
                </span>
                <Link href={`/book/diagnostic/${c.id}`} className={again}>
                  Book again
                </Link>
              </div>
            ))}
          </AccountCard>
        </div>
      )}
    </AccountPage>
  )
}
