import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Find Top Doctors Online',
  description: 'Book appointments with trusted hospitals and specialists, pay securely online, and receive dedicated executive assistance throughout your healthcare journey.',
}
import { Header } from '@/components/Header'
import { HomeSearchBar } from '@/components/HomeSearchBar'
import { BookConsultationForm } from '@/components/BookConsultationForm'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Heart, Brain, Bone, Stethoscope, Baby, UserCircle, Eye, Activity,
  ChevronRight, Star
} from 'lucide-react'

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()

  // Fetch Top Doctors
  const { data: topDoctors } = await supabase
    .from('doctors')
    .select(`
      *,
      profiles(full_name),
      hospitals(name, city),
      departments(name)
    `)
    .limit(3)

  // Fetch Featured Hospitals
  const { data: featuredHospitals } = await supabase
    .from('hospitals')
    .select('*')
    .limit(4)

  // Popular Specialities Array (Icons matched by name)
  const specialitiesIcons: Record<string, any> = {
    'Cardiology': Heart,
    'Neurology': Brain,
    'Orthopaedics': Bone,
    'General Medicine': Stethoscope,
    'Pediatrics': Baby,
    'Women\'s Health': UserCircle,
    'Ophthalmology': Eye,
    'Dental': Activity,
  }

  const { data: uniqueDepartments } = await supabase
    .from('departments')
    .select('name')

  // Get unique department names
  const popularSpecialities = Array.from(new Set(uniqueDepartments?.map(d => d.name) || [])).slice(0, 8)

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col font-sans">
      <Header />

      {/* Main Content */}
      <main className="flex-grow">
        
        {/* Hero Section */}
        <section className="px-4 md:px-10 py-16 md:py-28 max-w-[1280px] mx-auto overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-on-surface)] leading-tight tracking-tight">
                World-Class Healthcare, <br />
                <span className="text-[var(--color-secondary)]">Delivered Quietly.</span>
              </h1>
              <p className="text-lg text-[var(--color-on-surface-variant)] max-w-lg leading-relaxed">
                Experience a new standard of medical consultation. Connect with top-tier specialists, book instantly, and manage your health journey with unparalleled precision.
              </p>
              <div className="pt-6 space-y-6">
                <h3 className="text-xl font-bold text-[var(--color-primary)]">Uncompromising Standards of Care</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[var(--color-secondary)] mt-1">health_and_safety</span>
                    <div>
                      <p className="text-base text-[var(--color-on-surface)] font-semibold">Personalized Care Plans</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">Tailored healthcare strategies designed specifically for your unique medical history.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[var(--color-secondary)] mt-1">workspace_premium</span>
                    <div>
                      <p className="text-base text-[var(--color-on-surface)] font-semibold">Top 1% Global Specialists</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">Access a vetted network of internationally renowned medical professionals and surgeons.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[var(--color-secondary)] mt-1">devices</span>
                    <div>
                      <p className="text-base text-[var(--color-on-surface)] font-semibold">24/7 Digital Health Access</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">Seamlessly manage appointments, records, and consultations from any device.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="w-full flex justify-center lg:justify-end">
              <div className="w-full max-w-[420px] bg-[var(--color-surface-container-lowest)] rounded-2xl p-6 md:p-8 shadow-[var(--shadow-ambient)] border border-[var(--color-surface-variant)] transition-all hover:translate-y-[-2px] hover:shadow-xl">
                <BookConsultationForm />
              </div>
            </div>
          </div>
        </section>

        {/* Global Search Bar Section */}
        <section className="py-16 px-4 md:px-10 bg-[var(--color-surface-container-lowest)] border-y border-[var(--color-surface-variant)]">
          <div className="max-w-[1280px] mx-auto">
            <Suspense fallback={<div className="h-24 flex items-center justify-center">Loading search...</div>}>
              <HomeSearchBar />
            </Suspense>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 md:px-10 bg-[var(--color-surface-container-lowest)] border-b border-[var(--color-surface-variant)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="material-symbols-outlined text-[var(--color-secondary)] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  stethoscope
                </span>
                <span className="text-xl font-bold text-[var(--color-primary)] tracking-tight">Consult your Doctor</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-[var(--color-surface-container-low)] rounded-2xl border border-[var(--color-surface-variant)]">
                <span className="text-3xl font-extrabold text-[var(--color-primary)] mb-1">60,000+</span>
                <span className="text-sm text-[var(--color-on-surface-variant)] font-medium">people getting better care</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-[var(--color-surface-container-low)] rounded-2xl border border-[var(--color-surface-variant)]">
                <span className="text-3xl font-extrabold text-[var(--color-primary)] mb-1">1,700+</span>
                <span className="text-sm text-[var(--color-on-surface-variant)] font-medium">health professionals</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-[var(--color-surface-container-low)] rounded-2xl border border-[var(--color-surface-variant)]">
                <span className="text-3xl font-extrabold text-[var(--color-primary)] mb-1">24/7</span>
                <span className="text-sm text-[var(--color-on-surface-variant)] font-medium">executive support availability</span>
              </div>
            </div>
          </div>
        </section>

        {/* Top Rated Doctors */}
        <section className="py-24 px-4 md:px-10 bg-[var(--color-surface)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-primary)] mb-4 tracking-tight">Top Rated Doctors</h2>
              <p className="text-[var(--color-on-surface-variant)] max-w-2xl mx-auto text-lg">
                Book appointments with some of our most highly-rated and experienced medical professionals.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {topDoctors?.map((doc: any) => (
                <div key={doc.id} className="bg-[var(--color-surface-container-lowest)] rounded-2xl border border-[var(--color-surface-variant)] overflow-hidden shadow-[var(--shadow-ambient)] transition-all hover:translate-y-[-4px] hover:shadow-xl flex flex-col">
                  <div className="aspect-[4/3] w-full relative bg-[var(--color-surface-container-low)] flex items-center justify-center overflow-hidden">
                    {doc.image_url ? (
                      <Image src={doc.image_url} alt={doc.profiles?.full_name} fill className="object-cover" />
                    ) : (
                      <UserCircle className="w-20 h-20 text-[var(--color-outline-variant)]" />
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-[var(--color-on-surface)]">{doc.profiles?.full_name}</h3>
                        <p className="text-[var(--color-secondary)] font-semibold text-sm mt-1">{doc.departments?.name || doc.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] px-2 py-1 rounded text-[var(--color-primary)] font-bold">
                        <Star className="w-4 h-4 text-[#Eab308] fill-current" />
                        <span className="text-sm">4.9</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                        <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">medical_information</span>
                        <span>{doc.experience_years} Years Experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                        <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">location_on</span>
                        <span className="truncate" title={`${doc.hospitals?.name}, ${doc.hospitals?.city}`}>{doc.hospitals?.name}, {doc.hospitals?.city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                        <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">payments</span>
                        <span className="font-semibold text-[var(--color-on-surface)]">₹{doc.consultation_fee}</span>
                      </div>
                    </div>
                    <Link href={`/doctors/${doc.id}`} className="mt-auto block text-center w-full bg-[var(--color-surface-container-low)] text-[var(--color-primary)] border border-[var(--color-surface-variant)] py-3 rounded-lg text-sm font-bold hover:bg-[var(--color-surface-variant)] transition-colors">
                      Book Appointment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/search" className="inline-flex items-center gap-2 text-[var(--color-secondary)] font-bold hover:underline">
                View All Doctors <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Popular Specialities */}
        <section className="py-16 px-4 md:px-10 bg-[var(--color-surface-container-lowest)] border-t border-[var(--color-surface-variant)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-primary)] tracking-tight">Popular Specialities</h2>
              <Link href="/search" className="text-[var(--color-secondary)] font-bold text-sm hover:underline flex items-center gap-1">
                View All Specialities <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {popularSpecialities.map((spec, i) => {
                const Icon = specialitiesIcons[spec] || Stethoscope
                return (
                  <Link href={`/search?specialty=${encodeURIComponent(spec)}`} key={i} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-surface-variant)] shadow-sm hover:shadow-[var(--shadow-ambient)] transition-all hover:-translate-y-1 flex flex-col items-center text-center cursor-pointer group">
                    <Icon className="w-10 h-10 text-[var(--color-secondary)] mb-4 transition-transform group-hover:scale-110" strokeWidth={1.5} />
                    <span className="text-sm font-bold text-[var(--color-on-surface)]">{spec}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* Featured Hospitals */}
        <section className="py-24 px-4 md:px-10 bg-[var(--color-surface)] border-t border-[var(--color-surface-variant)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex justify-between items-end mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-primary)] tracking-tight">Featured Hospitals</h2>
              <div className="hidden sm:flex gap-2">
                <Link href="/search?type=hospital" className="w-10 h-10 rounded-full border border-[var(--color-surface-variant)] flex items-center justify-center text-[var(--color-secondary)] hover:bg-[var(--color-surface-container-low)] transition-colors bg-[var(--color-surface-container-lowest)]">
                  <span className="material-symbols-outlined">chevron_right</span>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredHospitals?.map((hospital) => (
                <div key={hospital.id} className="bg-[var(--color-surface-container-lowest)] rounded-2xl border border-[var(--color-surface-variant)] overflow-hidden shadow-sm hover:shadow-[var(--shadow-ambient)] transition-all hover:-translate-y-1 flex flex-col">
                  <div className="aspect-[16/9] w-full relative bg-[var(--color-surface-variant)] flex items-center justify-center overflow-hidden">
                    {hospital.image_url ? (
                      <Image src={hospital.image_url} alt={hospital.name} fill className="object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-[var(--color-outline)]">apartment</span>
                    )}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded text-[var(--color-primary)] border border-[var(--color-surface-variant)] uppercase tracking-wider">
                      PARTNER
                    </span>
                  </div>
                  <div className="p-5 flex-grow flex flex-col">
                    <h3 className="text-base font-bold text-[var(--color-on-surface)] mb-1 leading-snug">{hospital.name}</h3>
                    <p className="text-sm text-[var(--color-on-surface-variant)] mb-4 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">location_on</span> 
                      {hospital.city}
                    </p>
                    <div className="flex items-center gap-4 text-sm mb-6">
                      <div>
                        <span className="text-[var(--color-secondary)] block font-bold text-base">4.8/5</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)] font-semibold">Rating</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-secondary)] block font-bold text-base">24/7</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)] font-semibold">Emergency</span>
                      </div>
                    </div>
                    <Link href={`/hospitals/${hospital.id}`} className="mt-auto block text-center w-full bg-[var(--color-surface-container-low)] text-[var(--color-primary)] border border-[var(--color-surface-variant)] py-2 rounded-lg text-sm font-bold hover:bg-[var(--color-surface-variant)] transition-colors">
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/search?type=hospital" className="inline-flex items-center gap-2 text-[var(--color-secondary)] font-bold hover:underline">
                View All Hospitals <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* About Platform / Impact */}
        <section className="py-20 px-4 md:px-10 bg-[var(--color-surface-container-lowest)] border-t border-[var(--color-surface-variant)]">
          <div className="max-w-[1280px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6">
              <span className="material-symbols-outlined text-sm">info</span>
              ABOUT CONSULT YOUR DOCTOR
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--color-primary)] mb-6 tracking-tight">A Connected Healthcare Platform</h2>
            <p className="text-lg text-[var(--color-on-surface-variant)] max-w-3xl mx-auto leading-relaxed mb-6">
              Consult Your Doctor is a pioneering health-tech ecosystem designed to bridge the gap between patients, top-tier medical specialists, renowned hospitals, and advanced diagnostic facilities. We streamline your entire medical journey through intelligent routing and frictionless scheduling.
            </p>
            <p className="text-base text-[var(--color-on-surface-variant)] max-w-3xl mx-auto leading-relaxed mb-10">
              Built on a foundation of responsible AI and uncompromising patient-centred design, our platform ensures your health data remains secure while giving you immediate access to second opinions, emergency care coordinators, and personalized wellness plans from anywhere in the world.
            </p>
            <Link href="/about" className="inline-flex items-center justify-center gap-2 bg-[var(--color-secondary)] text-[var(--color-on-secondary)] px-8 py-3 rounded-full font-bold hover:opacity-90 transition-opacity shadow-sm">
              Learn More About Us <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* App Download Image Section */}
        <section className="py-16 bg-[var(--color-surface)] border-t border-[var(--color-surface-variant)] flex justify-center px-4 md:px-10">
          <Image 
            src="/app_download.png" 
            alt="Download Consult Your Doctor App" 
            width={1200} 
            height={400} 
            className="w-full max-w-[1200px] h-auto object-contain rounded-2xl shadow-[var(--shadow-ambient)]" 
            priority
          />
        </section>

      </main>
    </div>
  )
}

