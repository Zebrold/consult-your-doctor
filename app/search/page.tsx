import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Search, MapPin, Star, UserCircle, Building2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { HomeSearchBar } from '@/components/HomeSearchBar'
import { Suspense } from 'react'

export const revalidate = 0

export default async function SearchPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const type = searchParams.type as string || 'doctor'
  const query = searchParams.query as string || ''
  const city = searchParams.city as string || ''
  const specialty = searchParams.specialty as string || ''
  const hospital_id = searchParams.hospital_id as string || ''

  const supabase = await createClient()

  let results: any[] = []
  let error: any = null

  if (type === 'hospital') {
    // Query Hospitals
    let queryBuilder = supabase.from('hospitals').select('*')
    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`)
    }
    if (city) {
      queryBuilder = queryBuilder.ilike('city', `%${city}%`)
    }
    
    const response = await queryBuilder
    results = response.data || []
    error = response.error
  } else {
    // Query Doctors (for doctor, specialty, symptoms, city types)
    let queryBuilder = supabase
      .from('doctors')
      .select(`
        *,
        profiles!inner(full_name),
        hospitals!inner(name, city),
        departments!inner(name)
      `)

    if (query) {
      if (type === 'specialty' || type === 'symptoms') {
        // Search by specialty
        queryBuilder = queryBuilder.ilike('specialty', `%${query}%`)
      } else {
        // Search by doctor name
        queryBuilder = queryBuilder.ilike('profiles.full_name', `%${query}%`)
      }
    }
    
    if (city) {
      queryBuilder = queryBuilder.ilike('hospitals.city', `%${city}%`)
    }
    
    // Explicit specialty/hospital filters
    if (specialty) {
      queryBuilder = queryBuilder.ilike('specialty', `%${specialty}%`)
    }
    if (hospital_id) {
      queryBuilder = queryBuilder.eq('hospital_id', hospital_id)
    }

    const response = await queryBuilder
    results = response.data || []
    error = response.error
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      {/* Search Header */}
      <section className="bg-white border-b border-gray-200 py-8">
        <Suspense fallback={<div className="h-24 flex items-center justify-center">Loading search...</div>}>
          <HomeSearchBar />
        </Suspense>
      </section>

      {/* Results */}
      <section className="flex-1 py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {results ? results.length : 0} {type === 'hospital' ? 'Hospitals' : 'Doctors'} Found
              {(query || city || specialty) && ' for your search'}
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md mb-6">
              Error loading results: {error.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results && results.length > 0 ? results.map((item: any) => {
              if (type === 'hospital') {
                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-20 bg-red-50 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                        ) : (
                          <Building2 className="w-10 h-10 text-[#E31E24]" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight">{item.name}</h3>
                        <div className="flex items-start gap-1 text-sm text-gray-600 mt-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span>{item.address}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Contact:</span>
                        <span className="font-medium text-gray-900">{item.contact_email}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">City:</span>
                        <span className="font-medium text-gray-900">{item.city}</span>
                      </div>
                    </div>
                    
                    <button className="mt-auto w-full py-2.5 bg-white border-2 border-[#E31E24] text-[#E31E24] text-sm font-bold hover:bg-red-50 transition-colors rounded-full cursor-pointer">
                      View Hospital
                    </button>
                  </div>
                )
              }
              
              // Doctor Card
              return (
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
                      <p className="text-sm text-[#E31E24] font-medium mb-1">{item.specialty}</p>
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
                  
                  <button className="mt-auto w-full py-2.5 bg-[#E31E24] text-white text-sm font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
                    Book Consultation
                  </button>
                </div>
              )
            }) : (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                <p>Try adjusting your search filters to find more options.</p>
                <Link href="/search" className="mt-4 inline-block px-6 py-2 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50">
                  Clear Filters
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
