import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { CheckCircle2, AlertCircle, IndianRupee, MapPin, Calendar, Activity, Building2 } from 'lucide-react'
import Link from 'next/link'
import { PayUCheckoutForm } from '@/components/PayUCheckoutForm'

export default async function DiagnosticCheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()
  
  // Verify User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login/patient')
  }

  // Fetch Booking Details
  const { data: booking, error } = await supabase
    .from('diagnostic_bookings')
    .select(`
      id,
      status,
      test_name,
      preferred_date,
      diagnostic_centers (
        name,
        address,
        city,
        test_prices
      )
    `)
    .eq('id', bookingId)
    .eq('patient_id', user.id)
    .single()

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-2xl shadow-sm text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
            <p className="text-gray-600 mb-8">We couldn't find the diagnostic booking you're looking for.</p>
            <Link href="/" className="px-6 py-3 bg-[#E31E24] text-white rounded-full font-bold hover:bg-red-700 transition-colors">
              Go Home
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const center: any = booking.diagnostic_centers
  const formattedDate = new Date(booking.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  
  // Find price from the test_prices JSONB object
  const testKey = booking.test_name.toLowerCase().replace(/ /g, '-')
  let rawPrice = 0
  if (center.test_prices) {
    const matchingKey = Object.keys(center.test_prices).find(
      key => key.toLowerCase().replace(/ /g, '-') === testKey
    )
    if (matchingKey) {
      rawPrice = center.test_prices[matchingKey]
    }
  }
  const testPrice = Number(rawPrice)
  const platformFee = 29
  const totalPayable = testPrice + platformFee

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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Booking Initiated Successfully</h1>
            <p className="text-gray-600 text-lg">
              Your diagnostic test booking has been initiated. Please complete the payment to confirm your slot.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Booking Details</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Diagnostic Test</p>
                    <p className="text-gray-900 font-bold capitalize">{booking.test_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#E31E24]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Diagnostic Center</p>
                    <p className="text-gray-900 font-bold">{center.name}</p>
                    <p className="text-sm text-gray-600">{center.address}, {center.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                    <Calendar className="w-5 h-5 text-gray-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Preferred Date</p>
                      <p className="text-sm font-bold text-gray-900">{formattedDate}</p>
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
                  <span className="capitalize">{booking.test_name} Fee</span>
                  <span className="font-semibold text-gray-900">₹{testPrice}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-gray-900">₹{platformFee}</span>
                </div>
                
                <div className="pt-6 mt-6 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Payable</span>
                    <span className="text-2xl font-black text-[#E31E24]">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Actions */}
              <div className="mt-8 space-y-3">
                <PayUCheckoutForm 
                  txnid={bookingId}
                  amount={totalPayable}
                  productinfo="Diagnostic"
                  firstname={user.user_metadata?.full_name || 'Patient'}
                  email={user.email || 'patient@example.com'}
                  phone={user.phone || '9999999999'}
                  payuKey={process.env.PAYU_MERCHANT_KEY || '99eKD4'}
                />
                
                <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Secure PayU Gateway
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
