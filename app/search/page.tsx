import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Search, MapPin, Star, UserCircle, Building2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Search Doctors and Hospitals | Consult Your Doctor',
  description: 'Search for top doctors, specialists, and partner hospitals near you.',
}

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

  const specialtiesParam = searchParams.specialties as string || ''
  const filterSpecialties = specialtiesParam ? specialtiesParam.split(',') : []

  const supabase = await createClient()

  const { data: dbDoctors } = await supabase.from('doctors').select('specialty')
  const fetchedSpecialties = Array.from(new Set((dbDoctors || []).map(d => d.specialty).filter(Boolean))).sort()

  let results: any[] = []
  let error: any = null

  if (type === 'hospital') {
    let queryBuilder = supabase.from('hospitals').select('*')
    if (query) queryBuilder = queryBuilder.ilike('name', `%${query}%`)
    if (city) queryBuilder = queryBuilder.ilike('city', `%${city}%`)

    const response = await queryBuilder
    results = response.data || []
    error = response.error
  } else {
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
        queryBuilder = queryBuilder.ilike('specialty', `%${query}%`)
      } else {
        queryBuilder = queryBuilder.ilike('profiles.full_name', `%${query}%`)
      }
    }

    if (city) queryBuilder = queryBuilder.ilike('hospitals.city', `%${city}%`)
    if (specialty) queryBuilder = queryBuilder.ilike('specialty', `%${specialty}%`)
    if (hospital_id) queryBuilder = queryBuilder.eq('hospital_id', hospital_id)
    if (filterSpecialties.length > 0) queryBuilder = queryBuilder.in('specialty', filterSpecialties)

    const response = await queryBuilder
    results = response.data || []
    error = response.error
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col font-sans">
      <Header />

      <main className="w-full flex-grow flex flex-col md:flex-row relative max-h-none md:h-[calc(100vh-80px)]">
        {/* Left Panel: Search & List */}
        <div className="w-full md:w-[40%] flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-surface-variant)] z-10 shadow-lg overflow-hidden h-full">
          {/* Sticky Search Header */}
          <div className="p-6 bg-[var(--color-surface)] flex-shrink-0 z-20 border-b border-[var(--color-surface-variant)]">
            <h1 className="text-3xl font-extrabold text-[var(--color-primary)] mb-6 tracking-tight">
              Find {type === 'hospital' ? 'Hospitals' : 'Specialist'}
            </h1>
            
            {/* Search Input */}
            <form action="/search" method="GET" className="relative mb-4">
              <input type="hidden" name="type" value={type} />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                name="query"
                defaultValue={query}
                className="w-full bg-white border border-[var(--color-surface-variant)] rounded-full py-3.5 pl-12 pr-4 focus:outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 transition-all text-sm text-[var(--color-primary)] placeholder-gray-400 shadow-sm" 
                placeholder={`Search by ${type === 'hospital' ? 'name or city' : 'name, condition, or specialty'}...`}
                type="text"
              />
            </form>

            {/* Horizontal Filters (Specialties) */}
            {type !== 'hospital' && fetchedSpecialties.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide">
                <Link 
                  href={`/search?type=doctor`} 
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                    !specialty && filterSpecialties.length === 0
                      ? 'bg-[var(--color-secondary)]/10 border-2 border-[var(--color-secondary)] text-[var(--color-secondary)]'
                      : 'bg-white border border-[var(--color-outline-variant)] text-[var(--color-primary)] hover:border-[var(--color-secondary)]'
                  }`}
                >
                  All
                </Link>
                {fetchedSpecialties.map((spec: any) => {
                  const isActive = specialty === spec || filterSpecialties.includes(spec)
                  return (
                    <Link 
                      key={spec}
                      href={`/search?type=doctor&specialty=${encodeURIComponent(spec)}`}
                      className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-[var(--color-secondary)]/10 border-2 border-[var(--color-secondary)] text-[var(--color-secondary)]'
                          : 'bg-white border border-[var(--color-outline-variant)] text-[var(--color-primary)] hover:border-[var(--color-secondary)]'
                      }`}
                    >
                      {spec}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* List Scroll Area */}
          <div className="flex-grow overflow-y-auto px-6 pb-6 pt-4 space-y-4 bg-gray-50/50 h-full">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl mb-4 text-sm font-bold">
                Error loading results: {error.message}
              </div>
            )}

            {results && results.length > 0 ? (
              results.map((item: any) => {
                if (type === 'hospital') {
                  return (
                    <div key={item.id} className="bg-white p-5 rounded-2xl border border-[var(--color-surface-variant)] shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-primary)] shrink-0 border-2 border-[var(--color-surface-container-low)] group-hover:border-[var(--color-secondary)] transition-colors overflow-hidden relative">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[32px]">local_hospital</span>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base font-bold text-[var(--color-primary)]">{item.name}</h3>
                              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">{item.city}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] px-2 py-1 rounded-full">
                              <span className="material-symbols-outlined text-[14px] text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              <span className="text-xs font-bold text-[var(--color-primary)]">4.5</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Open 24/7</span>
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Multi-specialty</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[var(--color-surface-variant)] flex gap-3">
                        <Link href={`/hospitals/${item.id}`} className="flex-grow text-center bg-white border-2 border-[var(--color-surface-variant)] text-[var(--color-primary)] rounded-full py-2 text-xs font-bold hover:bg-gray-50 transition-colors">
                          View Details
                        </Link>
                        <Link href={`/search?type=doctor&hospital_id=${item.id}`} className="flex-grow text-center bg-[var(--color-secondary)] text-white rounded-full py-2 text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                          Find Doctors Here
                        </Link>
                      </div>
                    </div>
                  )
                }

                // Doctor Card
                return (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-[var(--color-surface-variant)] shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-transparent group-hover:border-[var(--color-secondary)] transition-colors relative bg-gray-100 flex items-center justify-center">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.profiles?.full_name} fill className="object-cover" />
                        ) : (
                          <UserCircle className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-base font-bold text-[var(--color-primary)]">{item.profiles?.full_name}</h3>
                              <span className="material-symbols-outlined text-[var(--color-secondary)] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            </div>
                            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">{item.specialty}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] px-2 py-1 rounded-full">
                            <span className="material-symbols-outlined text-[14px] text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="text-xs font-bold text-[var(--color-primary)]">4.9</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Available Today</span>
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">{item.experience_years} yrs exp</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {item.hospitals?.name}, {item.hospitals?.city}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--color-surface-variant)] flex gap-3">
                      <Link href={`/doctors/${item.id}`} className="flex-grow text-center bg-white border-2 border-[var(--color-surface-variant)] text-[var(--color-primary)] rounded-full py-2 text-xs font-bold hover:bg-gray-50 transition-colors">
                        View Profile
                      </Link>
                      <button className="flex-grow text-center bg-[var(--color-secondary)] text-white rounded-full py-2 text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                        Book Now
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-[var(--color-surface-variant)]">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">No results found</h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] max-w-[250px]">
                  Try adjusting your search criteria or checking another city.
                </p>
                <Link href="/search" className="mt-6 px-6 py-2 bg-[var(--color-surface-container-low)] text-[var(--color-primary)] text-xs font-bold rounded-full hover:bg-[var(--color-surface-variant)] transition-colors">
                  Clear Filters
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Interactive Map */}
        <div className="hidden md:block w-[60%] h-full relative bg-[var(--color-surface-container-low)] overflow-hidden">
          <div className="absolute inset-0 opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTAgMjBoNDBNMCAzMGg0ME0xMCAwdjQwTTIwIDB2NDBNMzAgMHY0MCIgc3Ryb2tlPSIjZGFlMmZkIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')]"></div>
          <Image 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-EtPvnshPCg3CPHZPVsmudZBNVbu304Wc6d6IUUZPPgVJIArxIab5s52Rlr3LpA8dBF0T8tCFMSm9TGpBk25OHrNvgHDbTlvdB4CbT7Dw4LYrtIllPYSMDe2Q88cTOeMGf4pjWTZikQWEL_h6qAxnMzzeUVDUAeGrahZjyhZdl1bAIqUIDin_0qGCJjSp1KXkfLWhkjf3hDY8itk9SpDfRpHCT0dVdsrMu1wUYKAwlxGKPaSsv8iksg" 
            alt="Map"
            fill
            className="object-cover mix-blend-multiply opacity-60 pointer-events-none"
          />

          {/* Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
            <button className="bg-white/80 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-primary)] shadow-sm hover:scale-105 transition-transform border border-white">
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className="bg-white/80 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-primary)] shadow-sm hover:scale-105 transition-transform border border-white">
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button className="bg-white/80 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-secondary)] shadow-sm hover:scale-105 transition-transform mt-2 border border-white">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
            </button>
          </div>

          {/* Map Pins (Simulated based on first 2 results for visual) */}
          {results && results.length > 0 && (
            <div className="absolute top-[45%] left-[45%] z-20 transform -translate-x-1/2 -translate-y-full group cursor-pointer">
              <div className="relative flex flex-col items-center">
                <div className="bg-[var(--color-secondary)] border-2 border-white rounded-full p-1 shadow-lg scale-110">
                  <div className="w-10 h-10 rounded-full overflow-hidden relative border-2 border-white bg-white flex items-center justify-center">
                    {type === 'hospital' ? (
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-secondary)]">local_hospital</span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-secondary)]">person</span>
                    )}
                  </div>
                </div>
                <div className="w-4 h-4 bg-[var(--color-secondary)] transform rotate-45 -mt-2 shadow-sm"></div>
              </div>
            </div>
          )}

          {/* Search Area Badge */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg border border-white flex items-center gap-3 z-20 w-max">
            <span className="material-symbols-outlined text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span className="text-sm text-[var(--color-primary)] font-bold">
              Searching in: <span className="text-[var(--color-secondary)]">{city || 'All Locations'}</span>
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
