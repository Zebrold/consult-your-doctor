// A doctor's login made for them (by their hospital, the executive team, or on approval) starts with a password
// someone else chose or generated. It is marked in the auth user's app_metadata, which only the server can change;
// the doctor portal then asks for a password of their own before anything else, and changing it clears the mark.

export const TEMPORARY_PASSWORD = 'password_temporary'

/** The app_metadata a new login gets when its password is temporary. */
export const temporaryPasswordMetadata = { [TEMPORARY_PASSWORD]: true }

export const hasTemporaryPassword = (user: { app_metadata?: Record<string, unknown> | null } | null | undefined) =>
  user?.app_metadata?.[TEMPORARY_PASSWORD] === true
