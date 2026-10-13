'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  IndianRupee,
  Info,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Stethoscope,
  FlaskConical,
  Coins,
} from 'lucide-react'
import { updatePlatformFeesAction } from '@/app/actions/pricing'
import { type PlatformFeeItem, type PlatformFees, DEFAULT_FEE_ITEMS } from '@/lib/platform-fees-types'
import { formatINR } from '@/components/patient/format'

interface Props {
  initialFees: PlatformFees
}

export function PlatformFeeManager({ initialFees }: Props) {
  const [fees, setFees] = useState<PlatformFees>(initialFees)
  const [items, setItems] = useState<PlatformFeeItem[]>(() => {
    if (Array.isArray(initialFees.items) && initialFees.items.length > 0) {
      return initialFees.items
    }
    return DEFAULT_FEE_ITEMS.map((item) => ({ ...item }))
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Calculate totals dynamically for preview
  const consultTotal = items
    .filter((it) => it.appliesTo === 'consultation' || it.id === 'consultation')
    .reduce((sum, it) => sum + (Number(it.amount) || 0), 0)

  const diagTotal = items
    .filter((it) => it.appliesTo === 'diagnostic' || it.id === 'diagnostic')
    .reduce((sum, it) => sum + (Number(it.amount) || 0), 0)

  const handleUpdateItem = (id: string, updates: Partial<PlatformFeeItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleAddItem = () => {
    const newId = `fee_${Date.now()}`
    const newItem: PlatformFeeItem = {
      id: newId,
      name: 'New Platform Fee',
      amount: 19,
      appliesTo: 'custom',
      description: 'Platform service charge added at checkout.',
    }
    setItems((prev) => [...prev, newItem])
    setMessage({
      type: 'success',
      text: 'New fee rule added! Edit the name and amount, then click Save Platform Fees.',
    })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find((it) => it.id === id)
    const name = itemToDelete?.name || 'this fee'

    if (items.length <= 1) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${name}"? If all fees are deleted, checkout will charge ₹0 platform fees.`
      )
      if (!confirmDelete) return
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
    setMessage({
      type: 'success',
      text: `Removed "${name}". Click Save Platform Fees to apply changes.`,
    })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validation
    for (const item of items) {
      if (!item.name || !item.name.trim()) {
        return setMessage({ type: 'error', text: 'All platform fees must have a valid name.' })
      }
      if (item.amount < 0 || isNaN(Number(item.amount))) {
        return setMessage({
          type: 'error',
          text: `Fee "${item.name}" must have a valid non-negative amount.`,
        })
      }
    }

    startTransition(async () => {
      const res = await updatePlatformFeesAction({
        items,
        consultation: consultTotal,
        diagnostic: diagTotal,
      })

      if (res.success && res.fees) {
        setFees(res.fees)
        setItems(res.fees.items || [])
        setMessage({
          type: 'success',
          text: 'Platform fee configuration updated successfully and applied across online checkout!',
        })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update platform fees.' })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066ff] border border-blue-100/60 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </span>
            <h2 className="text-base md:text-lg font-bold text-slate-900">Platform Fee Configuration</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {items.length} {items.length === 1 ? 'Rule' : 'Rules'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global checkout fees applied to patient bookings. Hidden from doctor and hospital portals.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0066ff] border border-blue-200/70 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Platform Fee
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Executive Access Only
          </span>
        </div>
      </div>

      {/* Confidentiality Notice */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#0066ff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Doctor &amp; Hospital Confidentiality:</p>
          <p>
            Doctors and hospital administrators only see their own consultation fees (e.g. ₹500). Platform fees are
            collected at patient checkout and managed exclusively from this executive panel.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Fee Items List */}
        {items.length === 0 ? (
          <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
            <Coins className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800">No Platform Fees Configured</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Online bookings will charge ₹0 platform fees. Click the button below to add a fee.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066ff] hover:bg-[#0050cb] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Platform Fee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, index) => {
              const isConsultation = item.appliesTo === 'consultation' || item.id === 'consultation'
              const isDiagnostic = item.appliesTo === 'diagnostic' || item.id === 'diagnostic'

              return (
                <div
                  key={item.id}
                  className="p-4.5 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-blue-200/80 transition-all flex flex-col justify-between gap-3.5 shadow-xs relative group"
                >
                  {/* Item Header with Category & Delete Option */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isConsultation ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 text-[11px] font-bold">
                          <Stethoscope className="w-3 h-3" /> Doctor Consultation
                        </span>
                      ) : isDiagnostic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-bold">
                          <FlaskConical className="w-3 h-3" /> Diagnostic Lab
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/70 text-[11px] font-bold">
                          <Coins className="w-3 h-3" /> Custom Fee
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium">#{index + 1}</span>
                    </div>

                    {/* Delete Option */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      title={`Delete "${item.name}"`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Delete</span>
                    </button>
                  </div>

                  {/* Edit Name & Amount Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Editable Name */}
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label
                        htmlFor={`fee-name-${item.id}`}
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-700"
                      >
                        Fee Name
                      </label>
                      <input
                        id={`fee-name-${item.id}`}
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff]"
                        placeholder="e.g. Doctor Consultation Platform Fee"
                      />
                    </div>

                    {/* Editable Amount */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`fee-amount-${item.id}`}
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-700"
                      >
                        Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          id={`fee-amount-${item.id}`}
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              amount: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          className="w-full pl-7 pr-3 py-2 text-sm bg-white rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff]"
                          placeholder="49"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scope / Applies To Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Applies To:</span>
                      <select
                        value={item.appliesTo || (item.id === 'consultation' ? 'consultation' : item.id === 'diagnostic' ? 'diagnostic' : 'custom')}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            appliesTo: e.target.value as 'consultation' | 'diagnostic' | 'custom',
                          })
                        }
                        className="bg-white border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1 font-medium focus:outline-none focus:border-[#0066ff]"
                      >
                        <option value="consultation">Doctor Appointments</option>
                        <option value="diagnostic">Diagnostic Lab Tests</option>
                        <option value="custom">Custom Surcharge</option>
                      </select>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isConsultation
                        ? 'Added at doctor checkout'
                        : isDiagnostic
                        ? 'Added at diagnostic checkout'
                        : 'Custom platform fee'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Live Calculation Preview */}
        <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Doctor Consultation Checkout: </span>
              A patient booking a ₹500 consultation will pay{' '}
              <strong className="text-blue-700">₹500 + ₹{consultTotal} = ₹{500 + consultTotal}</strong> online.
            </div>
            <div>
              <span className="font-semibold text-slate-900">Diagnostic Lab Checkout: </span>
              A patient booking a ₹1,000 lab test will pay{' '}
              <strong className="text-emerald-700">₹1,000 + ₹{diagTotal} = ₹{1000 + diagTotal}</strong> online.
            </div>
          </div>
          <div className="text-slate-500 md:text-right shrink-0">
            Doctor / Lab Payout: <strong className="text-slate-800">100% of Base Fee</strong>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" /> Add Another Fee
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-[#0066ff] hover:bg-[#0050cb] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Platform Fees...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Platform Fees
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
