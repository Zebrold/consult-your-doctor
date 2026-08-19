import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { CheckCircle2, AlertCircle, IndianRupee, MapPin, Calendar, Clock, User, Stethoscope, Building2 } from 'lucide-react'
import Link from 'next/link'

export default async function CheckoutPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params
  const supabase = await createClient()
  
  // Verify User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login/patient')
  }

  // Fetch Appointment Details
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      doctors (
        specialty,
        consultation_fee,
        profiles ( full_name )
      ),
      hospitals (
        name,
        address,
        city
      ),
      schedules (
        start_time
      )
    `)
    .eq('id', appointmentId)
    .eq('patient_id', user.id)
    .single()

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-2xl shadow-sm text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Appointment Not Found</h1>
            <p className="text-gray-600 mb-8">We couldn't find the appointment you're looking for.</p>
            <Link href="/" className="px-6 py-3 bg-[#E31E24] text-white rounded-full font-bold hover:bg-red-700 transition-colors">
              Go Home
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Format Date and Time
  const doctor: any = appointment.doctors
  const hospital: any = appointment.hospitals
  const schedule: any = appointment.schedules
  
  const appointmentDate = new Date(schedule.start_time)
  const formattedDate = appointmentDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formattedTime = appointmentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Slot Reserved Successfully</h1>
            <p className="text-gray-600 text-lg">
              Your appointment slot has been reserved. Please complete the advance payment to confirm your booking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Appointment Details</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Doctor</p>
                    <p className="text-gray-900 font-bold">Dr. {doctor.profiles.full_name}</p>
                    <p className="text-sm text-gray-600">{doctor.specialty}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#E31E24]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Hospital</p>
                    <p className="text-gray-900 font-bold">{hospital.name}</p>
                    <p className="text-sm text-gray-600">{hospital.address}, {hospital.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                    <Calendar className="w-5 h-5 text-gray-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Date</p>
                      <p className="text-sm font-bold text-gray-900">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                    <Clock className="w-5 h-5 text-gray-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Time</p>
                      <p className="text-sm font-bold text-gray-900">{formattedTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Payment Summary</h2>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Consultation Fee</span>
                  <span className="font-semibold text-gray-900">₹{doctor.consultation_fee}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-gray-900">₹49</span>
                </div>
                
                <div className="pt-6 mt-6 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Payable</span>
                    <span className="text-2xl font-black text-[#E31E24]">
                      ₹{(Number(doctor.consultation_fee) + 49).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Actions */}
              <div className="mt-8 space-y-3">
                <form action={async () => {
                  'use server'
                  const supabase = await createClient()
                  // In a real app, integrate Razorpay/Stripe here.
                  // For now, we instantly confirm and redirect.
                  await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appointmentId)
                  
                  // Also record a payment row
                  await supabase.from('payments').insert({
                    appointment_id: appointmentId,
                    amount: Number(doctor.consultation_fee) + 49,
                    gateway: 'razorpay',
                    status: 'success'
                  })
                  
                  redirect(`/patient/dashboard`)
                }}>
                  <button type="submit" className="w-full py-4 bg-[#E31E24] text-white font-bold text-lg rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200/50 flex items-center justify-center gap-2">
                    Pay Now <IndianRupee className="w-5 h-5" />
                  </button>
                </form>
                
                <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Secure Payment Gateway
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
