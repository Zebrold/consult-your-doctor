'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { MapPin, Building2, Stethoscope, UserCircle, Calendar, Loader2, Activity, ArrowRight, ChevronDown, ShieldCheck, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAppointment, createDiagnosticBooking } from '@/app/actions/booking'
import { useSearchParams, useRouter } from 'next/navigation'
import { InlineAuthModal } from '@/components/InlineAuthModal'

export function BookConsultationFormInner({ defaultType = 'consultation' }: { defaultType?: 'consultation' | 'diagnostics' }) {
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
  const [bookingType, setBookingType] = useState<'consultation' | 'diagnostics'>(defaultType)
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
      const urlBooking = searchParams.get('booking')
      const urlCenterId = searchParams.get('center_id')

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

      // Switch to diagnostics mode if URL says so
      if (urlBooking === 'diagnostics' || defaultType === 'diagnostics') {
        setBookingType('diagnostics')

        if (urlCity) {
          setSelectedCity(urlCity)
          // Fetch diagnostic centers for this city
          const { data: cData } = await supabase
            .from('diagnostic_centers')
            .select('id, name, address, available_tests, test_prices')
            .eq('city', urlCity)
            .eq('status', 'active')
          setCenters(cData || [])

          if (urlCenterId) {
            setSelectedCenter(urlCenterId)
          }
        }
      } else if (urlCity) {
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

  const selectClass =
    'w-full py-2.5 pl-9 pr-9 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-sm text-on-surface outline-none disabled:opacity-50 appearance-none cursor-pointer'

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 card-shadow border border-slate-200 w-full max-w-md lg:max-w-none mx-auto relative z-10 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-title-md text-lg text-primary font-bold">Book Your Visit</h3>
        <span className="px-2.5 py-1 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-[11px] font-bold">Online Now</span>
      </div>

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
          className="space-y-3.5"
        >

          {/* Toggle Buttons */}
          <div className="flex bg-surface-container-low rounded-xl p-1 mb-1">
            {([
              { id: 'consultation', label: 'Hospital Visit' },
              { id: 'diagnostics', label: 'Diagnostic' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBookingType(tab.id)}
                aria-pressed={bookingType === tab.id}
                className={`flex-1 py-2 rounded-lg font-label-sm text-xs font-bold transition-all ${bookingType === tab.id ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Location */}
          <SelectField label="Location (City)" icon={MapPin}>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>Select City</option>
              {(bookingType === 'consultation' ? cities : diagCities).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </SelectField>

          {bookingType === 'consultation' && (
            <>
              {/* Hospital */}
              <SelectField label="Preferred Hospital" icon={Building2}>
                <select
                  name="hospital_id"
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  disabled={!selectedCity}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>Select Hospital</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </SelectField>

              {/* Speciality */}
              <SelectField label="Select Medical Specialty" icon={Stethoscope}>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  disabled={!selectedHospital}
                  className={selectClass}
                >
                  <option value="" disabled>Select Specialty</option>
                  {specialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </SelectField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Doctor */}
                <SelectField label="Preferred Doctor" icon={UserCircle}>
                  <select
                    name="doctor_id"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    disabled={!selectedSpecialty}
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.profiles?.full_name}</option>
                    ))}
                  </select>
                </SelectField>

                {/* Date & Time */}
                <SelectField label="Available Slot" icon={Calendar}>
                  <select
                    name="schedule_id"
                    disabled={!selectedDoctor || schedules.length === 0}
                    required
                    defaultValue=""
                    className={selectClass}
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
                </SelectField>
              </div>
            </>
          )}

          {bookingType === 'diagnostics' && (
            <>
              {/* Diagnostic Center */}
              <div>
                <SelectField label="Diagnostic Center" icon={Building2}>
                  <select
                    name="center_id"
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                    disabled={!selectedCity}
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>Select Diagnostic Center</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </SelectField>
                {selectedCenter && (
                  <div className="mt-2 text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-surface-variant flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-vibrant-blue" />
                    <span>{centers.find(c => c.id === selectedCenter)?.address || 'Address not available'}</span>
                  </div>
                )}
              </div>

              {/* Diagnostic Type */}
              <SelectField label="Diagnostic Test" icon={Activity}>
                <select
                  name="test_name"
                  value={selectedDiagnostic}
                  onChange={(e) => setSelectedDiagnostic(e.target.value)}
                  required={bookingType === 'diagnostics'}
                  disabled={!selectedCenter}
                  className={selectClass}
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
              </SelectField>

              {/* Date */}
              <SelectField label="Preferred Date" icon={Calendar} chevron={false}>
                <input
                  name="preferred_date"
                  type="date"
                  value={diagnosticDate}
                  onChange={(e) => setDiagnosticDate(e.target.value)}
                  required={bookingType === 'diagnostics'}
                  min={new Date().toISOString().split('T')[0]}
                  className={selectClass}
                />
              </SelectField>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-vibrant-blue text-on-primary py-3.5 rounded-xl font-title-md text-sm font-bold btn-hover mt-2 shadow-lg shadow-vibrant-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                {bookingType === 'consultation' ? 'Find & Confirm Appointment' : 'Book Diagnostic Test'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-on-surface-variant text-[11px] font-medium text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-fresh-teal shrink-0" />
            Instant Confirmation • No Hidden Charges
          </p>
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

function SelectField({
  label,
  icon: Icon,
  chevron = true,
  children,
}: {
  label: string
  icon: LucideIcon
  chevron?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col">
      <span className="font-label-sm text-xs font-semibold text-vibrant-blue mb-1">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibrant-blue pointer-events-none" />
        {children}
        {chevron && (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
        )}
      </span>
    </label>
  )
}

export function BookConsultationForm({ defaultType = 'consultation' }: { defaultType?: 'consultation' | 'diagnostics' }) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64 bg-surface-container-lowest rounded-2xl p-8 card-shadow border border-surface-variant"><Loader2 className="w-8 h-8 text-vibrant-blue animate-spin" /></div>}>
      <BookConsultationFormInner defaultType={defaultType} />
    </Suspense>
  )
}
