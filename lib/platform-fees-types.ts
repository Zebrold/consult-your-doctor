export type PlatformFeeItem = {
  id: string
  name: string
  amount: number
  description?: string
  appliesTo?: 'consultation' | 'diagnostic' | 'custom'
}

export type PlatformFees = {
  consultation: number
  diagnostic: number
  items: PlatformFeeItem[]
  [key: string]: any
}

export const DEFAULT_FEE_ITEMS: PlatformFeeItem[] = [
  {
    id: 'consultation',
    name: 'Doctor Consultation Platform Fee',
    amount: 49,
    description: 'Added to online doctor appointments at checkout.',
    appliesTo: 'consultation',
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic Lab Platform Fee',
    amount: 29,
    description: 'Added to online diagnostic lab test bookings at checkout.',
    appliesTo: 'diagnostic',
  },
]

export const DEFAULT_FEES: PlatformFees = {
  consultation: 49,
  diagnostic: 29,
  items: DEFAULT_FEE_ITEMS,
}
