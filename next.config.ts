import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prescription and lab report PDFs are drawn on the server with these fonts and the logo (lib/pdf/clinical.ts).
  outputFileTracingIncludes: {
    '/**': ['./public/fonts/NotoSans-*.ttf', './public/logo-icon.png'],
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
