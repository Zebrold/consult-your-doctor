import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prescription and lab report PDFs are drawn on the server with these fonts and the logo (lib/pdf/clinical.ts).
  outputFileTracingIncludes: {
    '/**': ['./public/fonts/NotoSans-*.ttf', './public/logo-icon.png'],
  },
  // Other addresses people try for the legal pages.
  async redirects() {
    return [
      { source: '/terms', destination: '/terms-of-use', permanent: true },
      { source: '/terms-and-conditions', destination: '/terms-of-use', permanent: true },
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
    ]
  },
  images: {
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
