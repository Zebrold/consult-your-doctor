import type { NextConfig } from "next";

// Anything NEXT_PUBLIC_ is compiled into the JavaScript every visitor downloads. A Supabase service-role or secret key
// there gives every visitor full read and write access to the database, past every row level security policy.
function supabaseKeyRole(key: string | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("sb_secret_")) return "secret";
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString()).role ?? null;
  } catch {
    return null;
  }
}
{
  // The browser client uses the publishable key first, then the anon key (lib/supabase/client.ts).
  const name = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  const role = supabaseKeyRole(process.env[name]);
  const unusedRole = name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ? supabaseKeyRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : null;
  if (role === "service_role" || role === "secret") {
    const message = `${name} holds a Supabase ${role} key, which would be shipped to every browser. Put the publishable (anon) key there and keep the service key in SUPABASE_SERVICE_ROLE_KEY only.`;
    // A production build would bake the key into the JavaScript every visitor downloads, so refuse to make one.
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`\n⚠  ${message}\n`);
  } else if (unusedRole === "service_role" || unusedRole === "secret") {
    console.warn("\n⚠  NEXT_PUBLIC_SUPABASE_ANON_KEY holds a Supabase service-role key. It isn't used while the publishable key is set, but remove it.\n");
  }
}

// Sent with every page: no framing by other sites (clickjacking), no MIME sniffing, no full URLs leaked to other
// sites, no browser features the site doesn't use, and a popup policy Google Sign-In works with.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Prescription and lab report PDFs are drawn on the server with these fonts and the logo (lib/pdf/clinical.ts).
  outputFileTracingIncludes: {
    '/**': ['./public/fonts/NotoSans-*.ttf', './public/logo-icon.png'],
  },
  // Other addresses people try for the legal pages, and the removed How it works page, whose FAQ is now /faq.
  async redirects() {
    return [
      { source: '/terms', destination: '/terms-of-use', permanent: true },
      { source: '/terms-and-conditions', destination: '/terms-of-use', permanent: true },
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
      { source: '/how-it-works', destination: '/faq', permanent: true },
    ]
  },
  // Not experimental.inlineCss: tried 2026-10-28, it put the ~210 KB stylesheet in every page three times (a <style>
  // tag plus two copies in the RSC payload), ~45 KB brotli more per page view than the cached stylesheet file.
  images: {
    // Uploaded photos get a new file name every time (doctors/<id>-<timestamp>.jpg), so a resized copy never goes
    // stale: keep it for 31 days instead of the default 4 hours.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
