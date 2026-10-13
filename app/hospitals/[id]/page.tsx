import { jsonLd } from '@/lib/json-ld'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MapPin, Mail, Phone, Building2, UserCircle, CheckCircle2, Award, FlaskConical, ShieldCheck, Siren, ArrowRight } from 'lucide-react'
import { testList } from '@/lib/pricing'
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

export default async function HospitalProfilePage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params
  const id = params.id

  const supabase = await createClient()

  // Fetch hospital
  const { data: hospital, error: hospitalError } = await supabase
    .from('hospitals')
    .select('*')
    .eq('id', id)
    .single()

  if (hospitalError || !hospital) {
    notFound()
  }

  // Profile lists the hospital fills in on its portal (empty until the 20261009 migration adds the columns).
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter((s) => typeof s === 'string' && s.trim()) : [])
  const facilities = list(hospital.facilities)
  const accreditations = list(hospital.accreditations)
  const insurance = list(hospital.insurance_accepted)
  const tests = testList(list(hospital.available_tests), hospital.test_prices).filter((t): t is { name: string; price: number } => !!t.price)

  // Fetch affiliated doctors
  const { data: doctors } = await supabase
    .from('doctors')
    .select(`
      *,
      profiles!inner(full_name),
      hospitals!inner(name, city),
      departments(name)
    `)
    .eq('hospital_id', id)

  const schema = {
    "@context": "https://schema.org",
    "@type": "Hospital",
    name: hospital.name,
    image: hospital.image_url || "",
    address: {
      "@type": "PostalAddress",
      streetAddress: hospital.address || "",
      addressLocality: hospital.city || "",
      addressRegion: hospital.state || "",
      postalCode: hospital.zip_code || "",
    },
    telephone: hospital.contact_phone || "",
    email: hospital.contact_email || "",
    url: `https://consultyourdoctor.de/hospitals/${id}`,
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <Header />
      
      <main className="flex-1 pt-[calc(var(--header-h)+1.5rem)] md:pt-[calc(var(--header-h)+3rem)] pb-8 md:pb-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
          
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Link href="/" className="hover:text-vibrant-blue transition-colors">Home</Link>
            <span>/</span>
            <Link href="/search?type=hospital" className="hover:text-vibrant-blue transition-colors">Hospitals</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold truncate">{hospital.name}</span>
          </nav>

          {/* Hospital Header Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-10">
            <div className="h-44 md:h-52 bg-gradient-to-r from-primary via-[#0052cc] to-vibrant-blue relative overflow-hidden">
            </div>
            
            <div className="px-6 md:px-8 pb-8 relative">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                {/* Avatar / Logo */}
                <div className="-mt-16 md:-mt-20 relative">
                  <div className="w-28 h-28 md:w-36 md:h-36 bg-white rounded-2xl shadow-md border-4 border-white flex items-center justify-center overflow-hidden shrink-0">
                    {hospital.image_url ? (
                      <Image src={hospital.image_url} alt={hospital.name} fill className="object-cover" />
                    ) : (
                      <Building2 className="w-14 h-14 md:w-16 md:h-16 text-vibrant-blue/50" />
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="pt-2 md:pt-4 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{hospital.name}</h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Facility
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 mb-6 font-medium text-sm md:text-base">
                    <MapPin className="w-4 h-4 text-vibrant-blue shrink-0" />
                    <span>{[hospital.address, hospital.city, hospital.state, hospital.zip_code].filter(Boolean).join(', ')}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <Phone className="w-4 h-4 text-vibrant-blue shrink-0" />
                      <span className="text-slate-800 text-sm font-semibold truncate">{hospital.phone || hospital.contact_phone || 'N/A'}</span>
                    </div>
                    {hospital.emergency_phone && (
                      <div className="flex items-center gap-3 bg-rose-50 p-3 rounded-xl border border-rose-200/70">
                        <Siren className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-rose-900 text-sm font-semibold truncate">Emergency: {hospital.emergency_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70 sm:col-span-2 lg:col-span-1">
                      <Mail className="w-4 h-4 text-vibrant-blue shrink-0" />
                      <span className="text-slate-800 text-sm font-semibold truncate">{hospital.contact_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="pt-2 md:pt-4 w-full md:w-auto flex shrink-0">
                  <Link 
                    href={`/?hospital_id=${hospital.id}&city=${encodeURIComponent(hospital.city)}#book-consultation-form`} 
                    className="w-full md:w-auto px-7 py-3.5 bg-vibrant-blue hover:bg-primary text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.12)] transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Book Consultation</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* About, facilities, insurance and test charges */}
          {(hospital.about || facilities.length > 0 || insurance.length > 0 || tests.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              <div className="lg:col-span-2 flex flex-col gap-6">
                {hospital.about && (
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">About {hospital.name}</h2>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px]">{hospital.about}</p>
                    {hospital.established_year && <p className="mt-3 text-sm text-slate-500 font-medium">Serving patients since {hospital.established_year}</p>}
                  </section>
                )}
                {tests.length > 0 && (
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                    <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2 tracking-tight">
                      <FlaskConical className="w-5 h-5 text-vibrant-blue" /> Diagnostic Test Charges
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">Official transparent pricing for diagnostic procedures</p>
                    <ul className="divide-y divide-slate-100">
                      {tests.map((t) => (
                        <li key={t.name} className="py-3 flex items-center justify-between gap-4">
                          <span className="text-slate-800 font-medium text-sm">{t.name}</span>
                          <span className="font-bold text-vibrant-blue text-sm bg-blue-50 px-3 py-1 rounded-full shrink-0">₹{t.price.toLocaleString('en-IN')}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
              <div className="flex flex-col gap-6">
                {(facilities.length > 0 || accreditations.length > 0) && (
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                    <h2 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">Facilities &amp; Accreditations</h2>
                    <div className="flex flex-wrap gap-2">
                      {accreditations.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-vibrant-blue text-xs font-bold border border-blue-100">
                          <Award className="w-3.5 h-3.5" /> {a}
                        </span>
                      ))}
                      {facilities.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {f}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {insurance.length > 0 && (
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                    <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2 tracking-tight">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" /> Insurance Accepted
                    </h2>
                    <ul className="flex flex-col gap-2.5">
                      {insurance.map((i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-700 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {i}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* Affiliated Doctors Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Specialists at {hospital.name}
              </h2>
              {doctors && doctors.length > 0 && (
                <span className="text-sm font-semibold text-slate-500">{doctors.length} Doctors Available</span>
              )}
            </div>
            
            {doctors && doctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {doctors.map((item: any) => {
                  const name = item.profiles?.full_name || 'Specialist Doctor'
                  const initials = name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase()
                  const spec = item.departments?.name || item.specialty || 'General Physician'
                  return (
                    <div key={item.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col hover:border-vibrant-blue/50 hover:shadow-md transition-all">
                      <div className="flex gap-3.5 mb-4 items-start">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 shrink-0 flex items-center justify-center relative overflow-hidden text-vibrant-blue font-bold text-lg">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={name} fill className="object-cover" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-base mb-0.5 truncate">{name}</h3>
                          <p className="text-xs text-vibrant-blue font-semibold mb-1 truncate">{spec}</p>
                          <p className="text-xs text-slate-500 font-medium">{item.experience_years ? `${item.experience_years} Years Exp.` : 'Verified Specialist'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4 pt-3.5 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-extrabold text-slate-900">₹{item.consultation_fee ?? 500} <span className="text-xs font-normal text-slate-500">Fee</span></span>
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Available
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                        <Link 
                          href={`/doctors/${item.id}`} 
                          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center transition-colors"
                        >
                          View Profile
                        </Link>
                        <Link 
                          href={`/book/${item.id}`} 
                          className="w-full py-2 bg-vibrant-blue hover:bg-primary text-white text-xs font-bold rounded-xl text-center shadow-xs transition-colors"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-10 text-center bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No doctors are currently listed for this hospital.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
