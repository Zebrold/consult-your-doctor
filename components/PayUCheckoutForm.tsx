'use client'

import { useState, useRef } from 'react'
import { IndianRupee, Loader2 } from 'lucide-react'

interface PayUCheckoutFormProps {
  txnid: string
  amount: number
  productinfo: string
  firstname: string
  email: string
  phone: string
  payuKey: string
}

export function PayUCheckoutForm({
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  phone,
  payuKey
}: PayUCheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handlePayment = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch Hash from Backend
      const res = await fetch('/api/payu/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnid,
          amount,
          productinfo,
          firstname,
          email,
          phone
        })
      })

      const data = await res.json()

      if (data.error) {
        alert('Payment setup failed: ' + data.error)
        setIsLoading(false)
        return
      }

      // 2. Set Hash in hidden form input
      const hashInput = document.getElementById('payu_hash') as HTMLInputElement
      if (hashInput) {
        hashInput.value = data.hash
      }

      // 3. Submit form to PayU
      if (formRef.current) {
        formRef.current.submit()
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred during payment setup.')
      setIsLoading(false)
    }
  }

  // PayU Test URL. For production, change this to 'https://secure.payu.in/_payment'
  const payuUrl = 'https://test.payu.in/_payment'

  return (
    <>
      <button 
        onClick={handlePayment} 
        disabled={isLoading}
        className="w-full py-4 bg-[#E31E24] text-white font-bold text-lg rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200/50 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Processing...
          </>
        ) : (
          <>
            Pay Now <IndianRupee className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Hidden PayU Form */}
      <form ref={formRef} action={payuUrl} method="POST" className="hidden">
        <input type="hidden" name="key" value={payuKey} />
        <input type="hidden" name="txnid" value={txnid} />
        <input type="hidden" name="productinfo" value={productinfo} />
        <input type="hidden" name="amount" value={amount.toString()} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="firstname" value={firstname} />
        <input type="hidden" name="phone" value={phone || '9999999999'} />
        
        <input type="hidden" name="surl" value={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payu/callback`} />
        <input type="hidden" name="furl" value={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payu/callback`} />
        
        {/* We will populate this programmatically */}
        <input type="hidden" name="hash" id="payu_hash" value="" />
      </form>
    </>
  )
}
