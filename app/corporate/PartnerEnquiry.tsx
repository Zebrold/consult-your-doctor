'use client'

import { useActionState } from 'react'
import { CircleCheck, Loader2 } from 'lucide-react'
import { submitPartnerEnquiry } from '@/app/actions/partner-enquiries'

const field = 'w-full min-w-0 h-12 px-4 rounded-xl border border-[#D6DDE8] bg-white text-[15px] text-[#0B1B3F] outline-none focus:border-[#1D4ED8] focus:shadow-[0_0_0_3px_rgba(29,78,216,0.12)]'
const label = 'block mb-1.5 text-[13px] font-extrabold text-[#27324A]'

/** "Talk to our team": a hospital or centre leaves its details and the Consult your Doctor team calls to help it apply. */
export function PartnerEnquiry() {
  const [state, action, pending] = useActionState(submitPartnerEnquiry, null)

  if (state?.ok) {
    return (
      <div className="flex items-start gap-3 rounded-[18px] bg-[#ECFDF3] p-5 text-[#05603A]">
        <CircleCheck className="w-6 h-6 shrink-0" />
        <span>
          <strong className="block text-[16px]">Thank you. Our team will call you.</strong>
          <span className="text-[14.5px]">We can answer your questions and fill the application in with you on the call.</span>
        </span>
      </div>
    )
  }

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <fieldset className="sm:col-span-2">
        <legend className={label}>You are a</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ['hospital', 'Hospital or clinic'],
            ['diagnostic_center', 'Diagnostic centre'],
          ].map(([value, text], i) => (
            <label key={value} className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-[#D6DDE8] bg-white text-[14px] font-bold cursor-pointer has-[:checked]:border-[#1D4ED8] has-[:checked]:bg-[#EEF3FF] has-[:checked]:text-[#1D4ED8]">
              <input type="radio" name="kind" value={value} defaultChecked={i === 0} className="accent-[#1D4ED8]" />
              {text}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span className={label}>Hospital or centre name</span>
        <input name="organizationName" required minLength={2} maxLength={160} className={field} />
      </label>
      <label>
        <span className={label}>City</span>
        <input name="city" required minLength={2} maxLength={80} className={field} />
      </label>
      <label>
        <span className={label}>Your name</span>
        <input name="contactName" required minLength={2} maxLength={120} autoComplete="name" className={field} />
      </label>
      <label>
        <span className={label}>Your role (optional)</span>
        <input name="contactRole" maxLength={80} placeholder="Administrator, owner, …" className={field} />
      </label>
      <label>
        <span className={label}>Phone</span>
        <input name="phone" type="tel" required inputMode="tel" autoComplete="tel" className={field} />
      </label>
      <label>
        <span className={label}>Email (optional)</span>
        <input name="email" type="email" autoComplete="email" className={field} />
      </label>
      <label>
        <span className={label}>Number of beds (optional)</span>
        <input name="beds" type="number" min={0} className={field} />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>What would you like to know? (optional)</span>
        <textarea name="message" rows={3} maxLength={1000} className={`${field} h-auto py-3`} />
      </label>
      {state && !state.ok && <p className="sm:col-span-2 text-[14px] font-bold text-[#B42318]">{state.error}</p>}
      <button type="submit" disabled={pending} className="sm:col-span-2 justify-self-start inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[#1D4ED8] text-white text-[15px] font-extrabold hover:bg-[#1A45C2] disabled:opacity-60">
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Ask us to call you
      </button>
    </form>
  )
}
