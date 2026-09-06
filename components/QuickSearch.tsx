'use client'

import { useState } from 'react'
import { User, Building2, BriefcaseMedical, ShieldPlus, MapPin, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function QuickSearch() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('doctor')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  const tabs = [
    { id: 'doctor', label: 'Search Doctor', icon: User, placeholder: 'Search by doctor name or keyword...' },
    { id: 'hospital', label: 'Search Hospital', icon: Building2, placeholder: 'Search by hospital name or keyword...' },
    { id: 'speciality', label: 'Search by Speciality', icon: BriefcaseMedical, placeholder: 'Search by speciality (e.g. Cardiologist)...' },
    { id: 'symptoms', label: 'Search by Symptoms', icon: ShieldPlus, placeholder: 'Search by symptoms (e.g. Fever, Cough)...' },
    { id: 'city', label: 'Search by City', icon: MapPin, placeholder: 'Search by city name...' },
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
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mb-8 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-bold transition-all ${
                isActive 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search Box Container */}
      <div className="bg-[#F8F9FA] rounded-[20px] p-4 md:p-6 shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 max-w-5xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={currentTab.placeholder}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter city or location"
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
          <button type="submit" className="bg-[#0D6EFD] hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-xl transition-colors shadow-md">
            Search
          </button>
        </form>
      </div>
    </div>
  )
}
