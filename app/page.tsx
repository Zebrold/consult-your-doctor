import { Suspense } from 'react'
import { Header } from '@/components/Header'
import { HomeSearchBar } from '@/components/HomeSearchBar'
import { BookConsultationForm } from '@/components/BookConsultationForm'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Heart, Brain, Bone, Stethoscope, Baby, UserCircle, Eye, Activity,
  Search, ShieldCheck, CreditCard, Building2, UserPlus, UserCheck, Calendar,
  FileText, Clock, FileDigit, PhoneCall, CheckCircle2, MapPin, Search as SearchIcon,
  ChevronRight, Star, Headset
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
    .limit(4)

  // Fetch Featured Hospitals
  const { data: featuredHospitals } = await supabase
    .from('hospitals')
    .select('*')
    .limit(5)

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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      {/* Hero Section */}
      <section
        className="relative w-full border-b border-gray-200 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/hero-bg.jpg")' }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent pointer-events-none"></div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 py-12 md:py-20 flex flex-col lg:flex-row items-start gap-12">
          {/* Left Text */}
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Healthcare <br /> Made Simple <br />
              <span className="text-[#E31E24]">Consult Your Doctor</span>
            </h1>
            <h2 className="text-xl font-semibold text-gray-800">Your Personal Healthcare Concierge</h2>
            <p className="text-gray-600 max-w-lg">
              Book appointments with trusted hospitals and specialists, pay securely online, and receive dedicated executive assistance throughout your healthcare journey.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a href="#book-consultation-form" className="px-6 py-3 bg-[#E31E24] text-white font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer inline-block">
                Book Appointment
              </a>
              <Link href="/search" className="px-6 py-3 bg-white text-gray-800 border border-gray-300 font-semibold hover:bg-gray-50 transition-colors rounded-full cursor-pointer inline-block">
                Find a Doctor
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-gray-200 mt-8">
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <UserCheck className="w-5 h-5" /> 500+
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Doctors</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <Building2 className="w-5 h-5" /> 100+
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Partner Hospitals</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <Heart className="w-5 h-5" /> 1 Lakh+
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Happy Patients</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <PhoneCall className="w-5 h-5" /> 24/7
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Executive Support</div>
              </div>
            </div>
          </div>

          <div id="book-consultation-form" className="w-full flex justify-center lg:w-auto lg:block">
            <BookConsultationForm />
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex flex-wrap justify-between gap-6 text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#E31E24]" /> Trusted Healthcare Platform</div>
          <div className="flex items-center gap-2"><PhoneCall className="w-5 h-5 text-[#E31E24]" /> 24/7 Executive Support</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#E31E24]" /> Verified Doctors</div>
          <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#E31E24]" /> Secure Payments</div>
          <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-[#E31E24]" /> NABH Partner Hospitals</div>
          <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-[#E31E24]" /> End-to-End Guidance</div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="bg-white py-12">
        <Suspense fallback={<div className="h-24 flex items-center justify-center">Loading search...</div>}>
          <HomeSearchBar />
        </Suspense>
      </section>

      {/* Popular Specialities */}
      <section className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8 gap-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap">Popular Specialities</h2>
            <Link href="/search" className="text-[#E31E24] text-xs sm:text-sm font-semibold flex items-center whitespace-nowrap shrink-0">
              View All <span className="hidden sm:inline ml-1">Specialities</span> <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {popularSpecialities.map((spec, i) => {
              const Icon = specialitiesIcons[spec] || Stethoscope
              return (
                <Link href={`/search?specialty=${encodeURIComponent(spec)}`} key={i} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-4 hover:shadow-md transition-shadow cursor-pointer hover:border-[#E31E24] group">
                  <Icon className="w-10 h-10 text-[#E31E24] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-gray-700 text-center">{spec}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Hospitals */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8 gap-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap">Featured Hospitals</h2>
            <Link href="/search" className="text-[#E31E24] text-xs sm:text-sm font-semibold flex items-center whitespace-nowrap shrink-0">
              View All <span className="hidden sm:inline ml-1">Hospitals</span> <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {featuredHospitals?.map((hospital, i) => (
              <div key={hospital.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="h-32 w-full relative flex items-center justify-center bg-gray-100 overflow-hidden">
                  {hospital.image_url ? (
                    <Image src={hospital.image_url} alt={hospital.name} fill className="object-cover" />
                  ) : (
                    <Building2 className="w-12 h-12 text-gray-300" />
                  )}
                  <div className="absolute bottom-2 right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1 text-gray-900 z-10">
                    <Star className="w-3 h-3 fill-current" /> 4.5
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 mb-1">{hospital.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{hospital.city}</p>
                  <p className="text-xs font-medium text-gray-600 mb-4 truncate" title={hospital.address}>{hospital.address}</p>
                  <Link href={`/search?hospital_id=${hospital.id}`} className="mt-auto block text-center w-full py-2 border border-[#E31E24] text-[#E31E24] text-sm font-semibold hover:bg-red-50 transition-colors rounded-full cursor-pointer">
                    View Doctors
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Doctors */}
      <section className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8 gap-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap">Top Doctors</h2>
            <Link href="/search" className="text-[#E31E24] text-xs sm:text-sm font-semibold flex items-center whitespace-nowrap shrink-0">
              View All <span className="hidden sm:inline ml-1">Doctors</span> <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topDoctors?.map((doc: any, i: number) => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow">
                <div className="w-20 h-24 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden">
                  {doc.image_url ? (
                    <Image src={doc.image_url} alt={doc.profiles?.full_name} fill className="object-cover" />
                  ) : (
                    <UserCircle className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 text-sm mb-0.5">{doc.profiles?.full_name}</h3>
                  <p className="text-[10px] text-gray-500 mb-0.5">{doc.specialty}</p>
                  <p className="text-[10px] text-gray-500 mb-2 truncate" title={`${doc.hospitals?.name}, ${doc.hospitals?.city}`}>{doc.hospitals?.name}, {doc.hospitals?.city}</p>
                  <p className="text-[10px] font-medium text-gray-700 mb-0.5"><span className="text-[#E31E24]">{doc.experience_years}</span> Years Exp.</p>
                  <p className="text-[10px] font-medium text-gray-700 mb-3"><span className="text-[#E31E24]">₹{doc.consultation_fee}</span> Consultation Fee</p>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available</span>
                    <button className="px-4 py-1.5 bg-[#E31E24] text-white text-xs font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer">Book</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">Why Choose Consult Your Doctor?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: PhoneCall, title: 'Executive Assistance', desc: 'A dedicated executive supports you from booking to hospital visit.' },
              { icon: Building2, title: 'Verified Hospitals', desc: 'Partner with trusted multi-specialty hospitals across India.' },
              { icon: CreditCard, title: 'Secure Payment', desc: 'Encrypted payments with multiple safe options.' },
              { icon: Clock, title: 'Priority Appointment', desc: 'Get quicker access to specialists with priority scheduling.' },
              { icon: FileDigit, title: 'Digital Medical Records', desc: 'Store prescriptions and reports securely in your digital locker.' },
              { icon: Headset, title: '24/7 Support', desc: 'Dedicated support whenever you need us.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 text-left flex gap-4 hover:shadow-md transition-shadow">
                <div className="shrink-0 mt-1">
                  <item.icon className="w-8 h-8 text-[#E31E24]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
