import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, Trash2 } from 'lucide-react'
import { SlotGeneratorForm } from './SlotGeneratorForm'
import { DeleteSlotButton } from './DeleteSlotButton'
import { DatePicker } from './DatePicker'

export default async function DoctorSchedulePage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ date?: string }> }) {
  const params = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/hospital')

  const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('id', user.id).single()
  if (!profile?.hospital_id) redirect('/')

  const doctorId = params.id

  // Fetch Doctor
  const { data: doctor } = await supabase
    .from('doctors')
    .select(`
      id,
      specialty,
      hospital_id,
      profiles!doctors_profile_id_fkey ( full_name )
    `)
    .eq('id', doctorId)
    .single()

  if (!doctor || doctor.hospital_id !== profile.hospital_id) {
    redirect('/hospital/doctors')
  }

  const doctorName = (doctor.profiles as any)?.full_name?.replace('Dr. ', '') || 'Doctor'

  // Date setup
  const today = new Date()
  const defaultDateStr = today.toISOString().split('T')[0]
  const selectedDateStr = searchParams.date || defaultDateStr

  // Selected date bounds in UTC for querying
  // Assume the date is local, so we fetch slots overlapping that day.
  // Actually, start_time is stored in UTC. We should do a rough >= selectedDate and < selectedDate + 1 day
  const selectedDateStart = new Date(`${selectedDateStr}T00:00:00.000`).toISOString()
  const selectedDateEnd = new Date(`${selectedDateStr}T23:59:59.999`).toISOString()

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .gte('start_time', selectedDateStart)
    .lte('start_time', selectedDateEnd)
    .order('start_time', { ascending: true })

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/hospital/doctors" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Doctors
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Manage Schedule</h1>
            <p className="text-gray-500">Dr. {doctorName} &bull; {doctor.specialty}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Generator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Date Selection
            </h2>
            <DatePicker selectedDate={selectedDateStr} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" /> Slot Generator
            </h2>
            <SlotGeneratorForm doctorId={doctorId} selectedDate={selectedDateStr} />
          </div>
        </div>

        {/* Right Column: Slots */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                Generated Slots for {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                {schedules?.length || 0} Slots
              </span>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {schedules?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <Clock className="w-12 h-12 text-gray-200" />
                  <p>No slots generated for this date yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {schedules?.map(slot => {
                    const start = new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const end = new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    return (
                      <div 
                        key={slot.id} 
                        className={`relative group border rounded-xl p-3 text-center transition-all ${
                          slot.is_booked 
                            ? 'bg-blue-50 border-blue-200 text-blue-900' 
                            : 'bg-white border-gray-200 text-gray-900 hover:border-emerald-500 hover:shadow-md'
                        }`}
                      >
                        <div className="text-sm font-bold">{start}</div>
                        <div className="text-xs text-gray-500 mt-1">{slot.is_booked ? 'Booked' : 'Available'}</div>
                        
                        {!slot.is_booked && (
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DeleteSlotButton scheduleId={slot.id} doctorId={doctorId} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
