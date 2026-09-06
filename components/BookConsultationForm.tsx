'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { MapPin, Building2, Stethoscope, UserCircle, Calendar, Loader2, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAppointment, createDiagnosticBooking } from '@/app/actions/booking'
import { useSearchParams, useRouter } from 'next/navigation'
import { InlineAuthModal } from '@/components/InlineAuthModal'

function BookConsultationFormInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
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
      
      const { data: cData } = await supabase.from('diagnostic_centers').select('id, name, address, available_tests, test_prices').eq('city', selectedCity).eq('status', 'active')
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
    <div className="bg-surface-container-lowest rounded-2xl p-8 card-shadow border border-surface-variant w-full max-w-md mx-auto relative z-10">
      <h3 className="font-title-md text-title-md text-primary text-center mb-6">
        {bookingType === 'consultation' ? 'Book Consultation' : 'Book Diagnostics'}
      </h3>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-vibrant-blue animate-spin" />
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
            } else if (res?.url) {
              router.push(res.url)
            }
          }} 
          onSubmit={handleSubmit} 
          className="space-y-4"
        >

          {/* Toggle Buttons */}
          <div className="flex bg-surface-container-low rounded-full p-1 mb-6 relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-vibrant-blue rounded-full transition-transform duration-300 ease-in-out ${bookingType === 'diagnostics' ? 'translate-x-full left-1' : 'translate-x-0 left-1'}`}
            />
            <button
              type="button"
              onClick={() => setBookingType('consultation')}
              className={`flex-1 relative z-10 py-2.5 rounded-full font-label-sm text-label-sm transition-colors ${bookingType === 'consultation' ? 'text-white' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Consultation
            </button>
            <button
              type="button"
              onClick={() => setBookingType('diagnostics')}
              className={`flex-1 relative z-10 py-2.5 rounded-full font-label-sm text-label-sm transition-colors ${bookingType === 'diagnostics' ? 'text-white' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Diagnostics
            </button>
          </div>

          {/* Location */}
          <div className="flex flex-col relative">
            <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Location (City)</label>
            <div className="relative mt-4">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface appearance-none cursor-pointer"
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
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Hospital</label>
                <div className="relative mt-4">
                  <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <select
                    name="hospital_id"
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    disabled={!selectedCity}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Hospital</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Speciality */}
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Specialty</label>
                <div className="relative mt-4">
                  <Stethoscope className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    disabled={!selectedHospital}
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Specialty</option>
                    {specialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor */}
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Doctor</label>
                <div className="relative mt-4">
                  <UserCircle className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <select
                    name="doctor_id"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    disabled={!selectedSpecialty}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.profiles?.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Available Slots</label>
                <div className="relative mt-4">
                  <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <select
                    name="schedule_id"
                    disabled={!selectedDoctor || schedules.length === 0}
                    required
                    defaultValue=""
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface disabled:opacity-50 appearance-none cursor-pointer"
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
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Diagnostic Center</label>
                <div className="relative mt-4">
                  <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <select
                    name="center_id"
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                    disabled={!selectedCity}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Diagnostic Center</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCenter && (
                  <div className="mt-2 text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-surface-variant flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-vibrant-blue" />
                    <span>{centers.find(c => c.id === selectedCenter)?.address || 'Address not available'}</span>
                  </div>
                )}
              </div>

              {/* Diagnostic Type */}
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Diagnostic Test</label>
                <div className="relative mt-4">
                  <Activity className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <select
                    name="test_name"
                    value={selectedDiagnostic}
                    onChange={(e) => setSelectedDiagnostic(e.target.value)}
                    required={bookingType === 'diagnostics'}
                    disabled={!selectedCenter}
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Diagnostic Test</option>
                    {centers.find(c => c.id === selectedCenter)?.available_tests?.map((test: string) => {
                      const center = centers.find(c => c.id === selectedCenter)
                      const price = center?.test_prices?.[test]
                      const priceDisplay = price ? ` - ₹${price}` : ''
                      return (
                        <option key={test} value={test.toLowerCase().replace(/ /g, '-')}>
                          {test}{priceDisplay}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col relative">
                <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Preferred Date</label>
                <div className="relative mt-4">
                  <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-vibrant-blue" />
                  <input
                    name="preferred_date"
                    type="date"
                    value={diagnosticDate}
                    onChange={(e) => setDiagnosticDate(e.target.value)}
                    required={bookingType === 'diagnostics'}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-vibrant-blue text-on-primary py-4 rounded-xl font-title-md text-base btn-hover mt-6 shadow-lg shadow-vibrant-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
    <Suspense fallback={<div className="flex justify-center items-center h-64 bg-surface-container-lowest rounded-2xl p-8 card-shadow border border-surface-variant"><Loader2 className="w-8 h-8 text-vibrant-blue animate-spin" /></div>}>
      <BookConsultationFormInner />
    </Suspense>
  )
}
