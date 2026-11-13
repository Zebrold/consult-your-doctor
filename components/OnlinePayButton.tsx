'use client'

import { useState } from 'react'
import { IndianRupee, Loader2 } from 'lucide-react'
import { startOnlinePayment } from '@/lib/razorpay-client'

/** The checkout pages' Pay button: opens Razorpay Checkout for the booking's fee (priced by the server). */
export function OnlinePayButton({
  bookingId,
  product,
  name,
  email,
  phone,
}: {
  bookingId: string
  product: 'Consultation' | 'Diagnostic'
  name: string
  email: string | null
  phone: string | null
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setBusy(true)
    setError(null)
    const problem = await startOnlinePayment({ bookingId, product, name, email, phone })
    // After paying, Checkout leaves for the callback; a message means the payment didn't go ahead.
    if (problem) {
      setError(problem)
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="w-full h-[50px] bg-[#2A4DD0] text-white font-extrabold text-[15px] rounded-[11px] hover:bg-[#2443B8] transition-all shadow-[0_8px_16px_rgba(42,77,208,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {busy ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Processing...
          </>
        ) : (
          <>
            Pay Now <IndianRupee className="w-5 h-5" />
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-error-container/60 text-on-error-container text-sm p-3">
          {error}
        </p>
      )}
    </>
  )
}
