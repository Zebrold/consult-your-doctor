export type StaffRole = 'hospital_admin' | 'doctor' | 'executive'

/**
 * Who can sign in for a hospital and what each role reaches (enforced by the middleware and each portal's checks):
 * `access` names the portal, `scope` says what the role does there, and `short` follows a doctor's or desk's activity.
 */
export const ROLE: Record<StaffRole, { label: string; color: string; access: string; scope: string; short: string }> = {
  hospital_admin: {
    label: 'Hospital admin',
    color: '#2A4DD0',
    access: 'This portal: doctors, slots, patients and finance',
    scope: 'Full access: doctors, slots, patients, beds and finance',
    short: 'full access',
  },
  doctor: {
    label: 'Doctor',
    color: '#067647',
    access: 'Doctor portal: their own schedule and patients',
    scope: 'Own patients and schedule',
    short: 'own patients and schedule',
  },
  executive: {
    label: 'Front desk',
    color: '#B54708',
    access: 'Front-desk portal: walk-in bookings and desk payments',
    scope: 'Walk-in bookings and desk payments',
    short: 'walk-ins and desk payments',
  },
}
