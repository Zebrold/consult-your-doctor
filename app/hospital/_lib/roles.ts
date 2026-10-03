import type { Tone } from '@/components/portal/ui'

export type StaffRole = 'hospital_admin' | 'doctor' | 'executive'

/** Who can sign in for a hospital and what each role reaches (enforced by the middleware and each portal's checks). */
export const ROLE: Record<StaffRole, { label: string; tone: Tone; access: string }> = {
  hospital_admin: { label: 'Hospital admin', tone: 'blue', access: 'This portal: doctors, slots, patients and finance' },
  doctor: { label: 'Doctor', tone: 'teal', access: 'Doctor portal: their own schedule and patients' },
  executive: { label: 'Front desk', tone: 'neutral', access: 'Front-desk portal: walk-in bookings and desk payments' },
}
