// Doctors applying to join (/signup/doctor): the form's choices, the extra answers kept with an application, and how
// the executive portal shows them. Plain data only, so client components can import it.
//
// doctor_signup_requests has columns for the name, email, phone, speciality and hospital. The rest goes in its details
// column (supabase/migrations/20261113_partner_documents.sql). Older applications, and any sent before that migration
// ran, pack the rest into qualifications: "MBBS, MD | EXP:8 | FEE:500 | COUNCIL:… | REG:… | SUB:… | DETAILS:{…}".

import { formatApplicationDate, formatApplicationTime } from './partner-applications'

export const MEDICAL_COUNCILS = [
  'National Medical Commission (NMC India)',
  'State Medical Council (India)',
  'General Medical Council (GMC UK)',
  'US State Medical Board (NPI)',
  'Irish Medical Council (IMC)',
  'AHPRA Medical Board of Australia',
  'Dubai Health Authority (DHA / MOHAP)',
  'German State Medical Chamber (Ärztekammer)',
  'Other',
]

// Stored as the doctor's specialty and department name, so they must stay in sync with existing data.
export const DOCTOR_SPECIALTIES = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology', 'Dermatology', 'General Practice', 'Psychiatry', 'Internal Medicine']

export const DOCTOR_TITLES = [
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Prof.', label: 'Prof.' },
  { value: 'Assoc. Prof.', label: 'Assoc. Prof.' },
  { value: 'Mr.', label: 'Mr. (Consultant Surgeon)' },
  { value: 'Ms.', label: 'Ms. (Consultant Surgeon)' },
]

export const GENDERS = ['Female', 'Male', 'Other']

export const DOCTOR_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi']

export const PRACTICE_TYPES = ['Full-time at the hospital', 'Part-time at the hospital', 'Visiting consultant']

export const SLOT_MINUTES = [10, 15, 20, 30]

/** The doctor form's answers beyond the table's own columns. */
export type DoctorDetails = {
  middleName?: string
  gender?: string
  dateOfBirth?: string
  languages?: string[]
  registrationYear?: number | null
  registrationValidUntil?: string
  college?: string
  passingYear?: number | null
  otherQualifications?: string
  practiceType?: string
  clinic?: string
  consultDays?: string[]
  consultFrom?: string
  consultTo?: string
  slotMinutes?: number | null
  bio?: string
  conditions?: string
  awards?: string
  pan?: string
  documents?: Record<string, string>
  documentsByEmail?: boolean
}

/** The packed qualifications string, split into its parts. */
export function parseApplication(qualifications: string | null) {
  const parts = (qualifications || '').split(' | ')
  const get = (prefix: string) => parts.find((p) => p.startsWith(`${prefix}:`))?.slice(prefix.length + 1) ?? null
  let extra: DoctorDetails = {}
  const packed = get('DETAILS')
  if (packed) {
    try {
      extra = JSON.parse(packed) as DoctorDetails
    } catch {
      extra = {}
    }
  }
  return {
    qualification: parts[0] || null,
    experience: get('EXP'),
    fee: get('FEE'),
    council: get('COUNCIL'),
    registration: get('REG'),
    subSpecialty: get('SUB'),
    extra,
  }
}

/** The extra answers: the details column when it has them, else the packed copy in qualifications. */
export function doctorDetails(detailsColumn: unknown, qualifications: string | null): DoctorDetails {
  if (detailsColumn && typeof detailsColumn === 'object' && Object.keys(detailsColumn).length > 0) return detailsColumn as DoctorDetails
  return parseApplication(qualifications).extra
}

const joinParts = (...parts: (string | number | null | undefined | false)[]) => parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '').join(' · ')

/** The extra answers as label and value pairs for the reviewer. */
export function doctorDetailRows(d: DoctorDetails): [string, string][] {
  const rows: [string, string | number | null | undefined][] = [
    ['Gender and date of birth', joinParts(d.gender, d.dateOfBirth && formatApplicationDate(d.dateOfBirth))],
    ['Languages', d.languages?.join(', ')],
    ['Registered', joinParts(d.registrationYear ?? null, d.registrationValidUntil && `valid until ${formatApplicationDate(d.registrationValidUntil)}`)],
    ['Degree from', joinParts(d.college, d.passingYear ?? null)],
    ['Other qualifications', d.otherQualifications],
    ['Practice', joinParts(d.practiceType, d.clinic && `own clinic: ${d.clinic}`)],
    [
      'Consults',
      joinParts(
        d.consultDays?.join(', '),
        d.consultFrom && d.consultTo ? `${formatApplicationTime(d.consultFrom)} to ${formatApplicationTime(d.consultTo)}` : '',
        d.slotMinutes ? `${d.slotMinutes} min per patient` : '',
      ),
    ],
    ['About', d.bio],
    ['Conditions and treatments', d.conditions],
    ['Awards and memberships', d.awards],
    ['PAN', d.pan],
    ['Documents', d.documentsByEmail ? 'To be sent by email' : null],
  ]
  return rows.filter((row): row is [string, string | number] => row[1] !== null && row[1] !== undefined && row[1] !== '').map(([l, v]) => [l, String(v)])
}
