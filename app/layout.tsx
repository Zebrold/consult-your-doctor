import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConditionalLayout } from "@/components/ConditionalLayout";

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

  icons: {
    icon: "/logo.svg",
  },

  verification: {
    google: "5bOD-nmb-MHl3VmBVPiSUMceyayzS75abEd8q69U4YQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased scroll-smooth light`}
    >
      <body
        suppressHydrationWarning
        className="font-sans overflow-x-hidden text-on-surface bg-background"
      >
        <ConditionalLayout header={<Header />} footer={<Footer />}>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}