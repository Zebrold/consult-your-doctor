'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createWalkInAppointment } from '@/app/actions/executive'
import { useRouter } from 'next/navigation'
import { Loader2, User, Phone, CheckCircle, Calendar, Clock } from 'lucide-react'

export function WalkInForm({ doctors }: { doctors: any[] }) {
  const [doctorId, setDoctorId] = useState('')
  const [schedules, setSchedules] = useState<any[]>([])
  const [scheduleId, setScheduleId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('+91')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchSchedules() {
      if (!doctorId) {
        setSchedules([])
        return
      }

      // Fetch today's unbooked slots for this doctor, only from CURRENT time onwards
      const nowStr = new Date().toISOString()
      
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const tomorrowStr = tomorrow.toISOString()

      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_booked', false)
        .gte('start_time', nowStr)
        .lt('start_time', tomorrowStr)
        .order('start_time', { ascending: true })

      setSchedules(data || [])
      setScheduleId('')
    }
    
    fetchSchedules()
  }, [doctorId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('patientName', patientName)
    formData.append('patientPhone', patientPhone)
    formData.append('doctorId', doctorId)
    formData.append('scheduleId', scheduleId)

    const result = await createWalkInAppointment(formData)
    
    setIsSubmitting(false)
    if (result.error) {
      alert(result.error)
    } else {
      alert("Walk-in booked successfully! Cash payment confirmed.")
      router.push('/executive/dashboard')
    }
  }

  const selectedDoctor = doctors.find(d => d.id === doctorId)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Select Doctor */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">1. Select Doctor</label>
        <select
          required
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="">-- Choose a Doctor --</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>
              Dr. {d.profiles.full_name} ({d.specialty}) - ₹{d.consultation_fee}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Select Slot */}
      {doctorId && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="block text-sm font-bold text-gray-700 mb-2">2. Available Slots for Today</label>
          {schedules.length === 0 ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex gap-3">
              <Calendar className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">No available slots for this doctor today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {schedules.map(slot => {
                const time = new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const isSelected = scheduleId === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setScheduleId(slot.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' 
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 mb-1 opacity-70" />
                    <span className="text-sm font-bold">{time}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Patient Details */}
      {scheduleId && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            3. Patient Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full border border-gray-200 rounded-xl p-3 pl-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                We'll link the appointment to this number.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {scheduleId && patientName && patientPhone.length > 5 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-6 mt-6 border-t border-gray-100">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-6 flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 mb-1">Confirm Cash Collection</h4>
              <p className="text-sm text-emerald-700">
                Please collect <strong className="font-black">₹{selectedDoctor?.consultation_fee}</strong> in cash from the patient before proceeding.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E31E24] hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Book Appointment'}
          </button>
        </div>
      )}
    </form>
  )
}
