'use client'

import { Search, Star, BadgeCheck, Hospital, Plus, Minus, LocateFixed, MapPin, User, ChevronDown, TestTubeDiagonal, IndianRupee, Building2, Activity } from "lucide-react"
import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"

function SearchClientInner({ 
  type,
  doctors, 
  cities, 
  hospitals,
  filteredHospitals,
  specialties,
  diagnosticCenters,
  allTests
}: { 
  type: string,
  doctors: any[], 
  cities: string[], 
  hospitals: any[],
  filteredHospitals: any[],
  specialties: string[],
  diagnosticCenters: any[],
  allTests: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null)

  const currentSpecialty = searchParams.get('specialty') || ''
  const currentCity = searchParams.get('city') || searchParams.get('location') || ''
  const currentHospital = searchParams.get('hospital_id') || ''
  const currentTest = searchParams.get('test') || ''

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ q: query })
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Preserve type in the query string
    if (!params.has('type')) params.set('type', type || 'doctor')
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Determine which items to show on map
  const listItems = type === 'diagnostic' ? diagnosticCenters : type === 'hospital' ? filteredHospitals : doctors;

  // Generate pseudo-random coordinates for map pins based on items ID
  const mapPins = useMemo(() => {
    return listItems.map((item) => {
      // Hash function to get consistent x, y for an item
      let hash = 0
      for (let i = 0; i < item.id.length; i++) {
        hash = item.id.charCodeAt(i) + ((hash << 5) - hash)
      }
      // Map to roughly 15% to 85% range for top and left
      const top = 15 + (Math.abs(hash) % 70)
      const left = 15 + (Math.abs(hash >> 8) % 70)
      return { ...item, top, left }
    })
  }, [listItems])

  // Dynamic heading and placeholder based on type
  const heading = type === 'diagnostic' ? 'Find Diagnostics' : type === 'hospital' ? 'Find Hospitals' : 'Find Specialist';
  const placeholder = type === 'diagnostic' ? 'Search diagnostic centers...' : type === 'hospital' ? 'Search hospitals by name...' : 'Search by name or condition...';

  return (
    <div className="w-full h-[calc(100vh-88px)] min-h-[600px] flex flex-col md:flex-row overflow-hidden relative">
      {/* Left Panel: Search & List */}
      <div className="w-full md:w-[40%] h-full flex flex-col bg-indigo-gray-50 border-r border-indigo-gray-200 z-10 shadow-[4px_0px_24px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Sticky Search Header */}
        <div className="p-6 bg-indigo-gray-50 flex-shrink-0 z-20">
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6">
            {heading}
          </h1>
          
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-gray-600 w-5 h-5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-indigo-gray-200 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-vibrant-blue focus:ring-4 focus:ring-vibrant-blue/10 transition-all font-body-md text-on-surface placeholder:text-indigo-gray-600 shadow-sm"
              placeholder={placeholder}
              type="text"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <select 
                value={currentCity}
                onChange={(e) => {
                  updateFilters({ city: e.target.value, hospital_id: '' })
                }}
                className="w-full appearance-none bg-white border border-indigo-gray-200 rounded-xl py-2 pl-3 pr-8 font-label-sm text-indigo-gray-900 focus:outline-none focus:border-vibrant-blue"
              >
                <option value="">All Cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-500 pointer-events-none" />
            </div>
            {type === 'doctor' && (
              <div className="relative flex-1">
                <select 
                  value={currentHospital}
                  onChange={(e) => updateFilters({ hospital_id: e.target.value })}
                  className="w-full appearance-none bg-white border border-indigo-gray-200 rounded-xl py-2 pl-3 pr-8 font-label-sm text-indigo-gray-900 focus:outline-none focus:border-vibrant-blue"
                >
                  <option value="">All Hospitals</option>
                  {hospitals.filter(h => !currentCity || h.city === currentCity).map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-500 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Horizontal Filters (Specialties) - only show for doctor searches */}
          {type === 'doctor' && (
            <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 pt-2">
              <button 
                onClick={() => updateFilters({ specialty: '' })}
                className={`flex-shrink-0 border rounded-full px-4 py-1.5 font-label-sm text-label-sm transition-colors ${!currentSpecialty ? 'bg-primary-container/10 border-2 border-vibrant-blue text-vibrant-blue' : 'bg-white border-indigo-gray-200 text-indigo-gray-900 hover:border-vibrant-blue'}`}
              >
                All
              </button>
              {specialties.map(spec => (
                <button 
                  key={spec}
                  onClick={() => updateFilters({ specialty: spec === currentSpecialty ? '' : spec })}
                  className={`flex-shrink-0 border rounded-full px-4 py-1.5 font-label-sm text-label-sm transition-colors ${currentSpecialty === spec ? 'bg-primary-container/10 border-2 border-vibrant-blue text-vibrant-blue' : 'bg-white border-indigo-gray-200 text-indigo-gray-900 hover:border-vibrant-blue'}`}
                >
                  {spec}
                </button>
              ))}
            </div>
          )}

          {/* Horizontal Filters (Test Types) - only show for diagnostic searches */}
          {type === 'diagnostic' && allTests.length > 0 && (
            <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 pt-2">
              <button 
                onClick={() => updateFilters({ test: '' })}
                className={`flex-shrink-0 border rounded-full px-4 py-1.5 font-label-sm text-label-sm transition-colors ${!currentTest ? 'bg-primary-container/10 border-2 border-vibrant-blue text-vibrant-blue' : 'bg-white border-indigo-gray-200 text-indigo-gray-900 hover:border-vibrant-blue'}`}
              >
                All Tests
              </button>
              {allTests.map(test => {
                const testSlug = test.toLowerCase().replace(/ /g, '-')
                return (
                  <button 
                    key={test}
                    onClick={() => updateFilters({ test: currentTest === testSlug ? '' : testSlug })}
                    className={`flex-shrink-0 border rounded-full px-4 py-1.5 font-label-sm text-label-sm transition-colors ${currentTest === testSlug ? 'bg-primary-container/10 border-2 border-vibrant-blue text-vibrant-blue' : 'bg-white border-indigo-gray-200 text-indigo-gray-900 hover:border-vibrant-blue'}`}
                  >
                    {test}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* List Scroll Area */}
        <div className="flex-grow overflow-y-auto px-6 pb-6 pt-2 space-y-4">

          {/* === DIAGNOSTIC CENTERS === */}
          {type === 'diagnostic' ? (
            diagnosticCenters.length === 0 ? (
              <div className="text-center py-10 text-indigo-gray-500 font-body-md">
                No diagnostic centers found matching your criteria.
              </div>
            ) : (
              diagnosticCenters.map((center) => {
                const isActive = activeDoctorId === center.id
                const testsToShow = center.available_tests?.slice(0, 4) || []
                const moreCount = (center.available_tests?.length || 0) - 4
                
                return (
                  <div 
                    key={center.id} 
                    onMouseEnter={() => setActiveDoctorId(center.id)}
                    onMouseLeave={() => setActiveDoctorId(null)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group flex flex-col ${isActive ? 'border-2 border-vibrant-blue shadow-[0_8px_24px_rgba(0,102,255,0.08)] bg-primary-container/5' : 'border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)]'}`}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors flex items-center justify-center bg-indigo-50 ${isActive ? 'border-vibrant-blue' : 'border-surface-container-low group-hover:border-vibrant-blue'}`}>
                        <TestTubeDiagonal className="w-7 h-7 text-vibrant-blue" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="font-title-md text-title-md text-on-surface truncate" title={center.name}>
                          {center.name}
                        </h3>
                        <div className="flex items-center gap-1 text-indigo-gray-600 mt-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <p className="font-label-sm text-label-sm truncate">
                            {center.city}
                          </p>
                        </div>
                        {center.address && (
                          <p className="font-label-sm text-xs text-indigo-gray-500 mt-0.5 line-clamp-1">
                            {center.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Available Tests Pills */}
                    {testsToShow.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {testsToShow.map((test: string) => {
                          const price = center.test_prices?.[test]
                          return (
                            <span 
                              key={test} 
                              className="bg-indigo-50 text-vibrant-blue font-label-sm text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1"
                            >
                              <Activity className="w-3 h-3" />
                              {test}
                              {price && <span className="text-fresh-teal font-semibold ml-0.5">₹{price}</span>}
                            </span>
                          )
                        })}
                        {moreCount > 0 && (
                          <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap">
                            +{moreCount} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-3 border-t border-indigo-gray-50 flex gap-3">
                      <Link 
                        href={`/diagnostics/${center.id}`}
                        className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors text-center inline-block"
                      >
                        View Details
                      </Link>
                      <Link 
                        href={`/?booking=diagnostics&city=${center.city}&center_id=${center.id}`}
                        className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)] text-center inline-block"
                      >
                        Book Test
                      </Link>
                    </div>
                  </div>
                )
              })
            )

          /* === HOSPITALS === */
          ) : type === 'hospital' ? (
            filteredHospitals.length === 0 ? (
              <div className="text-center py-10 text-indigo-gray-500 font-body-md">
                No hospitals found matching your criteria.
              </div>
            ) : (
              filteredHospitals.map((hospital) => {
                const isActive = activeDoctorId === hospital.id
                
                return (
                  <div 
                    key={hospital.id} 
                    onMouseEnter={() => setActiveDoctorId(hospital.id)}
                    onMouseLeave={() => setActiveDoctorId(null)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group flex flex-col ${isActive ? 'border-2 border-vibrant-blue shadow-[0_8px_24px_rgba(0,102,255,0.08)] bg-primary-container/5' : 'border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)]'}`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors flex items-center justify-center bg-indigo-gray-100 ${isActive ? 'border-vibrant-blue' : 'border-surface-container-low group-hover:border-vibrant-blue'}`}>
                        {hospital.image_url ? (
                          <img
                            className="w-full h-full object-cover"
                            alt={hospital.name}
                            src={hospital.image_url}
                          />
                        ) : (
                          <Hospital className="w-8 h-8 text-indigo-gray-400" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-title-md text-title-md text-on-surface truncate" title={hospital.name}>
                              {hospital.name}
                            </h3>
                            <div className="flex items-center gap-1 text-indigo-gray-600 mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <p className="font-label-sm text-label-sm truncate">
                                {hospital.city}
                              </p>
                            </div>
                            <p className="font-label-sm text-xs text-indigo-gray-500 mt-0.5 truncate">
                              {hospital.address || 'Address not available'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full flex-shrink-0">
                            <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                            <span className="font-label-sm text-label-sm text-on-surface">4.8</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-indigo-gray-50 flex gap-3">
                      <Link 
                        href={`/hospitals/${hospital.id}`}
                        className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors text-center inline-block"
                      >
                        View Details
                      </Link>
                      <Link 
                        href={`/?type=hospital&city=${hospital.city}&hospital_id=${hospital.id}`}
                        className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)] text-center inline-block"
                      >
                        Book Consultation
                      </Link>
                    </div>
                  </div>
                )
              })
            )

          /* === DOCTORS (default) === */
          ) : (
            doctors.length === 0 ? (
              <div className="text-center py-10 text-indigo-gray-500 font-body-md">
                No doctors found matching your criteria.
              </div>
            ) : (
              doctors.map((doctor) => {
                const profile = doctor.profiles
                const hospital = doctor.hospitals
                const isActive = activeDoctorId === doctor.id
                
                return (
                  <div 
                    key={doctor.id} 
                    onMouseEnter={() => setActiveDoctorId(doctor.id)}
                    onMouseLeave={() => setActiveDoctorId(null)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group ${isActive ? 'border-2 border-vibrant-blue shadow-[0_8px_24px_rgba(0,102,255,0.08)] bg-primary-container/5' : 'border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)]'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 flex-shrink-0 transition-colors flex items-center justify-center bg-indigo-gray-100 ${isActive ? 'border-vibrant-blue' : 'border-surface-container-low group-hover:border-vibrant-blue'}`}>
                        {doctor.image_url ? (
                          <img
                            className="w-full h-full object-cover"
                            alt={profile?.full_name}
                            src={doctor.image_url}
                          />
                        ) : (
                          <User className="w-8 h-8 text-indigo-gray-400" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-title-md text-title-md text-on-surface truncate" title={profile?.full_name}>
                              {profile?.full_name || 'Unknown Doctor'}
                            </h3>
                            <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1 truncate">
                              {doctor.specialty}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full flex-shrink-0">
                            <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                            <span className="font-label-sm text-label-sm text-on-surface">4.9</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full whitespace-nowrap">Available</span>
                          <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full whitespace-nowrap">{doctor.experience_years || 0} yrs exp</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
                      <Link 
                        href={`/doctors/${doctor.id}`}
                        className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors text-center inline-block"
                      >
                        View Profile
                      </Link>
                      <Link 
                        href={`/?city=${hospital?.city || ''}&hospital_id=${doctor.hospital_id || ''}&specialty=${doctor.specialty || ''}&doctor_id=${doctor.id}`}
                        className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)] text-center inline-block"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* Right Panel: Interactive Map */}
      <div className="hidden md:block w-[60%] h-full relative bg-surface-container-low">
        {/* Simulated Map Background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTAgMjBoNDBNMCAzMGg0ME0xMCAwdjQwTTIwIDB2NDBNMzAgMHY0MCIgc3Ryb2tlPSIjZGFlMmZkIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')] opacity-50 z-10 pointer-events-none"></div>
        <iframe 
          className="w-full h-full absolute inset-0 opacity-40 pointer-events-none filter grayscale contrast-125 saturate-50"
          src="https://www.openstreetmap.org/export/embed.html?bbox=72.80%2C18.90%2C77.40%2C28.70&layer=mapnik" 
          frameBorder="0"
          scrolling="no"
        />
        
        {/* Map Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
          <button className="bg-white/70 backdrop-blur border border-white/40 w-10 h-10 rounded-full flex items-center justify-center text-on-surface shadow-sm hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </button>
          <button className="bg-white/70 backdrop-blur border border-white/40 w-10 h-10 rounded-full flex items-center justify-center text-on-surface shadow-sm hover:scale-105 transition-transform">
            <Minus className="w-5 h-5" />
          </button>
          <button className="bg-white/70 backdrop-blur border border-white/40 w-10 h-10 rounded-full flex items-center justify-center text-vibrant-blue shadow-sm hover:scale-105 transition-transform mt-2">
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>

        {/* Map Pins */}
        {mapPins.map((item) => {
          const isDoctor = type === 'doctor';
          const isDiag = type === 'diagnostic';
          const profile = isDoctor ? item.profiles : null;
          const isSelected = activeDoctorId === item.id;
          const name = isDoctor ? (profile?.full_name || 'Unknown') : item.name;
          const subtitle = isDoctor ? item.specialty : isDiag ? (item.available_tests?.slice(0, 2).join(', ') || '') : item.city;
          const subSubtitle = isDoctor ? item.hospitals?.name : (item.address || item.city || '');

          // If an item is selected, ONLY show that item's pin
          if (activeDoctorId && !isSelected) return null

          return (
            <div 
              key={item.id}
              className={`absolute z-30 transform -translate-x-1/2 -translate-y-full group cursor-pointer transition-all duration-300 ${isSelected ? 'scale-110 z-40' : 'scale-100 z-20 hover:z-40'}`}
              style={{ top: `${item.top}%`, left: `${item.left}%` }}
              onMouseEnter={() => setActiveDoctorId(item.id)}
              onMouseLeave={() => setActiveDoctorId(null)}
            >
              <div className="relative flex flex-col items-center">
                {/* Popover Tooltip */}
                <div className={`absolute bottom-full mb-4 w-48 bg-white/90 backdrop-blur rounded-xl p-3 shadow-xl border border-white/50 origin-bottom transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100'}`}>
                  <h4 className="font-title-md text-title-md text-on-surface text-sm truncate">{name}</h4>
                  <p className="font-label-sm text-label-sm text-vibrant-blue mt-0.5 truncate">{subtitle}</p>
                  <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1 truncate">{subSubtitle}</p>
                </div>
                
                <div className={`border-2 p-1 shadow-lg transition-colors bg-white ${isDoctor ? 'rounded-full' : 'rounded-xl'} ${isSelected ? 'border-vibrant-blue shadow-[0_8px_16px_rgba(0,102,255,0.3)]' : 'border-indigo-gray-200 group-hover:border-vibrant-blue'}`}>
                  {item.image_url ? (
                    <img
                      className={`w-10 h-10 object-cover border-2 transition-colors ${isDoctor ? 'rounded-full' : 'rounded-lg'} ${isSelected ? 'border-white' : 'border-transparent'}`}
                      alt={name}
                      src={item.image_url}
                    />
                  ) : (
                    <div className={`w-10 h-10 flex items-center justify-center bg-indigo-gray-100 text-indigo-gray-400 ${isDoctor ? 'rounded-full' : 'rounded-lg'}`}>
                      {isDiag ? <TestTubeDiagonal className="w-5 h-5 text-vibrant-blue" /> : isDoctor ? <User className="w-5 h-5" /> : <Hospital className="w-5 h-5" />}
                    </div>
                  )}
                </div>
                <div className={`w-4 h-4 border-b-2 border-r-2 transform rotate-45 -mt-2 transition-colors bg-white ${isSelected ? 'border-vibrant-blue shadow-sm bg-vibrant-blue border-white' : 'border-indigo-gray-200 group-hover:border-vibrant-blue'}`}></div>
              </div>
            </div>
          )
        })}

        {/* Search Area Over Map */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur rounded-full px-6 py-3 shadow-lg border border-white/50 flex items-center gap-3 z-20">
          <MapPin className="text-vibrant-blue w-5 h-5 fill-vibrant-blue/20" />
          <span className="font-body-md text-on-surface font-semibold">
            Searching in: <span className="text-vibrant-blue">{currentCity || 'All Locations'}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default function SearchClient(props: { type: string, doctors: any[], cities: string[], hospitals: any[], filteredHospitals: any[], specialties: string[], diagnosticCenters: any[], allTests: string[] }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-vibrant-blue font-bold">Loading search portal...</div>}>
      <SearchClientInner {...props} />
    </Suspense>
  )
}
