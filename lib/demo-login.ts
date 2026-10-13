// The shared demo patient: the number +91 98765 43210 with code 123456 signs into it without a text message.
// It is a real, signed-in account, so it only works where it has been switched on on purpose
// (ENABLE_DEMO_LOGIN=true), and its password comes from the environment, never from source.

export const DEMO_PHONE = '+919876543210'
export const DEMO_CODE = '123456'
export const DEMO_PATIENT_EMAIL = 'patient.demo@cyd.internal'

export const demoLoginEnabled = () => process.env.ENABLE_DEMO_LOGIN === 'true' && !!process.env.DEMO_PATIENT_PASSWORD

/** The demo account's password, or null where demo sign-in is off. */
export const demoPatientPassword = () => (demoLoginEnabled() ? process.env.DEMO_PATIENT_PASSWORD! : null)

export const isDemoPhone = (phone: string) => phone === DEMO_PHONE || phone.replace(/\D/g, '').endsWith('9876543210')
