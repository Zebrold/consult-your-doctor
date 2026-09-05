import { Search, Settings2, Star, Heart, MapPin, Plus, Minus, LocateFixed, Hospital } from "lucide-react";

export default function HospitalsPage() {
  return (
    <div className="flex flex-col md:flex-row h-[800px]">
      {/* Left Column: Search & List (Scrollable) */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-surface h-full flex flex-col border-r border-outline-variant/30">
        {/* Search Header */}
        <div className="p-6 md:p-8 bg-surface z-10 shadow-[0_4px_20px_-10px_rgba(0,102,255,0.05)]">
          <h1 className="font-display-lg text-[32px] leading-tight font-extrabold text-indigo-gray-900 mb-2">Find a Hospital</h1>
          <p className="font-body-md text-body-md text-indigo-gray-600 mb-6">Discover world-class healthcare facilities near you.</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
            <input
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-indigo-gray-200 bg-white focus:outline-none focus:border-vibrant-blue focus:ring-4 focus:ring-primary-fixed/30 transition-all font-body-md text-body-md text-indigo-gray-900 placeholder:text-outline"
              placeholder="Search by name, specialty, or location..."
              type="text"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-indigo-gray-900">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
          {/* Quick Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="px-4 py-1.5 rounded-full bg-surface-container text-vibrant-blue font-label-sm text-label-sm cursor-pointer whitespace-nowrap border border-primary-fixed">All Specialties</span>
            <span className="px-4 py-1.5 rounded-full bg-white border border-indigo-gray-200 text-indigo-gray-600 font-label-sm text-label-sm cursor-pointer hover:bg-surface-container transition-colors whitespace-nowrap">Cardiology</span>
            <span className="px-4 py-1.5 rounded-full bg-white border border-indigo-gray-200 text-indigo-gray-600 font-label-sm text-label-sm cursor-pointer hover:bg-surface-container transition-colors whitespace-nowrap">Neurology</span>
            <span className="px-4 py-1.5 rounded-full bg-white border border-indigo-gray-200 text-indigo-gray-600 font-label-sm text-label-sm cursor-pointer hover:bg-surface-container transition-colors whitespace-nowrap">Oncology</span>
          </div>
        </div>

        {/* Hospital List */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-[#F8FAFC] [&::-webkit-scrollbar-thumb]:bg-[#c2c6d8] [&::-webkit-scrollbar-thumb]:rounded-[10px] hover:[&::-webkit-scrollbar-thumb]:bg-[#727687] p-6 md:p-8 space-y-6">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-4 border border-indigo-gray-200 shadow-[0_8px_30px_-12px_rgba(0,102,255,0.06)] hover:border-vibrant-blue/50 hover:shadow-[0_8px_30px_-12px_rgba(0,102,255,0.12)] transition-all cursor-pointer group flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-[140px] h-[120px] rounded-lg overflow-hidden shrink-0 relative">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt="Mount Sinai Medical Center"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnxc0Rcr9Tncurg5RIEglkILR5-m6ybkM4UruF1994U7_OkghP3NZa8cInSK0oc-kjTSnZi-CZjECKx5Eivwy5U9CQICs6qorbGTqoLC7SssUk2Fv4jt0JueexUJXyUASCNr_nCEPBMGZvzAp6Q-zZU6ACo_wNC4CvF8qQCXAeRZjIiTc7WnfWEWG45u8-fAKW4C6Kl5rLc4HVWOTdjUHqoEpZkX1TsbnuoreGTj8WT97ur1QTPXIW6w"
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-fresh-teal/90 backdrop-blur-sm rounded-md flex items-center gap-1">
                <Star className="w-3 h-3 text-white fill-current" />
                <span className="font-label-sm text-[11px] text-white">4.9</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-title-md text-title-md text-indigo-gray-900 group-hover:text-vibrant-blue transition-colors">Mount Sinai Medical Center</h3>
                  <button className="text-outline hover:text-soft-coral transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
                <p className="font-body-md text-[14px] text-indigo-gray-600 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" />
                  123 Health Ave, New York, NY
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">Cardiology</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">Orthopedics</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">+4 more</span>
                </div>
              </div>
              <button className="w-full py-2 bg-indigo-gray-50 hover:bg-surface-container-high text-vibrant-blue font-label-sm text-label-sm rounded-lg transition-colors border border-transparent group-hover:border-primary-fixed">
                View Profile
              </button>
            </div>
          </div>

          {/* Card 2 (Selected State) */}
          <div className="bg-primary-fixed/5 rounded-xl p-4 border-[2px] border-vibrant-blue shadow-[0_8px_30px_-12px_rgba(0,102,255,0.12)] cursor-pointer group flex flex-col sm:flex-row gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-vibrant-blue/10 rounded-bl-[100px] -z-10"></div>
            <div className="w-full sm:w-[140px] h-[120px] rounded-lg overflow-hidden shrink-0 relative">
              <img
                className="w-full h-full object-cover"
                alt="Cedars-Sinai Medical"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7AOMW1vR8o2TkE-Hgt9jlXdXYZtd4f1L3eAw2cfPWrqI0c_ta_z9VDTZgucG0O9oK_hpjkkS-oxx8_KjekxnJjU3VCZ0bC_i8uIlU9KRY2iMtYuCN-0dg7dl0o-3k1VR6BKHNUM0zTMlXbVKNFfL5Vn7CFUQek5n0dHF31WHgpNHvNmkP7X53Xl4EdVJExVm3NmOoSZyMq0VQ2iAipcm9jNoIGMFwqUd5X6DhS-438yNyL7T-_BA3Hg"
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-fresh-teal/90 backdrop-blur-sm rounded-md flex items-center gap-1">
                <Star className="w-3 h-3 text-white fill-current" />
                <span className="font-label-sm text-[11px] text-white">4.8</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-title-md text-title-md text-vibrant-blue">Cedars-Sinai Medical</h3>
                  <button className="text-soft-coral transition-colors">
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                </div>
                <p className="font-body-md text-[14px] text-indigo-gray-600 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" />
                  8700 Beverly Blvd, Los Angeles, CA
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">Neurology</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">Oncology</span>
                </div>
              </div>
              <button className="w-full py-2 bg-vibrant-blue text-white font-label-sm text-label-sm rounded-lg hover:scale-[1.02] transition-transform shadow-sm">
                View Profile
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-4 border border-indigo-gray-200 shadow-[0_8px_30px_-12px_rgba(0,102,255,0.06)] hover:border-vibrant-blue/50 hover:shadow-[0_8px_30px_-12px_rgba(0,102,255,0.12)] transition-all cursor-pointer group flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-[140px] h-[120px] rounded-lg overflow-hidden shrink-0 relative">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt="Boston Children's Hospital"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtSLQJnqS0SXW2Qht08YEdQHraPL88CJ8rc9HfESqe8xEcEz47BI6BiKO-IDrrK4uEiaEplNz6EJOdSUfINyQQdjz5gQxbb0RNGWg_z-cUIW6JyCQf9tJDLKwgy62F0VZTG1WDobNptUe0ddXPoZWArBuyTiJq699ceYshck1qKjztlf6UqjV_Z3LwAD0kAIXuLSLimaXTuLegz5WnYcKCIrlpcJz0u2w1cGbt3CsYSw0WDpFlQvAm8w"
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-fresh-teal/90 backdrop-blur-sm rounded-md flex items-center gap-1">
                <Star className="w-3 h-3 text-white fill-current" />
                <span className="font-label-sm text-[11px] text-white">4.9</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-title-md text-title-md text-indigo-gray-900 group-hover:text-vibrant-blue transition-colors">Boston Children's Hospital</h3>
                  <button className="text-outline hover:text-soft-coral transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
                <p className="font-body-md text-[14px] text-indigo-gray-600 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" />
                  300 Longwood Ave, Boston, MA
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">Pediatrics</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface-variant font-label-sm text-[10px] rounded-md">Genetics</span>
                </div>
              </div>
              <button className="w-full py-2 bg-indigo-gray-50 hover:bg-surface-container-high text-vibrant-blue font-label-sm text-label-sm rounded-lg transition-colors border border-transparent group-hover:border-primary-fixed">
                View Profile
              </button>
            </div>
          </div>
          {/* Spacer for bottom scroll */}
          <div className="h-8"></div>
        </div>
      </div>

      {/* Right Column: Map Area */}
      <div className="hidden md:block w-1/2 lg:w-7/12 h-full bg-indigo-gray-50 relative">
        {/* Simulated Map Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCW2-Rncs8ElZYSebWva2IOFgeVFPlrvoUboDqq-4XY2EyCBp5tdtRpIWLawArgwEVoBle03ZHRtEQo1CVxs9MugJjAYgKHsErC46jlL1t7DGP4FBY8ufnAyqMy8IU-TxuvJRQdNhQyaT0pyKpMxIsmNGUj-ShNYrsAD1uPWG8JOGX2GgDR4KnQGS2vskA9DFnBC5kZLDGqmOGFofcy_bNBIu1uxUrCTSLP_XMuHcOV4hxQE7jUi2vIwA')" }}
        ></div>
        {/* Map Overlay Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <button className="w-10 h-10 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,102,255,0.1)] flex items-center justify-center text-indigo-gray-900 hover:text-vibrant-blue transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,102,255,0.1)] flex items-center justify-center text-indigo-gray-900 hover:text-vibrant-blue transition-colors">
            <Minus className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 mt-4 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,102,255,0.1)] flex items-center justify-center text-vibrant-blue hover:bg-surface-container transition-colors">
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Map Pins */}
        {/* Pin 1 */}
        <div className="absolute top-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
          <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
            <img
              className="w-full h-full rounded-full object-cover"
              alt="Hospital Thumbnail"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC32Yr6xV5NtNCfbncvDagNh-PPIpFfFm1UkqEXdQZH0GAWciYD8QzpCBWaYd-zVTM-6Nmbi5QKBCmQJ_y53x-xm5lGPoHJBAhpfCd__bwDFQ-sQuFFkfoyuKwl2j1KbGjvj7R5Kl2_TOkhXIjUBOnjjDeDyvmtb-vI2tWU1eZj7wkbsV2tJlssjM6msMJilz3bTzCARLS2lkKxISfW0fEJF-mMw40KSI7Y7hLYzFv6Bq2YRfTU48pErg"
            />
          </div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rotate-45 z-0"></div>
          <div className="absolute w-6 h-6 bg-vibrant-blue/20 rounded-full top-2 left-2 animate-ping -z-10"></div>
        </div>

        {/* Pin 2 (Active) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20">
          <div className="bg-vibrant-blue text-white px-3 py-1 rounded-full font-label-sm text-[12px] shadow-lg mb-1 whitespace-nowrap text-center absolute -top-8 left-1/2 transform -translate-x-1/2">
            Cedars-Sinai
          </div>
          <div className="w-12 h-12 bg-vibrant-blue rounded-full shadow-lg flex items-center justify-center border-2 border-white relative z-10 scale-110">
            <Hospital className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-vibrant-blue rotate-45 z-0"></div>
        </div>

        {/* Pin 3 */}
        <div className="absolute bottom-1/3 right-1/4 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
          <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-vibrant-blue border-2 border-white relative z-10 group-hover:scale-110 transition-transform">
            <Hospital className="w-4 h-4" />
          </div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rotate-45 z-0"></div>
        </div>
      </div>
    </div>
  );
}
