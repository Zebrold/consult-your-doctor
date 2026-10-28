import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Mail, MapPin, Navigation, Phone, ShieldCheck, Siren, Star, type LucideIcon } from 'lucide-react'
import { jsonLd } from '@/lib/json-ld'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { testList } from '@/lib/pricing'
import { getBookingFees } from '@/lib/booking-fees'
import { PatientDock } from '@/components/PatientDock'
import { PatientFooter } from '@/components/AppFooter'
import { VerifiedBadge } from '@/components/home/ui'
import { ALWAYS_OPEN } from '@/components/home/data'
import { HospitalBooking, HeroButtons, type HospitalDoctor } from '@/components/patient/HospitalBooking'
import { Dots, btnOutline, card } from '@/components/patient/app-ui'
import { currentTime, one } from '@/components/patient/data'
import { directionsHref, formatINR } from '@/components/patient/format'
import { RemoteImage } from '@/components/RemoteImage'

export const revalidate = 0

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const params = await props.params
  const id = params.id
  const supabase = await createClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('name, city, address')
    .eq('id', id)
    .single()

  if (!hospital) {
    return { title: 'Hospital Not Found | Consult Your Doctor' }
  }

  return {
    title: `${hospital.name} in ${hospital.city} | Consult Your Doctor`,
    description: `Book consultations at ${hospital.name} located at ${[hospital.address, hospital.city].filter(Boolean).join(', ')}. View affiliated doctors and specialties.`,
  }
}

export default async function HospitalProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const user = await getCurrentUser()
  const now = currentTime()

  const [{ data: hospital, error: hospitalError }, { data: viewer }, fees] = await Promise.all([
    supabase.from('hospitals').select('*').eq('id', id).single(),
    user ? supabase.from('profiles').select('full_name, role, email').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    getBookingFees(),
  ])
  if (hospitalError || !hospital) notFound()

  // Profile lists the hospital fills in on its portal (empty until the 20261009 migration adds the columns).
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter((s) => typeof s === 'string' && s.trim()) : [])
  const facilities = list(hospital.facilities)
  const accreditations = list(hospital.accreditations)
  const insurance = list(hospital.insurance_accepted)
  const tests = testList(list(hospital.available_tests), hospital.test_prices).filter((t): t is { name: string; price: number } => !!t.price)

  const { data: doctorRows } = await supabase
    .from('doctors')
    .select('id, specialty, qualifications, experience_years, image_url, consultation_fee, profiles!doctors_profile_id_fkey ( full_name )')
    .eq('hospital_id', id)
  type Row = { id: string; specialty: string | null; qualifications: string | null; experience_years: number | null; image_url: string | null; consultation_fee: number | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }
  const rows = (doctorRows ?? []) as Row[]

  // Each doctor's open times over the next two weeks, and the hospital's published rating (when the table exists).
  const admin = createAdminClient()
  const [{ data: slotRows }, ratingResult] = await Promise.all([
    rows.length
      ? supabase
        .from('schedules')
        .select('id, doctor_id, start_time')
        .in('doctor_id', rows.map((d) => d.id))
        .eq('is_booked', false)
        .gt('start_time', new Date(now).toISOString())
        .lt('start_time', new Date(now + 14 * 86_400_000).toISOString())
        .order('start_time', { ascending: true })
        .limit(600)
      : Promise.resolve({ data: [] }),
    admin.from('hospital_reviews').select('rating').eq('hospital_id', id).eq('is_published', true),
  ])
  const slotsBy = new Map<string, { id: string; start: string }[]>()
  for (const s of (slotRows ?? []) as { id: string; doctor_id: string; start_time: string }[]) {
    const mine = slotsBy.get(s.doctor_id) ?? []
    if (mine.length < 10) mine.push({ id: s.id, start: s.start_time })
    slotsBy.set(s.doctor_id, mine)
  }
  const ratings = ratingResult.error ? [] : ((ratingResult.data ?? []) as { rating: number }[]).map((r) => r.rating)
  const rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  const doctors: HospitalDoctor[] = rows
    .map((d) => ({
      id: d.id,
      name: one(d.profiles)?.full_name ?? null,
      specialty: d.specialty,
      quals: [d.specialty, d.qualifications?.trim(), d.experience_years ? `${d.experience_years}+ yrs` : null].filter(Boolean).join(' · '),
      image: d.image_url,
      bookable: Number(d.consultation_fee) > 0,
      slots: slotsBy.get(d.id) ?? [],
    }))
    .sort((a, b) => Number(b.bookable) - Number(a.bookable) || (a.slots[0]?.start ?? '￿').localeCompare(b.slots[0]?.start ?? '￿'))

  const specialtyNames = Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean) as string[]))
  const tags = [specialtyNames.length >= 3 ? 'Multi-speciality' : specialtyNames.join(' · '), facilities.find((f) => /emergenc/i.test(f)) ? 'Emergency care' : null].filter(Boolean).join(' · ') || 'Partner hospital'
  const address = [hospital.address, hospital.city].filter(Boolean).join(', ')
  const directions = directionsHref(hospital.name, hospital.address, hospital.city)
  const openAllDay = facilities.some((f) => ALWAYS_OPEN.test(f))
  const highlights = [openAllDay ? 'Open 24/7' : null, ...facilities.filter((f) => !ALWAYS_OPEN.test(f)).slice(0, openAllDay ? 2 : 3)].filter(Boolean) as string[]
  const phone = hospital.phone || hospital.contact_phone
  const isPatient = !!user && (!viewer?.role || viewer.role === 'patient')
  const name = viewer?.full_name || user?.user_metadata?.full_name || null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Hospital',
    name: hospital.name,
    image: hospital.image_url || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: hospital.address || '',
      addressLocality: hospital.city || '',
      addressRegion: hospital.state || '',
      postalCode: hospital.zip_code || '',
    },
    telephone: hospital.contact_phone || '',
    email: hospital.contact_email || '',
    url: `https://consultyourdoctor.de/hospitals/${id}`,
  }

  const photo = hospital.image_url ? (
    <RemoteImage src={hospital.image_url} alt={`Exterior of ${hospital.name}`} fill sizes="(min-width: 1024px) 1000px, 100vw" load="first" className="object-cover" />
  ) : (
    <span className="w-full h-full flex items-center justify-center bg-[linear-gradient(160deg,#EAF1FF,#D3E0FF)] text-[#2A4DD0]">
      <Building2 className="w-20 h-20" strokeWidth={1.3} />
    </span>
  )

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen font-(family-name:--font-manrope) text-[#0B1B3F]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

      {/* Phones: the photo with back and share, then the details card over its edge. */}
      <div className="lg:hidden relative h-[230px] md:h-[300px] overflow-hidden">
        {photo}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,20,51,0.35)_0%,rgba(8,20,51,0)_40%)]" />
        <HeroButtons backHref="/hospitals" title={hospital.name} />
      </div>
      <section className="lg:hidden relative -mt-9 mx-3 md:mx-6 p-4 rounded-[20px] bg-white shadow-[0_10px_26px_rgba(11,27,63,0.1)]">
        <div className="flex items-start justify-between gap-2.5">
          <h1 className="flex items-center gap-1.5 text-[20px] font-extrabold tracking-[-0.02em] leading-[1.2] min-w-0">
            <span className="min-w-0">{hospital.name}</span>
            <VerifiedBadge className="w-[18px] h-[18px]" />
          </h1>
          {rating != null && <GreenRating rating={rating} />}
        </div>
        <p className="mt-1.5 text-[13.5px] text-[#4A5878]">{tags}</p>
        {address && (
          <p className="mt-1 flex items-start gap-1.5 text-[13.5px] text-[#4A5878]">
            <MapPin className="w-[13px] h-[13px] mt-1 text-[#5B667A] shrink-0" />
            {address}
          </p>
        )}
        <Dots items={highlights} className="mt-3" />
      </section>

      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-11">
        <div className="max-w-[1340px] lg:px-9 lg:pt-7">
          {/* Desktops: back link, then the photo with the name over it. */}
          <Link href="/hospitals" className="hidden lg:inline-flex items-center gap-1.5 mb-3.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Back to hospitals
          </Link>
          <section className="hidden lg:block relative h-[260px] rounded-[22px] overflow-hidden mb-5">
            {photo}
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,20,51,0.75),rgba(8,20,51,0)_60%)]" />
            <div className="absolute left-7 right-7 bottom-[22px] flex items-end justify-between gap-5 text-white">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[30px] font-extrabold tracking-[-0.02em]">
                  <h1 className="truncate">{hospital.name}</h1>
                  <VerifiedBadge className="w-6 h-6" />
                </span>
                <span className="block text-[14px] text-[#E3EAFF] truncate">{[tags, address].filter(Boolean).join(' · ')}</span>
              </span>
              {rating != null && <span className="shrink-0 px-3 py-1.5 rounded-[10px] bg-[#1F8A57] text-[15px] font-extrabold">{rating.toFixed(1)} ★</span>}
            </div>
          </section>

          <div className="px-3 md:px-6 lg:px-0 pt-3.5 lg:pt-0">
            <HospitalBooking doctors={doctors} bookingFee={fees.consultation} now={now}>
              <Card id="fees" title="Consultation charges">
                <div className="flex justify-between gap-3 py-2.5 border-b border-[#EEF2F7]">
                  <span>
                    <span className="block text-[14px] font-bold">Booking fee</span>
                    <span className="block text-[12px] text-[#5B667A]">Paid online when you book</span>
                  </span>
                  <span className="text-[15px] font-extrabold text-[#2A4DD0]">{formatINR(fees.consultation)}</span>
                </div>
                <div className="flex justify-between gap-3 pt-2.5 pb-0.5">
                  <span>
                    <span className="block text-[14px] font-bold">Consultation fee</span>
                    <span className="block text-[12px] text-[#5B667A]">Set by the hospital, on each doctor&apos;s profile</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-extrabold text-right whitespace-nowrap">At the counter</span>
                </div>
              </Card>

              {tests.length > 0 && (
                <Card id="tests" title="Tests & services" sub="Prices set by the hospital, paid at the hospital">
                  <div className="lg:grid lg:grid-cols-2 lg:gap-x-6">
                    {tests.map((t) => (
                      <div key={t.name} className="flex items-center justify-between gap-3 py-3 border-t border-[#EEF2F7]">
                        <span className="text-[14px] font-bold min-w-0">{t.name}</span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[14px] font-extrabold">{formatINR(t.price)}</span>
                          <span className="block text-[10.5px] font-bold text-[#5B667A]">at hospital</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {(facilities.length > 0 || insurance.length > 0) && (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3.5 lg:gap-5">
                  {facilities.length > 0 && (
                    <Card id="facilities" title="Facilities" sub="Listed by the hospital">
                      <div className="grid grid-cols-2 rounded-[14px] shadow-[0_0_0_1px_#E6EBF3] overflow-hidden">
                        {[...facilities, ...accreditations].map((f) => (
                          <span key={f} className="px-3.5 py-3 shadow-[inset_-1px_-1px_0_#EEF2F7] text-[13px] font-extrabold leading-tight">
                            {f}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}
                  {insurance.length > 0 && (
                    <Card id="insurance" title="Insurance accepted" sub="Insurers and schemes this hospital works with">
                      {insurance.map((i) => (
                        <div key={i} className="flex items-center gap-2.5 py-[11px] border-t border-[#EEF2F7] text-[13.5px] font-extrabold">
                          <ShieldCheck className="w-4 h-4 text-[#067647] shrink-0" /> {i}
                        </div>
                      ))}
                      <p className="mt-2.5 text-[11.5px] leading-normal text-[#5B667A]">Cover depends on your policy. Check with the hospital&apos;s insurance desk before your visit.</p>
                    </Card>
                  )}
                </div>
              )}

              {hospital.about && (
                <Card id="about" title={`About ${hospital.name}`}>
                  <p className="text-[14px] leading-relaxed text-[#4A5878] whitespace-pre-line">{hospital.about}</p>
                  {hospital.established_year && <p className="mt-2.5 text-[12.5px] font-bold text-[#5B667A]">Serving patients since {hospital.established_year}</p>}
                </Card>
              )}

              <Card id="contact" title="Contact & directions">
                {address && <ContactRow icon={MapPin} label="Address" value={address} />}
                {phone && <ContactRow icon={Phone} label="Phone" value={phone} href={`tel:${String(phone).replace(/\s+/g, '')}`} />}
                {hospital.emergency_phone && <ContactRow icon={Siren} label="Emergency" value={hospital.emergency_phone} href={`tel:${String(hospital.emergency_phone).replace(/\s+/g, '')}`} danger />}
                {hospital.contact_email && <ContactRow icon={Mail} label="Email" value={hospital.contact_email} href={`mailto:${hospital.contact_email}`} />}
                {directions && (
                  <a href={directions} target="_blank" rel="noreferrer" className={`${btnOutline} w-full mt-3`}>
                    <Navigation className="w-4 h-4" /> Directions
                  </a>
                )}
              </Card>
            </HospitalBooking>
          </div>
        </div>
      </main>

      <PatientFooter isSignedIn={!!user} />
      <PatientDock activeTab="find" isSignedIn={!!user} name={name} phoneBar={false} detail={isPatient ? `UHID CYD-${user!.id.slice(0, 8).toUpperCase()}` : null} />
    </div>
  )
}

function GreenRating({ rating }: { rating: number }) {
  return (
    <span className="shrink-0 flex items-center gap-1 px-[9px] py-1 rounded-lg bg-[#1F8A57] text-white text-[13px] font-extrabold">
      <span className="sr-only">Rated </span>
      {rating.toFixed(1)}
      <Star className="w-[11px] h-[11px] fill-white" strokeWidth={0} />
    </span>
  )
}

function Card({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
      <h2 id={`${id}-title`} className="text-[16px] font-extrabold">{title}</h2>
      {sub ? <p className="mt-1 mb-3 text-[12.5px] text-[#5B667A]">{sub}</p> : <div className="mb-2.5" />}
      {children}
    </section>
  )
}

function ContactRow({ icon: Icon, label, value, href, danger = false }: { icon: LucideIcon; label: string; value: string; href?: string; danger?: boolean }) {
  const body = (
    <>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${danger ? 'text-[#B42318]' : 'text-[#5B667A]'}`} />
      <span className="min-w-0">
        <span className="block text-[11.5px] font-bold text-[#5B667A]">{label}</span>
        <span className={`block text-[13.5px] font-extrabold break-words ${danger ? 'text-[#B42318]' : ''}`}>{value}</span>
      </span>
    </>
  )
  return href ? (
    <a href={href} className="flex items-start gap-2.5 py-2.5 border-t border-[#EEF2F7] hover:text-[#2A4DD0]">
      {body}
    </a>
  ) : (
    <div className="flex items-start gap-2.5 py-2.5 border-t border-[#EEF2F7]">{body}</div>
  )
}
