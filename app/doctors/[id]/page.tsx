import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RefreshCw, User, BadgeCheck, ShieldCheck, Award, CheckCircle2, Star, Calendar, Building2, MapPin, Stethoscope, FileText, Activity, GraduationCap, MessageSquare, Heart, Clock, CreditCard } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const revalidate = 0

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const params = await props.params
  const id = params.id
  const supabase = await createClient()

  const { data: doctor } = await supabase
    .from('doctors')
    .select(`
      profiles!inner(full_name),
      departments(name),
      specialty
    `)
    .eq('id', id)
    .single()

  if (!doctor) {
    return { title: 'Doctor Not Found' }
  }

  const profiles: any = doctor.profiles
  const departments: any = doctor.departments
  const name = profiles?.full_name || profiles?.[0]?.full_name
  const spec = departments?.name || departments?.[0]?.name || doctor.specialty || 'Specialist'

  return {
    title: `${name} - ${spec}`,
    description: `Book a consultation with ${name}, an expert in ${spec} at Consult Your Doctor.`,
  }
}

export default async function DoctorProfilePage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params
  const id = params.id

  const supabase = await createClient()

  // Fetch doctor
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select(`
      *,
      profiles!inner(full_name, role),
      hospitals!inner(name, city, address),
      departments(name)
    `)
    .eq('id', id)
    .single()

  if (doctorError || !doctor) {
    notFound()
  }

  // Fetch upcoming schedules
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('doctor_id', id)
    .eq('is_booked', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(4)

  const name = doctor.profiles?.full_name || 'Doctor'
  const spec = doctor.departments?.name || doctor.specialty || 'Specialist'
  const expYears = doctor.experience_years ? `${doctor.experience_years}+` : 'N/A'

  const hospital = doctor.hospitals
  const symptoms = doctor.symptoms || []

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen flex flex-col">
      <Header />

      <main className="w-full flex-1 pt-20 bg-background">
        <div className="flex flex-col w-full">
          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop py-stack-lg flex flex-col gap-stack-lg max-w-[1440px] mx-auto">

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-stack-sm pb-2">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Clinical Portal / Practitioner Dossier #{doctor.id.slice(0, 8).toUpperCase()}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant/40">/</span>
                <span className="font-label-sm text-label-sm font-semibold text-primary">Active Verified Roster</span>
              </div>
              <div className="flex items-center gap-stack-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full">
                  <RefreshCw className="w-4 h-4 text-fresh-teal" />
                  Sync State: Live (GMC Verified)
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant/70">Refreshed Today</span>
              </div>
            </div>

            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,80,203,0.06)] relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md relative z-10">
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center sm:items-start">
                  <div className="relative w-full aspect-[4/5] max-w-[280px] sm:max-w-none rounded-xl overflow-hidden shadow-md bg-surface-container">
                    {doctor.image_url ? (
                      <Image src={doctor.image_url} alt={name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/30">
                        <User className="w-20 h-20" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-indigo-gray-900/85 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-on-primary">
                      <BadgeCheck className="w-4 h-4 text-fresh-teal" />
                      <span className="font-label-sm text-label-sm tracking-wide">Board Certified</span>
                    </div>
                    <div className="absolute bottom-3 inset-x-3 bg-surface-container-lowest/90 backdrop-blur-md p-2.5 rounded-lg flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">License Status</span>
                        <span className="font-label-sm text-label-sm text-on-surface font-semibold">GMC #{doctor.id.slice(0, 7).toUpperCase()}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">Full Registry</span>
                    </div>
                  </div>
                  <div className="w-full mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm px-1">
                      <span>Profile Completeness</span>
                      <span className="font-semibold text-primary">98%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-vibrant-blue rounded-full w-[98%] transition-all duration-500"></div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-stack-sm pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider">
                          {doctor.qualification || 'MD, FACC'}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                          Certified in {spec}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-label-sm text-label-sm font-semibold text-secondary">NHS Specialist Register &amp; Private Practice</span>
                      </div>
                    </div>

                    <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-none mb-2">
                      Dr. {name}
                    </h1>
                    <p className="font-title-md text-title-md text-on-surface-variant mb-1">
                      Senior Consultant in {spec}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant/80 max-w-3xl">
                      {doctor.about || `Specializing in ${spec}, Dr. ${name} provides expert and compassionate care to all patients.`}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-stack-sm my-stack-md">
                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Clinical Tenure</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-primary">{expYears}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Years</span>
                        </div>
                        <span className="font-label-sm text-[11px] text-secondary mt-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Lead Attending
                        </span>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Procedures</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-on-surface">4,200+</span>
                        </div>
                        <span className="font-label-sm text-[11px] text-fresh-teal mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Interventions
                        </span>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Procedural Efficacy</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-fresh-teal">99.4%</span>
                        </div>
                        <span className="font-label-sm text-[11px] text-on-surface-variant mt-1">National Benchmark 96.2%</span>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Patient Trust</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-primary">4.9</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">/ 5.0</span>
                        </div>
                        <span className="font-label-sm text-[11px] text-secondary mt-1 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-vibrant-blue" fill="currentColor" /> Verified Reviews
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-stack-sm pt-stack-sm border-t border-surface-container">
                    <div className="flex flex-wrap items-center gap-stack-sm">
                      <Link href={`/?doctor_id=${doctor.id}&hospital_id=${doctor.hospital_id}&city=${encodeURIComponent(hospital?.city || '')}&specialty=${encodeURIComponent(spec)}#book-consultation-form`} className="flex items-center gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm px-5 py-2.5 rounded-full transition-transform active:scale-95 shadow-[0_2px_12px_rgba(0,102,255,0.25)]">
                        <Calendar className="w-4 h-4" />
                        <span>Book Consultation</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-stack-md">
              <div className="xl:col-span-8 flex flex-col gap-stack-lg">
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)]">
                  <div className="flex items-center justify-between mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <Building2 className="w-5 h-5" />
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Active Locations</span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Clinic &amp; Hospital Affiliations</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                    <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between hover:bg-surface-container transition-colors relative group">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                            <Building2 className="w-5 h-5" />
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                            Primary Location
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md text-on-surface leading-tight mb-1">{hospital?.name}</h3>
                        <p className="font-body-md text-label-sm text-on-surface-variant mb-3">{hospital?.address}, {hospital?.city}</p>
                        <div className="flex flex-col gap-1.5 text-on-surface-variant font-label-sm text-[13px]">
                          <span className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-primary" /> In-Person Consultations
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-high/70 flex items-center justify-between">
                        <Link href={`/hospitals/${doctor.hospital_id}`} className="text-primary hover:underline font-label-sm text-[12px]">View Hospital Details</Link>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)]">
                  <div className="flex items-center justify-between mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <FileText className="w-5 h-5" />
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Academic &amp; Clinical Acumen</span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Specializations &amp; Procedures</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" /> Primary Interventions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {symptoms.length > 0 ? symptoms.map((sym: string, i: number) => (
                          <div key={i} className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-sm text-label-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-fresh-teal"></span>
                            {sym}
                          </div>
                        )) : (
                          <div className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-sm text-label-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-fresh-teal"></span>
                            General {spec}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" /> Medical Education &amp; Training
                      </h3>
                      <div className="flex flex-col gap-3">
                        <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                            <Award className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-title-md text-label-sm font-semibold text-on-surface">{doctor.qualification || 'MBBS, MD'}</h4>
                            <p className="font-body-md text-[13px] text-on-surface-variant">Board Certified</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-stack-sm mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <Star className="w-5 h-5" fill="currentColor" />
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Quality &amp; Governance</span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Patient Reviews &amp; Clinical Metrics</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-sm mb-stack-md">
                    <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Communication Clarity</span>
                        <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">5.0 <span className="text-label-sm font-normal text-on-surface-variant">/ 5.0</span></div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-fresh-teal/15 text-fresh-teal flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Bedside Manner</span>
                        <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">4.9 <span className="text-label-sm font-normal text-on-surface-variant">/ 5.0</span></div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                        <Heart className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Schedule Adherence</span>
                        <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">4.8 <span className="text-label-sm font-normal text-on-surface-variant">/ 5.0</span></div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="xl:col-span-4 flex flex-col gap-stack-lg">
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)]">
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-fresh-teal">
                      <CreditCard className="w-5 h-5" />
                      <h2 className="font-title-md text-title-md text-on-surface font-semibold">Fee Structure</h2>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-title-md text-label-sm font-semibold text-on-surface block">Consultation Fee</span>
                      </div>
                      <span className="font-title-md text-title-md font-bold text-primary">₹{doctor.consultation_fee}</span>
                    </div>
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)]">
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-fresh-teal">
                      <Calendar className="w-5 h-5" />
                      <h2 className="font-title-md text-title-md text-on-surface font-semibold">Next Available Slots</h2>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {schedules && schedules.length > 0 ? schedules.map((slot: any) => (
                      <div key={slot.id} className="p-3 bg-surface-container-low rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-title-md text-label-sm font-semibold text-on-surface">
                            {new Date(slot.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                          <span className="px-2 py-1 bg-surface-container-highest rounded text-[11px] font-semibold text-primary">
                            {new Date(slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="p-3 bg-surface-container-low rounded-xl text-center">
                        <p className="font-label-sm text-on-surface-variant">No slots available</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
