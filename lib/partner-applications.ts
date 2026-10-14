// Hospitals and diagnostic centres applying to join the network: what the public forms collect
// (app/(auth)/signup/hospital, app/(auth)/signup/diagnostic-centre) and how the executive portal shows it.
// The checks follow the Diagnostic Centre Checks document (CYD-CLN-04) and the Telemedicine SOP (CYD-CLN-01).
// Plain data only, so client components can import it.

export type PartnerKind = 'hospital' | 'diagnostic_center'

export const PARTNER_NOUN: Record<PartnerKind, string> = { hospital: 'hospital', diagnostic_center: 'diagnostic centre' }

export const HOSPITAL_TYPES = ['Multi-speciality hospital', 'Single-speciality hospital', 'Nursing home', 'Clinic or polyclinic', 'Day-care centre']

export const HOSPITAL_ACCREDITATIONS = ['NABH', 'NABH Entry Level', 'JCI', 'ISO 9001', 'Other', 'None yet']

export const LAB_SERVICES = ['Pathology lab', 'Radiology and X-ray', 'Ultrasound', 'CT or MRI', 'ECG and cardiac tests', 'Home sample collection']

/** The extra answers kept with an application (partner_applications.details). */
export type PartnerDetails = {
  state?: string
  pincode?: string
  website?: string
  registrationAuthority?: string
  // Hospitals
  facilityType?: string
  accreditation?: string
  accreditationNumber?: string
  beds?: number | null
  specialties?: string
  // Diagnostic centres
  services?: string[]
  nablNumber?: string
  responsibleName?: string
  responsibleRegistration?: string
  pcpndtNumber?: string
  bmwAuthorisation?: string
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
}

/** The application's details as label and value pairs, in the order a reviewer checks them. */
export function partnerDetailRows(app: PartnerApplication): [string, string][] {
  const d = app.details
  const rows: [string, string | number | null | undefined][] =
    app.kind === 'hospital'
      ? [
          ['Type', d.facilityType],
          ['Registration / licence', [app.registrationNumber, d.registrationAuthority].filter(Boolean).join(' · ')],
          ['Accreditation', [d.accreditation, d.accreditationNumber].filter(Boolean).join(' · ')],
          ['Beds', d.beds ?? null],
          ['Specialities', d.specialties],
        ]
      : [
          ['Services', d.services?.join(', ')],
          ['Registration / licence', [app.registrationNumber, d.registrationAuthority].filter(Boolean).join(' · ')],
          ['NABL accreditation', d.nablNumber],
          ['Signs reports', [d.responsibleName, d.responsibleRegistration && `Reg. ${d.responsibleRegistration}`].filter(Boolean).join(' · ')],
          ['PCPNDT registration', d.pcpndtNumber],
          ['Biomedical waste authorisation', d.bmwAuthorisation],
        ]
  return [
    ...rows,
    ['Address', [app.address, app.city, d.state, d.pincode].filter(Boolean).join(', ')],
    ['Website', d.website],
  ].filter((row): row is [string, string | number] => row[1] !== null && row[1] !== undefined && row[1] !== '').map(([label, value]) => [label, String(value)])
}
