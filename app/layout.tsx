import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { Support } from "@/components/assistant/Support";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const SITE_TITLE = "Consult Your Doctor | Book Doctors, Hospitals & Lab Tests Near You";
const SITE_DESCRIPTION =
  "Find verified doctors at partner hospitals and diagnostic labs, book a hospital visit or lab test online, and keep your prescriptions and reports in one place.";

export const metadata: Metadata = {
  metadataBase: new URL("https://consultyourdoctor.de"),

  title: {
    default: SITE_TITLE,
    template: "%s | Consult Your Doctor",
  },

  description: SITE_DESCRIPTION,

  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "https://consultyourdoctor.de",
    siteName: "Consult Your Doctor",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },


  verification: {
    google: "5bOD-nmb-MHl3VmBVPiSUMceyayzS75abEd8q69U4YQ",
  },
};

// `cover` lets the page reach under the notch and home indicator; the header, the navigation pill and the assistant
// pad themselves with env(safe-area-inset-*), which only reports real values with it. Pinch-zoom stays allowed.
// The theme colour is the headers' blue, so Safari's status bar and Chrome's address bar run into the header instead of
// showing a white band above it (the home page sets its own, for its dark app strip).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2A4DD0",
};

import { getCurrentUser } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ROLE_COOKIE, readRoleCookie } from "@/lib/role-cookie";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  const userRole = user ? readRoleCookie(cookieStore.get(ROLE_COOKIE)?.value, user.id) : null;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${manrope.variable} h-full antialiased scroll-smooth light`}
    >
      <body
        suppressHydrationWarning
        className="font-sans overflow-x-hidden text-on-surface bg-background"
      >
        <ConditionalLayout header={<Header />}>
          {children}
        </ConditionalLayout>
        <Support role={user ? userRole ?? "patient" : null} viewer={user?.id ?? null} />
      </body>
    </html>
  );
}