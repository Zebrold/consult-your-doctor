'use client'

import { useState, useEffect } from 'react'
import { MapPin, Building2, Stethoscope, UserCircle, Calendar, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAppointment } from '@/app/actions/booking'

export function BookConsultationForm() {
  const supabase = createClient()
  // State for dropdown options
  const [cities, setCities] = useState<string[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [specialties, setSpecialties] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])

  // State for selected values
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedHospital, setSelectedHospital] = useState<string>('')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initial Fetch: Get all unique cities
  useEffect(() => {
    async function fetchCities() {
      const { data } = await supabase.from('hospitals').select('city').eq('status', 'active')
      if (data) {
        const uniqueCities = Array.from(new Set(data.map(h => h.city)))
        setCities(uniqueCities)
      }
      setIsLoading(false)
    }
    fetchCities()
  }, [])

  // Fetch Hospitals when City changes
  useEffect(() => {
    setSelectedHospital('')
    setSelectedSpecialty('')
    setSelectedDoctor('')
    setSchedules([])
    
    async function fetchHospitals() {
      if (!selectedCity) {
        setHospitals([])
        return
      }
      const { data } = await supabase.from('hospitals').select('id, name').eq('city', selectedCity).eq('status', 'active')
      setHospitals(data || [])
    }
    fetchHospitals()
  }, [selectedCity])

  // Fetch Specialties when Hospital changes
  useEffect(() => {
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


  return (
    <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-100 p-8 relative z-10">
      <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Book Consultation</h3>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-[#E31E24] animate-spin" />
        </div>
      ) : (
        <form action={async (formData) => { await createAppointment(formData) }} onSubmit={() => setIsSubmitting(true)} className="space-y-5">
          
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
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

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
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#E31E24] text-white font-bold text-lg hover:bg-red-700 transition-colors mt-4 disabled:opacity-50 rounded-xl shadow-lg shadow-red-200/50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              'Book Now'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
