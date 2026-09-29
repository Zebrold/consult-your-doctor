'use client'

import { createContext, useContext, useState } from 'react'

const currencies = [
  { code: 'EUR', symbol: '€', rate: 1 },
  { code: 'USD', symbol: '$', rate: 1.08 },
  { code: 'INR', symbol: '₹', rate: 90 },
] as const

type Currency = (typeof currencies)[number]

const CurrencyContext = createContext<{ currency: Currency; setCurrency: (c: Currency) => void }>({
  currency: currencies[0],
  setCurrency: () => {},
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(currencies[0])
  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>
}

export function CurrencySwitcher() {
  const { currency, setCurrency } = useContext(CurrencyContext)
  return (
    <div className="inline-flex items-center bg-surface-container-lowest p-1.5 rounded-full shadow-md gap-1" role="group" aria-label="Currency">
      <span className="text-indigo-gray-600 font-label-sm text-label-sm pl-3 pr-2 hidden sm:inline">Currency:</span>
      {currencies.map((c) => (
        <button
          key={c.code}
          type="button"
          onClick={() => setCurrency(c)}
          aria-pressed={currency.code === c.code}
          className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all ${
            currency.code === c.code
              ? 'bg-vibrant-blue text-on-primary shadow-sm'
              : 'text-indigo-gray-600 hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          {c.code} ({c.symbol})
        </button>
      ))}
    </div>
  )
}

/** Renders a EUR base amount converted to the currency picked in the nearest CurrencySwitcher. */
export function Price({ eur }: { eur: number }) {
  const { currency } = useContext(CurrencyContext)
  const amount = Math.round(eur * currency.rate)
  return (
    <>
      {currency.symbol}
      {currency.code === 'INR' ? amount.toLocaleString('en-IN') : amount}
    </>
  )
}
