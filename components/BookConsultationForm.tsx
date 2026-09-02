'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { MapPin, Building2, Stethoscope, UserCircle, Calendar, Loader2, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAppointment, createDiagnosticBooking } from '@/app/actions/booking'
import { useSearchParams } from 'next/navigation'
import { InlineAuthModal } from '@/components/InlineAuthModal'

function BookConsultationFormInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  // State for dropdown options
  const [cities, setCities] = useState<string[]>([])
  const [diagCities, setDiagCities] = useState<string[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [specialties, setSpecialties] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])

  // State for selected values
  const [bookingType, setBookingType] = useState<'consultation' | 'diagnostics'>('consultation')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedHospital, setSelectedHospital] = useState<string>('')
  const [selectedCenter, setSelectedCenter] = useState<string>('')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<string>('')
  const [diagnosticDate, setDiagnosticDate] = useState<string>('')

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const initRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Initial Fetch & URL Pre-fill
  useEffect(() => {
    async function initialize() {
      const urlCity = searchParams.get('city')
      const urlHospital = searchParams.get('hospital_id')
      const urlSpecialty = searchParams.get('specialty')
      const urlDoctor = searchParams.get('doctor_id')

      // Check auth status
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)

      // Fetch base cities
      const { data: cityData } = await supabase.from('hospitals').select('city').eq('status', 'active')
      if (cityData) {
        setCities(Array.from(new Set(cityData.map(h => h.city))))
      }
      
      const { data: diagCityData } = await supabase.from('diagnostic_centers').select('city').eq('status', 'active')
      if (diagCityData) {
        setDiagCities(Array.from(new Set(diagCityData.map(c => c.city))))
      }

      if (urlCity) {
        setSelectedCity(urlCity)
        const { data: hData } = await supabase.from('hospitals').select('id, name').eq('city', urlCity).eq('status', 'active')
        setHospitals(hData || [])

        if (urlHospital) {
          setSelectedHospital(urlHospital)
          const { data: specData } = await supabase.from('doctors').select('specialty').eq('hospital_id', urlHospital)
          if (specData) setSpecialties(Array.from(new Set(specData.map(d => d.specialty))))

          if (urlSpecialty) {
            setSelectedSpecialty(urlSpecialty)
            const { data: docData } = await supabase
              .from('doctors')
              .select('id, profiles!inner(full_name)')
              .eq('hospital_id', urlHospital)
              .eq('specialty', urlSpecialty)
            setDoctors(docData || [])

            if (urlDoctor) {
              setSelectedDoctor(urlDoctor)
              const { data: schedData } = await supabase
                .from('schedules')
                .select('*')
                .eq('doctor_id', urlDoctor)
                .eq('is_booked', false)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
              setSchedules(schedData || [])
            }
          }
        }
      }

      setIsLoading(false)
      // Allow cascading effects to run on future manual changes
      setTimeout(() => {
        initRef.current = true
      }, 100)
    }
    initialize()
  }, [searchParams])

  // Fetch Hospitals and Centers when City changes
  useEffect(() => {
    if (!initRef.current) return
    setSelectedHospital('')
    setSelectedSpecialty('')
    setSelectedDoctor('')
    setSchedules([])
    setSelectedCenter('')

    async function fetchFacilities() {
      if (!selectedCity) {
        setHospitals([])
        setCenters([])
        return
      }
      const { data: hData } = await supabase.from('hospitals').select('id, name').eq('city', selectedCity).eq('status', 'active')
      setHospitals(hData || [])
      
      const { data: cData } = await supabase.from('diagnostic_centers').select('id, name, address, available_tests').eq('city', selectedCity).eq('status', 'active')
      setCenters(cData || [])
    }
    fetchFacilities()
  }, [selectedCity])

  // Reset city when booking type changes
  useEffect(() => {
    if (!initRef.current) return
    setSelectedCity('')
  }, [bookingType])

  // Fetch Specialties when Hospital changes
  useEffect(() => {
    if (!initRef.current) return
    setSelectedSpecialty('')
    setSelectedDoctor('')
    setSchedules([])

    async function fetchSpecialties() {
      if (!selectedHospital) {
        setSpecialties([])
        return
      }
      // Get all doctors in this hospital to find unique specialties
      const { data } = await supabase.from('doctors').select('specialty').eq('hospital_id', selectedHospital)
      if (data) {
        const uniqueSpecs = Array.from(new Set(data.map(d => d.specialty)))
        setSpecialties(uniqueSpecs)
      }
    }
    fetchSpecialties()
  }, [selectedHospital])

  // Fetch Doctors when Specialty changes
  useEffect(() => {
    if (!initRef.current) return
    setSelectedDoctor('')
    setSchedules([])

    async function fetchDoctors() {
      if (!selectedSpecialty || !selectedHospital) {
        setDoctors([])
        return
      }
      const { data } = await supabase
        .from('doctors')
        .select(`
          id,
          profiles!inner(full_name)
        `)
        .eq('hospital_id', selectedHospital)
        .eq('specialty', selectedSpecialty)

      setDoctors(data || [])
    }
    fetchDoctors()
  }, [selectedSpecialty, selectedHospital])

  // Fetch Schedules when Doctor changes
  useEffect(() => {
    if (!initRef.current) return
    async function fetchSchedules() {
      if (!selectedDoctor) {
        setSchedules([])
        return
      }
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('doctor_id', selectedDoctor)
        .eq('is_booked', false)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      setSchedules(data || [])
    }
    fetchSchedules()
  }, [selectedDoctor])

  const handleSubmit = (e: React.FormEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      setShowAuthModal(true)
      return
    }
    setIsSubmitting(true)
  }

  const handleAuthSuccess = async () => {
    setShowAuthModal(false)
    setIsAuthenticated(true)
    
    // Programmatically submit the form after modal closes
    setTimeout(() => {
      formRef.current?.requestSubmit()
    }, 100)
  }

  return (
    <div className="w-full max-w-lg min-w-[340px] md:min-w-[420px] bg-white rounded-xl shadow-2xl border border-gray-100 p-8 relative z-10">
      <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
        {bookingType === 'consultation' ? 'Book Consultation' : 'Book Diagnostics'}
      </h3>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-[#E31E24] animate-spin" />
        </div>
      ) : (
        <form 
          ref={formRef}
          action={async (formData) => {
            const res = bookingType === 'consultation' 
              ? await createAppointment(formData) 
              : await createDiagnosticBooking(formData)
            
            if (res?.error) {
              alert(res.error)
              setIsSubmitting(false)
            }
          }} 
          onSubmit={handleSubmit} 
          className="space-y-5"
        >

          {/* Booking Type Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setBookingType('consultation')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${bookingType === 'consultation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:cursor-pointer'}`}
            >
              Consultation
            </button>
            <button
              type="button"
              onClick={() => setBookingType('diagnostics')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${bookingType === 'diagnostics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:cursor-pointer'}`}
            >
              Diagnostics
            </button>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Location (City)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>Select City</option>
                {(bookingType === 'consultation' ? cities : diagCities).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          {bookingType === 'consultation' && (
            <>
              {/* Hospital */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Hospital</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="hospital_id"
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    disabled={!selectedCity}
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" disabled>Select Hospital</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Speciality */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Specialty</label>
                <div className="relative">
                  <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    disabled={!selectedHospital}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" disabled>Select Specialty</option>
                    {specialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Doctor</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="doctor_id"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    disabled={!selectedSpecialty}
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" disabled>Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.profiles?.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Available Slots</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="schedule_id"
                    disabled={!selectedDoctor || schedules.length === 0}
                    required
                    defaultValue=""
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {schedules.length === 0 ? (
                      <option value="" disabled>{selectedDoctor ? 'No slots available' : 'Select Doctor first'}</option>
                    ) : (
                      <>
                        <option value="" disabled>Select Date & Time</option>
                        {schedules.map(s => {
                          const date = new Date(s.start_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                          const time = new Date(s.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <option key={s.id} value={s.id}>{date} at {time}</option>
                          )
                        })}
                      </>
                    )}
                  </select>
                </div>
              </div>
            </>
          )}

          {bookingType === 'diagnostics' && (
            <>
              {/* Diagnostic Center */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Diagnostic Center</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="center_id"
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                    disabled={!selectedCity}
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" disabled>Select Diagnostic Center</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCenter && (
                  <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                    <span>{centers.find(c => c.id === selectedCenter)?.address || 'Address not available'}</span>
                  </div>
                )}
              </div>

              {/* Diagnostic Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Diagnostic Test</label>
                <div className="relative">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="test_name"
                    value={selectedDiagnostic}
                    onChange={(e) => setSelectedDiagnostic(e.target.value)}
                    required={bookingType === 'diagnostics'}
                    disabled={!selectedCenter}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" disabled>Select Diagnostic Test</option>
                    {centers.find(c => c.id === selectedCenter)?.available_tests?.map((test: string) => (
                      <option key={test} value={test.toLowerCase().replace(/ /g, '-')}>{test}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Preferred Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    name="preferred_date"
                    type="date"
                    value={diagnosticDate}
                    onChange={(e) => setDiagnosticDate(e.target.value)}
                    required={bookingType === 'diagnostics'}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#E31E24] text-white font-bold text-lg hover:bg-red-700 transition-colors mt-4 disabled:opacity-50 rounded-xl shadow-lg shadow-red-200/50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Booking...
              </>
            ) : (
              'Book Now'
            )}
          </button>
        </form>
      )}

      <InlineAuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
}

export function BookConsultationForm() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-2xl p-8"><Loader2 className="w-8 h-8 text-[#E31E24] animate-spin" /></div>}>
      <BookConsultationFormInner />
    </Suspense>
  )
}
