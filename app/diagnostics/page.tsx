import { Search, Settings2, Star, MapPin, Microscope, LocateFixed, Plus, Minus, Accessibility } from "lucide-react";

export default function DiagnosticsPage() {
  return (
    <div className="w-full h-[calc(100vh-88px)] min-h-[600px] flex flex-col md:flex-row overflow-hidden relative">
      {/* Left Panel: Search & List */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-surface flex flex-col h-full border-r border-outline-variant/30 z-10 shadow-[4px_0px_24px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Search Area */}
        <div className="p-6 bg-surface shadow-sm border-b border-outline-variant/30 z-20 shrink-0">
          <h1 className="font-title-md text-title-md text-on-surface mb-4">Find Diagnostic Centers</h1>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-indigo-gray-200 rounded-lg text-body-md text-on-surface focus:outline-none focus:border-vibrant-blue focus:ring-4 focus:ring-vibrant-blue/20 transition-all placeholder:text-outline-variant"
                placeholder="Search by test, center name, or location"
                type="text"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button className="shrink-0 px-4 py-2 rounded-full bg-vibrant-blue/10 text-vibrant-blue border border-vibrant-blue font-label-sm text-label-sm flex items-center gap-1">
                <Settings2 className="w-4 h-4" /> All Filters
              </button>
              <button className="shrink-0 px-4 py-2 rounded-full bg-surface-container-lowest border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container-low transition-colors">
                MRI
              </button>
              <button className="shrink-0 px-4 py-2 rounded-full bg-surface-container-lowest border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container-low transition-colors">
                CT Scan
              </button>
              <button className="shrink-0 px-4 py-2 rounded-full bg-surface-container-lowest border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container-low transition-colors">
                Blood Panel
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-indigo-gray-50">
          {/* Center Card 1 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_24px_-4px_rgba(0,102,255,0.08)] border border-indigo-gray-200 hover:border-vibrant-blue transition-colors group">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-surface-container-highest shrink-0 overflow-hidden relative">
                <img
                  className="w-full h-full object-cover"
                  alt="Apex Advanced Diagnostics"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB18vN4cIixpa3oGysuAfj12bXOVUSB03Ox7t5Ll019yzJIJ1Cl1_L7FMDerNBUDrrDf7hx1xuJxGxWCsA0pgIvqgXb054gfRHiRyEF3d-QoncxbSVaNEJGqQH42PfdMYdOR5orxxeMFtDeaSmnczurIaY5f1efWm6HzNtwXDA8JTgRPdRmCBWx6E5M5FK0UVAX0-d6R91wrDBYBu9_DfzFo-o6wT3A4RRvEZVNdldLbiNzH9np_nUPEw"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-title-md text-[18px] leading-tight text-on-surface">Apex Advanced Diagnostics</h3>
                    <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-on-surface">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-label-sm text-label-sm">4.9</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-indigo-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Downtown Medical District (2.1 mi)
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">MRI</span>
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">CT Scan</span>
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">X-Ray</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-indigo-gray-600">Starting from</span>
                <span className="font-title-md text-[18px] text-on-surface">$150</span>
              </div>
              <button className="px-6 py-2 rounded-full bg-vibrant-blue text-white font-label-sm text-label-sm hover:scale-[1.02] hover:bg-primary transition-all active:scale-95">
                Book Now
              </button>
            </div>
          </div>

          {/* Center Card 2 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_24px_-4px_rgba(0,102,255,0.08)] border border-vibrant-blue bg-vibrant-blue/5 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-fresh-teal text-white font-label-sm text-[10px] px-2 py-1 rounded-bl-lg z-10">FASTEST RESULTS</div>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-surface-container-highest shrink-0 overflow-hidden relative">
                <img
                  className="w-full h-full object-cover"
                  alt="Precision Imaging Lab"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLWYOmZS8ZZ_7SE3zdMlrfVTvWivnv5kIgjejOiyiHnpGO2vqn8aIk_aFtdvqj3sy-fAfEbw84iUVWu3uZ7CtOqvkwdXIwpXb3tpulXy1JabmPEOb6E9DNjUzlNOmHAewRnJvCSeqJAg1-Pc1lm9mst2uRb_ZYaFL-5-3fjg67SLGbf503leC9_uCA-zOVUZbJrfWowacWeIvebV4rTTdzvB5GVi1YA0Kgyj3WJ2708vIBVnmO6RxJpg"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-title-md text-[18px] leading-tight text-on-surface">Precision Imaging Lab</h3>
                    <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-on-surface">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-label-sm text-label-sm">4.8</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-indigo-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Westside Health Campus (3.5 mi)
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">Comprehensive Blood Panel</span>
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">Ultrasound</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-indigo-gray-600">Starting from</span>
                <span className="font-title-md text-[18px] text-on-surface">$85</span>
              </div>
              <button className="px-6 py-2 rounded-full bg-vibrant-blue text-white font-label-sm text-label-sm hover:scale-[1.02] hover:bg-primary transition-all active:scale-95">
                Book Now
              </button>
            </div>
          </div>

          {/* Center Card 3 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_24px_-4px_rgba(0,102,255,0.08)] border border-indigo-gray-200 hover:border-vibrant-blue transition-colors group">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-surface-container-highest shrink-0 overflow-hidden relative">
                <div className="w-full h-full bg-surface-container flex items-center justify-center">
                  <Microscope className="w-8 h-8 text-outline" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-title-md text-[18px] leading-tight text-on-surface">Summit Pathology Center</h3>
                    <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-on-surface">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-label-sm text-label-sm">4.6</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-indigo-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    North Creek Blvd (5.2 mi)
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">Genomics</span>
                  <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/50">Allergy Testing</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-indigo-gray-600">Starting from</span>
                <span className="font-title-md text-[18px] text-on-surface">$120</span>
              </div>
              <button className="px-6 py-2 rounded-full bg-vibrant-blue text-white font-label-sm text-label-sm hover:scale-[1.02] hover:bg-primary transition-all active:scale-95">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Map */}
      <div className="hidden md:block md:w-1/2 lg:w-7/12 relative bg-surface-container-high h-full">
        <div className="relative w-full h-full overflow-hidden bg-surface-dim">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD64wHRYD_9EM-dOkDb767ITejPBA0e9JhDemUVlCmC47T2tj29a7wxTt2B5I7F8ydU1UjSnK8FM_I8s22weZxNgfB79AzOpmEZ-tqWdoPa7kX3SDuQNzt9_IAcbJCQLj7LCGqmV8EDWIUZan9F_yhPxaUJaq30iHdxH552ehInOM9xffNTVp6pFEBeEczkHYhL3d2TiiBUrfDzaKLr-FBy4AUel9CltK2fe3z9bvKFlM0kkFWxRAjrcw"
            alt="Los Angeles Medical District Google Map"
            className="w-full h-full object-cover object-center"
          />
          
          <div className="absolute top-4 left-4 z-20 flex items-center bg-white rounded-lg shadow-md border border-outline-variant/30 px-3 py-2 gap-2 w-72">
            <span className="font-bold text-lg tracking-tight">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </span>
            <span className="text-outline-variant">|</span>
            <span className="text-xs text-indigo-gray-600 truncate flex-1">Downtown Medical District</span>
            <Search className="text-indigo-gray-600 w-[18px] h-[18px]" />
          </div>

          <div className="absolute top-4 right-4 z-20 flex items-center bg-white rounded-lg shadow-md border border-outline-variant/30 overflow-hidden font-label-sm text-xs">
            <button className="px-3 py-1.5 bg-indigo-gray-900 text-white font-semibold transition-colors">Map</button>
            <button className="px-3 py-1.5 text-indigo-gray-600 hover:bg-surface-container-low transition-colors">Satellite</button>
            <button className="px-3 py-1.5 text-indigo-gray-600 hover:bg-surface-container-low border-l border-outline-variant/30 transition-colors">Terrain</button>
          </div>

          <div className="absolute top-[37%] left-[38%] z-20 -translate-x-1/2 -translate-y-full cursor-pointer group">
            <div className="bg-white rounded-lg shadow-xl border-2 border-vibrant-blue px-3 py-2 flex flex-col items-center relative mb-1.5 animate-bounce">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-vibrant-blue"></span>
                <span className="font-title-md text-xs font-bold text-on-surface whitespace-nowrap">Apex Diagnostics</span>
              </div>
              <span className="text-[10px] text-indigo-gray-600 font-label-sm">4.9 ★ • 2.1 mi</span>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-vibrant-blue"></div>
            </div>
            <div className="w-4 h-4 bg-vibrant-blue rounded-full border-2 border-white mx-auto shadow-md"></div>
          </div>

          <div className="absolute top-[44%] left-[55%] z-20 -translate-x-1/2 -translate-y-full cursor-pointer group">
            <div className="bg-white rounded-lg shadow-xl border-2 border-fresh-teal px-3 py-2 flex flex-col items-center relative mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal"></span>
                <span className="font-title-md text-xs font-bold text-on-surface whitespace-nowrap">Precision Imaging Lab</span>
              </div>
              <span className="text-[10px] text-indigo-gray-600 font-label-sm">4.8 ★ • 3.5 mi</span>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-fresh-teal"></div>
            </div>
            <div className="w-4 h-4 bg-fresh-teal rounded-full border-2 border-white mx-auto shadow-md"></div>
          </div>

          <div className="absolute bottom-8 right-6 z-20 flex flex-col gap-2.5 items-end">
            <button className="w-10 h-10 bg-white rounded-lg shadow-md border border-outline-variant/30 flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors">
              <LocateFixed className="w-5 h-5" />
            </button>
            <div className="flex flex-col bg-white rounded-lg shadow-md border border-outline-variant/30 overflow-hidden">
              <button className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-low border-b border-outline-variant/30 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors">
                <Minus className="w-5 h-5" />
              </button>
            </div>
            <button className="w-10 h-10 bg-white rounded-lg shadow-md border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-low transition-colors text-yellow-500">
              <Accessibility className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
