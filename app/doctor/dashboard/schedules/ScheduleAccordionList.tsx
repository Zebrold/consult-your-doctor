'use client'

import { useState } from 'react'
import { Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { BlockSlotButton } from './BlockSlotButton'

export function ScheduleAccordionList({ groupedSchedules }: { groupedSchedules: Record<string, any[]> }) {
  // Determine the label for today's date so we can open it by default
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  
  // Initialize state with only today's date opened, if it exists in the schedule
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({
    [todayLabel]: true
  })

  const toggleDate = (dateLabel: string) => {
    setOpenDates(prev => ({
      ...prev,
      [dateLabel]: !prev[dateLabel]
    }))
  }

  if (Object.entries(groupedSchedules).length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900">No Upcoming Slots</h3>
        <p className="text-gray-500 mt-1">Your hospital admin has not generated any schedule for you yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedSchedules).map(([dateLabel, slots]) => {
        const isOpen = openDates[dateLabel]

        return (
          <div key={dateLabel} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => toggleDate(dateLabel)}
              className="w-full px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center hover:bg-gray-100 transition-colors"
            >
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                {dateLabel}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {slots.length} Slots
                </span>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </button>
            
            {isOpen && (
              <div className="p-6 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {slots.map(slot => {
                    const slotDate = new Date(slot.start_time)
                    const isPassed = slotDate.getTime() < new Date().getTime()
                    const startTime = slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={`group relative rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${
                          isPassed
                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                            : slot.is_booked 
                              ? 'bg-red-50 border-red-200 text-red-900 cursor-not-allowed' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                        }`}
                      >
                        <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 opacity-70 ${isPassed ? 'line-through' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {startTime}
                        </div>
                        
                        {isPassed ? (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full mt-1">
                            Passed
                          </span>
                        ) : slot.is_booked ? (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1">
                            Booked
                          </span>
                        ) : (
                          <div className="mt-1 w-full flex justify-center">
                            <BlockSlotButton scheduleId={slot.id} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
