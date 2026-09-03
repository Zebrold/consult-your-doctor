import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { MapPin, Mail, Phone, Building2, UserCircle, CheckCircle2 } from 'lucide-react'
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
    .select('name, city')
    .eq('id', id)
    .single()

  if (!hospital) {
    return { title: 'Hospital Not Found' }
  }

  return {
    title: `${hospital.name} in ${hospital.city}`,
    description: `View details, doctors, and book consultations at ${hospital.name} in ${hospital.city} through Consult Your Doctor.`,
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

  // Fetch affiliated doctors
  const { data: doctors, error: doctorsError } = await supabase
    .from('doctors')
    .select(`
      *,
      profiles!inner(full_name),
      hospitals!inner(name, city),
      departments(name)
    `)
    .eq('hospital_id', id)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          
          {/* Hospital Header Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
            <div className="h-48 bg-gradient-to-r from-red-600 to-red-800 relative">
              {/* Optional: Add a cover photo if available in the future */}
            </div>
            
            <div className="px-8 pb-8 relative">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar / Logo */}
                <div className="-mt-16 relative">
                  <div className="w-32 h-32 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden shrink-0">
                    {hospital.image_url ? (
                      <Image src={hospital.image_url} alt={hospital.name} fill className="object-cover" />
                    ) : (
                      <Building2 className="w-16 h-16 text-gray-300" />
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="pt-4 flex-1">
                  <h1 className="text-3xl font-black text-gray-900 mb-2">{hospital.name}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mb-6 font-medium">
                    <MapPin className="w-5 h-5 text-[#E31E24]" />
                    <span>{[hospital.address, hospital.city, hospital.state, hospital.zip_code].filter(Boolean).join(', ')}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-900 font-medium">{hospital.contact_phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-900 font-medium">{hospital.contact_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="pt-4 w-full md:w-auto flex shrink-0">
                  <Link 
                    href={`/?hospital_id=${hospital.id}&city=${encodeURIComponent(hospital.city)}#book-consultation-form`} 
                    className="w-full md:w-auto px-8 py-3 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-center"
                  >
                    Book Consultation
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Affiliated Doctors Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
              Specialists at {hospital.name}
            </h2>
            
            {doctors && doctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {doctors.map((item: any) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.profiles?.full_name} fill className="object-cover" />
                        ) : (
                          <UserCircle className="w-10 h-10 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{item.profiles?.full_name}</h3>
                        <p className="text-sm text-[#E31E24] font-medium mb-1">{item.departments?.name || item.specialty}</p>
                        <p className="text-xs text-gray-600">{item.experience_years} Years Experience</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{item.hospitals?.name}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{item.hospitals?.city}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-bold text-gray-900">₹{item.consultation_fee} Fee</span>
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Available</span>
                      </div>
                    </div>
                    
                    <Link href={`/doctors/${item.id}`} className="mt-auto w-full py-2.5 bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold hover:border-[#E31E24] hover:text-[#E31E24] transition-colors rounded-full text-center">
                      View Profile
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white border border-gray-200 rounded-xl">
                <p className="text-gray-500 font-medium">No doctors are currently listed for this hospital.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
