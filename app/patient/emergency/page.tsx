import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { Phone } from 'lucide-react'
import { AccountPage } from '@/components/patient/AccountPage'
import { card, btnPrimary } from '@/components/patient/app-ui'
import { firstName } from '@/components/patient/format'
import { MedicalId } from '@/components/patient/health/MedicalId'
import { EmergencyContacts, NearestEmergency, SendLocation, type EmergencyHospital } from '@/components/patient/health/emergency'
import { patientAccount } from '@/lib/patient-account'
import { loadContacts, loadHealthDetails } from '@/lib/patient-health'
import { loadInsurance } from '@/lib/insurance'
import { toLatLng } from '@/lib/geo'

export const metadata: Metadata = { title: 'Emergency' }

type HospitalRow = {
  id: string
  name: string | null
  city: string | null
  address: string | null
  phone?: string | null
  emergency_phone?: string | null
  facilities?: string[] | null
  insurance_accepted?: string[] | null
  latitude?: number | null
  longitude?: number | null
}

const sameInsurer = (a: string, b: string) => {
  const key = (s: string) => s.toLowerCase().replace(/\b(general|health|insurance|company|co|ltd|limited)\b|[^a-z]/g, '')
  return !!key(a) && key(a) === key(b)
}

/** Emergency: 108 and 112, the nearest partner hospitals with an emergency department, contacts and the medical ID. */
export default async function EmergencyPage() {
  const { user, admin, profile, name } = await patientAccount('/patient/emergency')
  const details = await loadHealthDetails(admin, user.id)
  const [{ ready, contacts }, { policy }, { data: hospitalRows }] = await Promise.all([
    loadContacts(admin, user.id, details),
    loadInsurance(admin, user.id),
    // `*` because the map pin and profile columns come from later migrations.
    admin.from('hospitals').select('*').eq('status', 'active'),
  ])
  const now = currentTime()

  const hospitals: EmergencyHospital[] = ((hospitalRows ?? []) as HospitalRow[])
    .filter((h) => h.emergency_phone || (h.facilities ?? []).some((f) => /emergency/i.test(f)))
    .map((h) => {
      const pin = toLatLng(h.latitude, h.longitude)
      return {
        id: h.id,
        name: h.name || 'Hospital',
        city: h.city,
        address: h.address,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        phone: h.emergency_phone || h.phone || null,
        allDay: (h.facilities ?? []).some((f) => /24\s*x\s*7|24\/7/i.test(f) && /emergency/i.test(f)),
        cashless: !!policy && (h.insurance_accepted ?? []).some((i) => sameInsurer(i, policy.insurer)),
      }
    })

  const first = contacts.find((c) => c.phone)
  const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

  const helplines: [string, string][] = [
    ['Ambulance', '108'],
    ['All emergencies', '112'],
    ...(policy?.tpaPhone ? [[`Cashless approval${policy.tpaName ? ` (${policy.tpaName})` : ' (TPA)'}`, policy.tpaPhone] as [string, string]] : []),
  ]

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="Emergency"
      subtitle="Help fast, with your medical details ready for the doctors"
      phoneSubtitle="Free ambulance on 108. Your medical ID goes with you."
      hero={
        <div className="grid grid-cols-2 gap-2.5">
          <a href="tel:108" className="inline-flex items-center justify-center gap-2 h-12 rounded-[11px] bg-white text-[#2A4DD0] text-[15px] font-extrabold active:scale-[0.98] transition-transform">
            <Phone className="w-[18px] h-[18px]" /> Call 108
          </a>
          {first?.phone ? (
            <a href={tel(first.phone)} className="inline-flex items-center justify-center h-12 rounded-[11px] border border-white/40 bg-white/[0.12] text-white text-[15px] font-extrabold truncate px-3 active:scale-[0.98] transition-transform">
              Call {firstName(first.name)}
            </a>
          ) : (
            <a href="tel:112" className="inline-flex items-center justify-center h-12 rounded-[11px] border border-white/40 bg-white/[0.12] text-white text-[15px] font-extrabold active:scale-[0.98] transition-transform">
              Call 112
            </a>
          )}
        </div>
      }
    >
      {/* Desktop: the dark call bar. */}
      <section className="hidden lg:flex items-center gap-5 rounded-[18px] bg-[#0B1B3F] text-white px-[26px] py-[22px]">
        <span className="flex-1 min-w-0">
          <span className="block text-[20px] font-extrabold tracking-[-0.01em]">In a medical emergency, call 108</span>
          <span className="block mt-1 text-[13.5px] text-[#C9D3E6]">A free government ambulance comes to you. Show your medical ID below to the paramedics and the hospital.</span>
        </span>
        <a href="tel:108" className={`${btnPrimary} h-12! px-6! text-[15px]!`}>
          <Phone className="w-[18px] h-[18px]" /> Call 108
        </a>
        {first?.phone && (
          <a href={tel(first.phone)} className="inline-flex items-center justify-center h-12 px-5 rounded-[11px] border border-white/35 text-white text-[13.5px] font-extrabold hover:bg-white/10 transition-colors">
            Call {firstName(first.name)}
          </a>
        )}
      </section>

      {/* Phones show the medical ID first. */}
      <MedicalId name={name} details={details} policy={policy} now={now} className="lg:hidden" />

      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <NearestEmergency hospitals={hospitals} />
          <div className="grid gap-3.5 lg:gap-5 xl:grid-cols-2 items-start">
            <EmergencyContacts contacts={contacts} ready={ready} />
            <section className={`${card} p-4 lg:p-[22px]`}>
              <h2 className="text-[16px] font-extrabold">Helplines</h2>
              <div className="mt-2">
                {helplines.map(([label, number]) => (
                  <div key={label} className="flex justify-between gap-3 py-2.5 lg:py-[11px] border-t border-[#EEF2F7] first:border-t-0 text-[13px] lg:text-[13.5px]">
                    <span className="text-[#5B667A]">{label}</span>
                    <a href={tel(number)} className="font-extrabold text-[#2A4DD0] hover:underline">{number}</a>
                  </div>
                ))}
              </div>
              {!policy?.tpaPhone && <p className="mt-2 text-[12px] text-[#5B667A]">Add your insurer&apos;s TPA helpline on the Insurance page to keep it here.</p>}
            </section>
          </div>
        </div>
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <MedicalId name={name} details={details} policy={policy} now={now} className="hidden lg:block" />
          <SendLocation contacts={contacts} />
        </div>
      </div>
    </AccountPage>
  )
}
