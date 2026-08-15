'use client'

import { useState } from 'react'
import { Search as SearchIcon, Building2, MapPin } from 'lucide-react'

export function HomeSearchBar() {
  const [activeTab, setActiveTab] = useState<'doctor' | 'hospital'>('doctor')

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-8 mb-8 border-b border-gray-200 text-sm font-semibold text-gray-500">
        <button 
          onClick={() => setActiveTab('doctor')}
          className={`px-4 pb-3 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'doctor' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <SearchIcon className="w-4 h-4"/> Search Doctor
        </button>
        <button 
          onClick={() => setActiveTab('hospital')}
          className={`px-4 pb-3 flex items-center gap-2 cursor-pointer transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'hospital' ? 'text-[#E31E24] border-[#E31E24]' : 'border-transparent hover:text-[#E31E24]'
          }`}
        >
          <Building2 className="w-4 h-4"/> Search Hospital
        </button>
      </div>

      {/* Form */}
      <form action="/search" method="GET" className="flex flex-col md:flex-row gap-4">
        {activeTab === 'doctor' ? (
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="query" placeholder="Search by doctor name or keyword..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
          </div>
        ) : (
          <div className="flex-1 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" name="hospital" placeholder="Search by hospital name..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
          </div>
        )}
        
        <div className="flex-1 relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" name="city" placeholder="Enter city or location" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24] text-gray-900 bg-white" />
        </div>
        
        <button type="submit" className="px-8 py-3 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
          Search
        </button>
      </form>
    </div>
  )
}
