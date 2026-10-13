import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://consultyourdoctor.de"),

  title: {
    default: "Consult Your Doctor | AI-Powered Doctors and Personalized Medication Support",
    template: "%s | Consult Your Doctor",
  },

  description:
    "AI-powered doctors provide personalized medical advice and support medication planning to make your healthcare decisions easier.",

  openGraph: {
    title: "Consult Your Doctor | AI-Powered Doctors and Personalized Medication Support",
    description:
      "AI-powered doctors provide personalized medical advice and support medication planning to make your healthcare decisions easier.",
    url: "https://consultyourdoctor.de",
    siteName: "Consult Your Doctor",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Consult Your Doctor | AI-Powered Doctors and Personalized Medication Support",
    description:
      "AI-powered doctors provide personalized medical advice and support medication planning to make your healthcare decisions easier.",
  },


  verification: {
    google: "5bOD-nmb-MHl3VmBVPiSUMceyayzS75abEd8q69U4YQ",
  },
};

// `cover` lets the page reach under the notch and home indicator; the header, the navigation pill and the assistant
// pad themselves with env(safe-area-inset-*), which only reports real values with it. Pinch-zoom stays allowed.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
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

  const isPatientLoggedIn = !!user && (userRole === "patient" || !userRole);

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
        <ConditionalLayout
          header={<Header />}
          footer={<Footer />}
        >
          {children}
        </ConditionalLayout>
        <Support role={user ? userRole ?? "patient" : null} viewer={user?.id ?? null} />
      </body>
    </html>
  );
}