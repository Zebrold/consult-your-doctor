import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
    default: "Consult Your Doctor | Online Medical Consultation",
    template: "%s | Consult Your Doctor",
  },
  description: "Book appointments and consult your doctor online effortlessly. Connecting you with top healthcare professionals.",
  openGraph: {
    title: "Consult Your Doctor | Online Medical Consultation",
    description: "Book appointments and consult your doctor online effortlessly.",
    url: "https://consultyourdoctor.de",
    siteName: "Consult Your Doctor",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Consult Your Doctor | Online Medical Consultation",
    description: "Book appointments and consult your doctor online effortlessly.",
  },
  icons: {
    icon: "/logo.svg"
  }
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
      <body suppressHydrationWarning className="min-h-screen flex flex-col font-sans pt-[88px] overflow-x-hidden text-on-surface bg-background">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
