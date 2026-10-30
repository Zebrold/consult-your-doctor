// The app's store listings. Set NEXT_PUBLIC_APP_STORE_URL and NEXT_PUBLIC_PLAY_STORE_URL to the listing pages and the
// store badges across the site link to them; without them the badges show without a link.
export const STORE_LINKS = {
  apple: process.env.NEXT_PUBLIC_APP_STORE_URL || null,
  google: process.env.NEXT_PUBLIC_PLAY_STORE_URL || null,
};
