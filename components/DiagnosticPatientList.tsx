'use client'

import { useState } from 'react'
import { Calendar, Search, Activity, User, Phone, CheckCircle, Clock } from 'lucide-react'
import { updateDiagnosticBookingStatus } from '@/app/actions/booking'
import { useRouter } from 'next/navigation'

interface DiagnosticPatientListProps {
  bookings: any[]
}

export function DiagnosticPatientList({ bookings }: DiagnosticPatientListProps) {
  const [filterTest, setFilterTest] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const router = useRouter()

  const handleSetToday = () => {
    const today = new Date()
    // format to YYYY-MM-DD
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setFilterDate(`${yyyy}-${mm}-${dd}`)
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    await updateDiagnosticBookingStatus(id, newStatus)
    setUpdatingId(null)
    router.refresh()
  }

  // Extract unique tests for the dropdown
  const uniqueTests = Array.from(new Set(bookings.map(b => b.test_name)))

  const filteredBookings = bookings.filter(booking => {
    let matches = true
    if (filterTest && booking.test_name !== filterTest) matches = false
    
    if (filterDate && booking.preferred_date) {
      console.log('--- FILTER CHECK ---')
      console.log('booking.preferred_date:', booking.preferred_date, typeof booking.preferred_date)
      console.log('filterDate:', filterDate, typeof filterDate)
      
      // Create local dates for comparison to avoid string format mismatches
      const bDateObj = new Date(booking.preferred_date)
      const fDateObj = new Date(filterDate) // from "YYYY-MM-DD"

      
      const bYear = bDateObj.getFullYear()
      const bMonth = bDateObj.getMonth()
      const bDay = bDateObj.getDate()
      
      const fYear = fDateObj.getFullYear()
      const fMonth = fDateObj.getMonth()
      const fDay = fDateObj.getDate()
      
      if (bYear !== fYear || bMonth !== fMonth || bDay !== fDay) {
        matches = false
      }
    }
    
    return matches
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Filter by Test</label>
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterTest}
              onChange={(e) => setFilterTest(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500"
            >
              <option value="">All Tests</option>
              {uniqueTests.map(test => (
                <option key={test as string} value={test as string}>
                  {(test as string).replace(/-/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Filter by Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleSetToday}
          className="px-5 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors h-[38px]"
        >
          Today
        </button>

        {(filterTest || filterDate) && (
          <button
            onClick={() => { setFilterTest(''); setFilterDate('') }}
            className="px-5 py-2 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors h-[38px]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredBookings.map(booking => (
              <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{booking.profiles?.full_name || 'Unknown Patient'}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {booking.profiles?.phone_number || 'N/A'}</span>
                      <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">ID: {booking.id.slice(0,8)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-sm grid grid-cols-2 gap-4 border-l border-gray-100 pl-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Test</p>
                    <p className="font-semibold text-gray-900 capitalize">{booking.test_name.replace(/-/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.preferred_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    disabled={updatingId === booking.id}
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                      booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500' :
                      booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {updatingId === booking.id && (
                    <Clock className="w-4 h-4 text-gray-400 animate-pulse" />
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
