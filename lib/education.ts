import { z } from 'zod'

// A doctor's education and training (doctors.education): degrees, residencies, fellowships and so on. The doctor adds
// and edits them on their profile, and patients see them on the doctor's public page.

export const EDUCATION_KINDS = ['Degree', 'Postgraduate', 'Residency', 'Fellowship', 'Super-speciality', 'Certification', 'Training', 'Teaching'] as const

export type EducationEntry = { kind: string; title: string; institution: string; year: string }

export const EducationSchema = z
  .array(
    z.object({
      kind: z.enum(EDUCATION_KINDS),
      title: z.string().trim().min(2, 'Enter the degree or course, e.g. MBBS.').max(120),
      institution: z.string().trim().max(160),
      year: z
        .string()
        .trim()
        .max(15)
        .regex(/^(\d{4}(\s*[-–]\s*(\d{4}|present))?)?$/i, 'Enter the year as 2012, or a range like 2012–2015.'),
    }),
  )
  .max(20, 'Add up to 20 entries.')

/** Entries stored on the doctor, ignoring anything malformed. */
export function parseEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({
      kind: typeof e.kind === 'string' ? e.kind : 'Degree',
      title: typeof e.title === 'string' ? e.title : '',
      institution: typeof e.institution === 'string' ? e.institution : '',
      year: typeof e.year === 'string' ? e.year : '',
    }))
    .filter((e) => e.title)
}
