'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { requestBranch } from '@/app/actions/branches'
import { Field, FormError, input, textarea } from '@/components/portal/form-ui'
import { Panel, btnOutline, btnPrimary } from './hos-ui'

type Defaults = { name: string; city: string; contactName: string; phone: string; email: string }

/** The new-branch request: what the team needs to list it. It joins their hospital application queue as a branch. */
export function BranchForm({ defaults }: { defaults: Defaults }) {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()

  if (sent) {
    return (
      <Panel>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#067647] shrink-0" />
          <div>
            <p className="text-[15.5px] font-extrabold">Sent for review</p>
            <p className="mt-1 text-[13.5px] leading-[1.55] text-[#27324A]">
              Our team will call the branch contact and ask for its registration and other documents. Once it’s live, it shows on Accounts &amp; branches and you can switch to it.
            </p>
            <Link href="/hospital/branches" className={`${btnOutline} lg:border mt-4`}>
              Back to branches
            </Link>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <Panel>
      <form
        className="grid gap-4"
        action={(form) =>
          start(async () => {
            setError(null)
            const res = await requestBranch(form)
            if (res.ok) setSent(true)
            else setError(res.error)
          })
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Branch name" hint="As patients should see it, e.g. the hospital name and area">
            <input name="name" required defaultValue={defaults.name} className={input} maxLength={120} />
          </Field>
          <Field label="City">
            <input name="city" required defaultValue={defaults.city} className={input} maxLength={60} />
          </Field>
        </div>
        <Field label="Address">
          <textarea name="address" required rows={2} className={textarea} maxLength={300} placeholder="Building, street, area and PIN code" />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Contact person at the branch">
            <input name="contactName" required defaultValue={defaults.contactName} className={input} maxLength={80} />
          </Field>
          <Field label="Contact phone">
            <input name="phone" required type="tel" inputMode="tel" defaultValue={defaults.phone} className={input} maxLength={16} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Branch email" hint="The branch’s own address; its sign-in details go here">
            <input name="email" required type="email" defaultValue={defaults.email} className={input} maxLength={120} />
          </Field>
          <Field label="Clinical establishment registration number" hint="If you have it to hand">
            <input name="registrationNumber" className={input} maxLength={80} />
          </Field>
          <Field label="Beds">
            <input name="beds" type="number" min={0} max={5000} inputMode="numeric" className={input} />
          </Field>
        </div>
        <Field label="Anything else for our team">
          <textarea name="note" rows={3} className={textarea} maxLength={500} />
        </Field>
        <FormError>{error}</FormError>
        <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:justify-between gap-3">
          <span className="text-[12.5px] text-[#5B667A]">Each branch gets its own listing, doctors and payouts.</span>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            Send for review
          </button>
        </div>
      </form>
    </Panel>
  )
}
