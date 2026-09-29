'use client'

import { useState } from 'react'
import { User, Building2, BriefcaseMedical, ShieldPlus, MapPin, Search, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function QuickSearch() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('doctor')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  const tabs = [
    { id: 'doctor', label: 'Search Doctor', icon: User, placeholder: 'Doctor name, speciality or medical condition...' },
    { id: 'hospital', label: 'Hospitals', icon: Building2, placeholder: 'Search by hospital name or keyword...' },
    { id: 'speciality', label: 'Specialities', icon: BriefcaseMedical, placeholder: 'Search by speciality (e.g. Cardiologist)...' },
    { id: 'symptoms', label: 'Symptoms', icon: ShieldPlus, placeholder: 'Search by symptoms (e.g. Fever, Cough)...' },
    { id: 'city', label: 'Cities & Clinics', icon: MapPin, placeholder: 'Search by city name...' },
  ]

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (activeTab !== 'doctor') {
      params.set('type', activeTab)
    }
    if (query) params.set('q', query)
    if (location) params.set('location', location)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-title-md text-xl font-bold text-indigo-gray-900 flex items-center gap-2">
          <Search className="w-5 h-5 text-vibrant-blue" /> Quick Medical Search &amp; Specialist Directory
        </h2>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                  isActive
                    ? 'bg-vibrant-blue text-white font-bold'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-primary font-semibold'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search Box Container */}
      <form
        onSubmit={handleSearch}
        className="p-4 md:p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white shadow-sm"
      >
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={currentTab.placeholder}
            aria-label={currentTab.label}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 outline-none text-sm"
          />
        </div>
        <div className="md:col-span-5 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, postcode or clinic..."
            aria-label="Location"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 outline-none text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full bg-vibrant-blue text-on-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary transition-colors flex items-center justify-center gap-1"
          >
            Search <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
