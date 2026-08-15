import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Search, MapPin, Star, UserCircle, Building2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 0

export default async function SearchPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const query = searchParams.query as string || ''
  const city = searchParams.city as string || ''
  const specialty = searchParams.specialty as string || ''
  const hospital_id = searchParams.hospital_id as string || ''

  const supabase = await createClient()

  let queryBuilder = supabase
    .from('doctors')
    .select(`
      *,
      profiles!inner(full_name),
      hospitals!inner(name, city),
      departments!inner(name)
    `)

  if (query) {
    queryBuilder = queryBuilder.ilike('profiles.full_name', `%${query}%`)
  }
  if (city) {
    queryBuilder = queryBuilder.ilike('hospitals.city', `%${city}%`)
  }
  if (specialty) {
    queryBuilder = queryBuilder.ilike('specialty', `%${specialty}%`)
  }
  if (hospital_id) {
    queryBuilder = queryBuilder.eq('hospital_id', hospital_id)
  }

  const { data: doctors, error } = await queryBuilder

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      {/* Search Header */}
      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Find Doctors & Hospitals</h1>
          
          <form action="/search" method="GET" className="flex flex-col md:flex-row gap-4 max-w-4xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" name="query" defaultValue={query} placeholder="Search by doctor name..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900" />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" name="city" defaultValue={city} placeholder="Enter city or location" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900" />
            </div>
            <div className="flex-1 relative">
              <select name="specialty" defaultValue={specialty} className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white">
                <option value="">Any Speciality</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopaedics">Orthopaedics</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
              </select>
            </div>
            <button type="submit" className="px-8 py-3 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors rounded-full cursor-pointer">Update Search</button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="flex-1 py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {doctors ? doctors.length : 0} Doctors Found
              {(query || city || specialty) && ' for your search'}
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md mb-6">
              Error loading results: {error.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {doctors && doctors.length > 0 ? doctors.map((doc: any) => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex gap-4 mb-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                     <UserCircle className="w-10 h-10 text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{doc.profiles?.full_name}</h3>
                    <p className="text-sm text-[#E31E24] font-medium mb-1">{doc.specialty}</p>
                    <p className="text-xs text-gray-600">{doc.experience_years} Years Experience</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{doc.hospitals?.name}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{doc.hospitals?.city}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                     <span className="text-sm font-bold text-gray-900">₹{doc.consultation_fee} Fee</span>
                     <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Available</span>
                  </div>
                </div>
                
                <button className="mt-auto w-full py-2.5 bg-[#E31E24] text-white text-sm font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
                  Book Consultation
                </button>
              </div>
            )) : (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No doctors found</h3>
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
