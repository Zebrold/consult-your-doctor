'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search as SearchIcon, Building2, MapPin, UserCircle, HeartPulse, Stethoscope } from 'lucide-react'

type SearchType = 'doctor' | 'hospital' | 'specialty' | 'symptoms' | 'city'

export function HomeSearchBar() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<SearchType>((searchParams?.get('type') as SearchType) || 'doctor')
  const defaultQuery = searchParams?.get('query') || ''
  const defaultCity = searchParams?.get('city') || ''

  const renderLeftInput = () => {
    switch(activeTab) {
      case 'doctor':
        return (
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="query" defaultValue={defaultQuery} placeholder="Search by doctor name or keyword..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
          </div>
        )
      case 'hospital':
        return (
          <div className="flex-1 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="query" defaultValue={defaultQuery} placeholder="Search by hospital name..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
          </div>
        )
      case 'specialty':
        return (
          <div className="flex-1 relative">
            <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="query" defaultValue={defaultQuery} placeholder="Enter speciality (e.g. Cardiology)..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
          </div>
        )
      case 'symptoms':
        return (
          <div className="flex-1 relative">
            <HeartPulse className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="query" defaultValue={defaultQuery} placeholder="Enter symptoms (e.g. fever, headache)..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
          </div>
        )
      case 'city':
        return null // For city search, we just rely on the main location input below
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex flex-nowrap md:justify-center items-center overflow-x-auto md:overflow-visible gap-4 md:gap-8 mb-8 border-b border-gray-200 text-sm font-semibold text-gray-500 pb-1">
        <button 
          onClick={() => setActiveTab('doctor')}
          className={`whitespace-nowrap shrink-0 px-3 pb-2 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[5px] ${
            activeTab === 'doctor' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <UserCircle className="w-4 h-4"/> Search Doctor
        </button>
        <button 
          onClick={() => setActiveTab('hospital')}
          className={`whitespace-nowrap shrink-0 px-3 pb-2 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[5px] ${
            activeTab === 'hospital' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <Building2 className="w-4 h-4"/> Search Hospital
        </button>
        <button 
          onClick={() => setActiveTab('specialty')}
          className={`whitespace-nowrap shrink-0 px-3 pb-2 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[5px] ${
            activeTab === 'specialty' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <Stethoscope className="w-4 h-4"/> Search by Speciality
        </button>
        <button 
          onClick={() => setActiveTab('symptoms')}
          className={`whitespace-nowrap shrink-0 px-3 pb-2 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[5px] ${
            activeTab === 'symptoms' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <HeartPulse className="w-4 h-4"/> Search by Symptoms
        </button>
        <button 
          onClick={() => setActiveTab('city')}
          className={`whitespace-nowrap shrink-0 px-3 pb-2 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[5px] ${
            activeTab === 'city' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <MapPin className="w-4 h-4"/> Search by City
        </button>
      </div>

      {/* Form */}
      <form action="/search" method="GET" className="flex flex-col md:flex-row gap-4">
        <input type="hidden" name="type" value={activeTab} />
        
        {renderLeftInput()}
        
        <div className="flex-1 relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" name="city" defaultValue={defaultCity} placeholder="Enter city or location" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
        </div>
        
        <button type="submit" className="px-8 py-3 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
          Search
        </button>
      </form>
    </div>
  )
}
