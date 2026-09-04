import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col overflow-x-hidden">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
