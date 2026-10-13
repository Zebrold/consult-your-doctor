/**
 * Structured data for a <script type="application/ld+json"> tag. JSON.stringify leaves "<" as is, so a doctor's or
 * hospital's name containing "</script>" would end the tag and run whatever follows; escaping it keeps the JSON
 * identical for search engines and inert for browsers.
 */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
