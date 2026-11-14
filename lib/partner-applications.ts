// Hospitals and diagnostic centres applying to join the network: what the public forms collect
// (app/(auth)/signup/hospital, app/(auth)/signup/diagnostic-centre) and how the executive portal shows it.
// The checks follow the Diagnostic Centre Checks document (CYD-CLN-04) and the Telemedicine SOP (CYD-CLN-01).
// Plain data only, so client components can import it.

export type PartnerKind = 'hospital' | 'diagnostic_center'

export const PARTNER_NOUN: Record<PartnerKind, string> = { hospital: 'hospital', diagnostic_center: 'diagnostic centre' }

export const HOSPITAL_TYPES = ['Multi-speciality hospital', 'Single-speciality hospital', 'Nursing home', 'Clinic or polyclinic', 'Day-care centre']

export const HOSPITAL_ACCREDITATIONS = ['NABH', 'NABH Entry Level', 'JCI', 'ISO 9001', 'Other', 'None yet']

export const LAB_TYPES = ['Pathology lab', 'Imaging and radiology centre', 'Pathology and imaging centre', 'Hospital laboratory']

export const LAB_SERVICES = ['Pathology lab', 'Radiology and X-ray', 'Ultrasound', 'CT or MRI', 'ECG and cardiac tests', 'Home sample collection']

export const OWNERSHIP_TYPES = ['Private', 'Trust or charitable', 'Government', 'Corporate group', 'Partnership or LLP']

export const HOSPITAL_DEPARTMENTS = [
  'General Medicine',
  'General Surgery',
  'Cardiology',
  'Orthopaedics',
  'Paediatrics',
  'Gynaecology & Obstetrics',
  'ENT',
  'Dermatology',
  'Neurology',
  'Nephrology',
  'Ophthalmology',
  'Dental',
]

export const HOSPITAL_FACILITIES = ['Pharmacy', 'Laboratory', 'X-ray and scans', 'Operation theatre', 'Ambulance', 'Blood bank', 'Dialysis', 'Cashless insurance', 'Parking']

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const REPORT_TIMES = ['Within 6 hours', 'Same day', 'Next day', '2 to 3 days', 'Depends on the test']

export const REPORT_FORMATS = ['PDF report', 'Printed copy', 'Both']

export const CALL_TIMES = ['Morning, 9 am to 12 pm', 'Afternoon, 12 to 4 pm', 'Evening, 4 to 7 pm', 'Any time']

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

/** Where the platform pays the partner's share of the payments it collects. */
export type PayoutAccount = { holder: string; account: string; ifsc: string; upi?: string }

export type SecondContact = { name?: string; phone?: string; email?: string }

/** The extra answers kept with an application (partner_applications.details). Older applications have fewer. */
export type PartnerDetails = {
  /** A new branch asked for from a hospital's Accounts & branches page: approving it gives the asker access to it. */
  branchOf?: { hospitalId: string; hospitalName: string; requestedBy: string; requestedByName: string }
  /** Filled in by the team during a call from a partner enquiry (/executive/support, Hospital interest). */
  filedBy?: { name: string; enquiryId: string }
  /** The bank account or UPI ID the hospital gave on that call, as they said it. */
  payoutNote?: string
  state?: string
  pincode?: string
  website?: string
  landmark?: string
  ownership?: string
  yearEstablished?: number | null
  orgPhone?: string
  emergencyPhone?: string
  orgEmail?: string
  registrationAuthority?: string
  registrationValidUntil?: string
  pan?: string
  gstin?: string
  bmwAuthorisation?: string
  openDays?: string[]
  openFrom?: string
  openTo?: string
  bank?: PayoutAccount
  bestTimeToCall?: string
  secondContact?: SecondContact
  /** Uploaded files by field (lib/application-documents.ts). */
  documents?: Record<string, string>
  /** True when the form could not take uploads, so the documents come by email. */
  documentsByEmail?: boolean
  // Hospitals
  facilityType?: string
  doctorsOnStaff?: number | null
  accreditation?: string
  accreditationNumber?: string
  accreditationValidUntil?: string
  fireNoc?: string
  beds?: number | null
  icuBeds?: number | null
  emergency24h?: boolean
  departments?: string[]
  facilities?: string[]
  insurers?: string
  /** Older applications: main specialities as typed. */
  specialties?: string
  // Diagnostic centres
  centreType?: string
  branches?: number | null
  services?: string[]
  nablNumber?: string
  nablValidUntil?: string
  responsibleName?: string
  responsibleRegistration?: string
  radiologistName?: string
  radiologistRegistration?: string
  pcpndtNumber?: string
  pcpndtValidUntil?: string
  aerbNumber?: string
  testsOffered?: number | null
  reportTime?: string
  reportFormat?: string
}

export type PartnerApplication = {
  id: string
  kind: PartnerKind
  organizationName: string
  city: string
  address: string | null
  contactName: string
  contactRole: string | null
  email: string
  phone: string
  registrationNumber: string | null
  details: PartnerDetails
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  /** Short-lived links to the uploaded documents (filled in by the executive portal's loader). */
  documentLinks?: { key: string; label: string; url: string | null }[]
}

/** "2027-03-31" as "31 Mar 2027". */
export function formatApplicationDate(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? ''
  const [y, m, d] = value.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** "09:00" as "9:00 am". */
export function formatApplicationTime(value: string | undefined | null) {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? '')
  if (!m) return value ?? ''
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`
}

const joinParts = (...parts: (string | number | null | undefined | false)[]) => parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '').join(' · ')
const until = (date?: string) => (date ? `valid until ${formatApplicationDate(date)}` : '')
const hours = (days?: string[], from?: string, to?: string) =>
  joinParts(days?.join(', '), from && to ? `${formatApplicationTime(from)} to ${formatApplicationTime(to)}` : '')

/** The application's details as label and value pairs, in the order a reviewer checks them. */
export function partnerDetailRows(app: PartnerApplication): [string, string][] {
  const d = app.details
  const registration = joinParts(app.registrationNumber, d.registrationAuthority, until(d.registrationValidUntil))
  const rows: [string, string | number | null | undefined][] =
    app.kind === 'hospital'
      ? [
          ['Branch of', d.branchOf ? `${d.branchOf.hospitalName} (asked for by ${d.branchOf.requestedByName}, who gets access once approved)` : null],
          ['Filled in by', d.filedBy ? `${d.filedBy.name}, during a call after the hospital’s enquiry` : null],
          ['Payout account (given on the call)', d.payoutNote ?? null],
          ['Type', joinParts(d.facilityType, d.ownership)],
          ['Established', d.yearEstablished ?? null],
          ['Registration / licence', registration],
          ['Accreditation', joinParts(d.accreditation, d.accreditationNumber, until(d.accreditationValidUntil))],
          ['Fire safety NOC', d.fireNoc],
          ['Biomedical waste authorisation', d.bmwAuthorisation],
          ['Beds', joinParts(d.beds ?? null, d.icuBeds ? `${d.icuBeds} ICU` : '')],
          ['24-hour emergency', d.emergency24h === undefined ? null : d.emergency24h ? 'Yes' : 'No'],
          ['Doctors on staff', d.doctorsOnStaff ?? null],
          ['Departments', d.departments?.join(', ') || d.specialties],
          ['Facilities', d.facilities?.join(', ')],
          ['OPD', hours(d.openDays, d.openFrom, d.openTo)],
          ['Insurance accepted', d.insurers],
        ]
      : [
          ['Type', joinParts(d.centreType, d.ownership)],
          ['Established', joinParts(d.yearEstablished ?? null, d.branches ? `${d.branches} branches` : '')],
          ['Services', d.services?.join(', ')],
          ['Registration / licence', registration],
          ['NABL accreditation', joinParts(d.nablNumber, until(d.nablValidUntil))],
          ['Pathologist who signs reports', joinParts(d.responsibleName, d.responsibleRegistration && `Reg. ${d.responsibleRegistration}`)],
          ['Radiologist who signs reports', joinParts(d.radiologistName, d.radiologistRegistration && `Reg. ${d.radiologistRegistration}`)],
          ['PCPNDT registration', joinParts(d.pcpndtNumber, until(d.pcpndtValidUntil))],
          ['AERB licence', d.aerbNumber],
          ['Biomedical waste authorisation', d.bmwAuthorisation],
          ['Tests', joinParts(d.testsOffered ? `${d.testsOffered} tests` : '', d.reportTime && `reports ${d.reportTime.toLowerCase()}`, d.reportFormat)],
          ['Open', hours(d.openDays, d.openFrom, d.openTo)],
        ]
  return [
    ...rows,
    ['PAN', d.pan],
    ['GSTIN', d.gstin],
    ['Address', [app.address, d.landmark, app.city, d.state, d.pincode].filter(Boolean).join(', ')],
    [app.kind === 'hospital' ? 'Hospital phone and email' : 'Centre phone and email', joinParts(d.orgPhone, d.emergencyPhone && `emergency ${d.emergencyPhone}`, d.orgEmail)],
    ['Website', d.website],
    ['Bank account', d.bank ? joinParts(d.bank.holder, d.bank.account, d.bank.ifsc, d.bank.upi && `UPI ${d.bank.upi}`) : null],
    ['Best time to call', d.bestTimeToCall],
    ['Second contact', d.secondContact ? joinParts(d.secondContact.name, d.secondContact.phone, d.secondContact.email) : null],
    ['Documents', d.documentsByEmail ? 'To be sent by email' : null],
  ]
    .filter((row): row is [string, string | number] => row[1] !== null && row[1] !== undefined && row[1] !== '')
    .map(([label, value]) => [label, String(value)])
}
