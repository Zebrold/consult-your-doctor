import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { MapPin, Building2, UserCircle, CheckCircle2, Stethoscope, Clock, Award, FileText } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 0

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
    .limit(3)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Doctor Profile Card */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Main Profile Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start relative">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-100 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0 border-4 border-white shadow-md">
                   {doctor.image_url ? (
                     <Image src={doctor.image_url} alt={doctor.profiles?.full_name} fill className="object-cover" />
                   ) : (
                     <UserCircle className="w-20 h-20 text-gray-300" />
                   )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black text-gray-900 mb-2">{doctor.profiles?.full_name}</h1>
                      <div className="flex items-center gap-2 text-[#E31E24] font-bold text-lg mb-4">
                        <Stethoscope className="w-5 h-5" />
                        {doctor.departments?.name || doctor.specialty}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Experience</p>
                        <p className="text-sm text-gray-900 font-bold">{doctor.experience_years} Years</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <Award className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Qualification</p>
                        <p className="text-sm text-gray-900 font-bold truncate max-w-[120px]">{doctor.qualification || 'MBBS, MD'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* About & Symptoms */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E31E24]" />
                  About Doctor
                </h2>
                <div className="prose prose-sm text-gray-600 max-w-none mb-8 leading-relaxed">
                  {doctor.about ? (
                    <p>{doctor.about}</p>
                  ) : (
                    <p>No info available</p>
                  )}
                </div>

                {doctor.symptoms && doctor.symptoms.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Specializes in treating:</h3>
                    <div className="flex flex-wrap gap-2">
                      {doctor.symptoms.map((symptom: string, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-red-50 text-[#E31E24] text-sm font-semibold rounded-full border border-red-100">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Hospital & Booking */}
            <div className="space-y-6">
              
              {/* Booking Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Consultation Fee</span>
                  <span className="text-2xl font-black text-gray-900">₹{doctor.consultation_fee}</span>
                </div>

                {schedules && schedules.length > 0 ? (
                  <div className="mb-6">
                    <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" /> Next Available Slots
                    </p>
                    <div className="space-y-2">
                      {schedules.map((slot: any) => (
                        <div key={slot.id} className="w-full text-center py-2 px-3 bg-gray-50 text-sm font-medium text-gray-700 rounded-lg border border-gray-100">
                          {new Date(slot.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <p className="text-sm font-medium text-yellow-800 text-center">Contact to check availability</p>
                  </div>
                )}

                <Link 
                  href={`/?doctor_id=${doctor.id}&hospital_id=${doctor.hospital_id}&city=${encodeURIComponent(doctor.hospitals?.city || '')}&specialty=${encodeURIComponent(doctor.specialty || doctor.departments?.name || '')}#book-consultation-form`}
                  className="w-full flex items-center justify-center px-6 py-3.5 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                >
                  Book Consultation
                </Link>
              </div>

              {/* Hospital Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Practice Location</h3>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <Link href={`/hospitals/${doctor.hospital_id}`} className="font-bold text-gray-900 hover:text-[#E31E24] transition-colors line-clamp-2 leading-tight mb-1">
                      {doctor.hospitals?.name}
                    </Link>
                    <div className="flex items-start gap-1 text-sm text-gray-600 mt-2">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{doctor.hospitals?.address}, {doctor.hospitals?.city}</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
