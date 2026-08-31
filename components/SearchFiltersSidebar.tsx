'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react'

// Hardcoded filter options for now. Ideally, these would be fetched from the database.

interface SearchFiltersSidebarProps {
  specialties?: string[]
  cities?: string[]
  hospitals?: string[]
}
export function SearchFiltersSidebar({ specialties = [], cities = [], hospitals = [] }: SearchFiltersSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    specialities: true,
    cities: false,
    hospitals: false
  })

  const [citySearch, setCitySearch] = useState('')
  const [hospitalSearch, setHospitalSearch] = useState('')

  const type = searchParams?.get('type') || 'doctor'

  // Current selections
  const currentSpecialities = searchParams?.get('specialties')?.split(',').filter(Boolean) || []
  const currentCities = searchParams?.get('cities')?.split(',').filter(Boolean) || []
  const currentHospitals = searchParams?.get('hospitals')?.split(',').filter(Boolean) || []

  // Update URL function
  const updateFilters = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams?.toString())
    if (values.length > 0) {
      params.set(key, values.join(','))
    } else {
      params.delete(key)
    }
    // reset pagination if we have it
    params.delete('page')

    router.push(`${pathname}?${params.toString()}`)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCheckboxChange = (key: string, value: string, currentSelections: string[]) => {
    const isSelected = currentSelections.includes(value)
    let newSelections: string[]

    if (isSelected) {
      newSelections = currentSelections.filter(v => v !== value)
    } else {
      newSelections = [...currentSelections, value]
    }

    updateFilters(key, newSelections)
  }

  const clearAll = () => {
    const params = new URLSearchParams(searchParams?.toString())
    params.delete('specialties')
    params.delete('cities')
    params.delete('hospitals')
    router.push(`${pathname}?${params.toString()}`)
  }

  const filteredCities = cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
  const filteredHospitals = hospitals.filter(h => h.toLowerCase().includes(hospitalSearch.toLowerCase()))

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <SlidersHorizontal className="w-5 h-5" />
          Filter By
        </div>
        <button
          onClick={clearAll}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Specialities */}
      {type !== 'hospital' && (
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection('specialities')}
          className="w-full flex items-center justify-between p-4 font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          Specialities
          {expandedSections.specialities ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {expandedSections.specialities && (
          <div className="px-4 pb-4 max-h-48 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
            {specialties.map(spec => (
              <label key={spec} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={currentSpecialities.includes(spec)}
                  onChange={() => handleCheckboxChange('specialties', spec, currentSpecialities)}
                  className="w-4 h-4 rounded border-slate-300 text-[#E31E24] focus:ring-[#E31E24] cursor-pointer"
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{spec}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Hospitals */}
      {type !== 'hospital' && (
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection('hospitals')}
          className="w-full flex items-center justify-between p-4 font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          Select Hospital
          {expandedSections.hospitals ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {expandedSections.hospitals && (
          <div className="px-4 pb-4">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Hospitals"
                value={hospitalSearch}
                onChange={e => setHospitalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300 bg-white"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-200 pr-1">
              {filteredHospitals.map(hospital => (
                <label key={hospital} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentHospitals.includes(hospital)}
                    onChange={() => handleCheckboxChange('hospitals', hospital, currentHospitals)}
                    className="w-4 h-4 rounded border-slate-300 text-[#E31E24] focus:ring-[#E31E24] cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{hospital}</span>
                </label>
              ))}
              {filteredHospitals.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No hospitals found.</p>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Cities */}
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection('cities')}
          className="w-full flex items-center justify-between p-4 font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          Select City
          {expandedSections.cities ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {expandedSections.cities && (
          <div className="px-4 pb-4">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Cities"
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300 bg-white"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-200 pr-1">
              {filteredCities.map(city => (
                <label key={city} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentCities.includes(city)}
                    onChange={() => handleCheckboxChange('cities', city, currentCities)}
                    className="w-4 h-4 rounded border-slate-300 text-[#E31E24] focus:ring-[#E31E24] cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{city}</span>
                </label>
              ))}
              {filteredCities.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No cities found.</p>
              )}
            </div>
          </div>
        )}
      </div>



    </div>
  )
}
