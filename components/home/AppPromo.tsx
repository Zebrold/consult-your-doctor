import Image from "next/image";
import { AppComingSoon, AppleLogo, GooglePlayLogo } from "@/components/AppComingSoon";

// The home page's "Get the app" banner, in the site's blue with the 3D stethoscope, cross, coat and first-aid kit. The
// app isn't out yet, so it says so: the store badges are marked coming soon, and on desktops the phone's QR code opens
// the website on the visitor's phone instead of a store page.

const ART = "/images/home/app";
const glow = "drop-shadow-[0_14px_22px_rgba(4,16,70,0.42)]";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-['Helvetica_Neue',Helvetica,Arial,sans-serif] font-bold tracking-[-0.01em] ${className}`}>
      <span className="text-[#A9CBFF]">Consult</span> your Doctor
    </span>
  );
}

function ComingSoon({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25 text-white font-extrabold uppercase tracking-[0.08em] ${className}`}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#7CF2B0] shadow-[0_0_0_3px_rgba(124,242,176,0.22)]" />
      Coming soon
    </span>
  );
}

const stores = [
  { name: "App Store", logo: AppleLogo },
  { name: "Google Play", logo: GooglePlayLogo },
];

/**
 * Desktops (and tablets): the wide banner. `qr` is an SVG of the site's address (made on the server), shown on the
 * phone so the visitor can carry on there.
 */
export function AppPromo({ qr }: { qr: string }) {
  return (
    <section aria-labelledby="app-promo-title" className="hidden md:block px-[max(24px,10%)] pb-16 lg:pb-24">
      <div className="relative isolate overflow-hidden rounded-[28px] text-white bg-[radial-gradient(120%_160%_at_0%_0%,#3566F2_0%,#1D4ED8_42%,#11309F_100%)] shadow-[0_30px_60px_-28px_rgba(29,78,216,0.65)] md:grid md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_480px] min-h-[300px]">
        {/* Soft light: a ring of colour bottom left, a glow behind the phone */}
        <span aria-hidden className="absolute -z-10 -left-28 -bottom-48 w-[460px] h-[460px] rounded-full border-[56px] border-white/[0.05]" />
        <span aria-hidden className="absolute -z-10 right-[4%] -top-40 w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle,rgba(169,203,255,0.38),rgba(169,203,255,0)_62%)]" />
        <span aria-hidden className="absolute -z-10 inset-0 rounded-[28px] ring-1 ring-inset ring-white/10" />

        <div className="px-10 lg:px-14 py-10 lg:py-12 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-3">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} className="w-11 h-11 object-contain" />
            <Wordmark className="text-[22px] xl:text-[24px] whitespace-nowrap" />
          </div>
          <ComingSoon className="self-start mt-6 h-7 px-3 text-[11.5px]" />
          <h2 id="app-promo-title" className="mt-3 text-[28px] lg:text-[32px] xl:text-[38px] leading-[1.12] font-extrabold tracking-[-0.025em] text-balance">
            Get the Consult your Doctor app
          </h2>
          <p className="mt-2.5 max-w-[520px] text-[15px] xl:text-[16px] leading-[1.55] text-[#DCE7FF] text-balance">
            Your personal healthcare concierge: appointments, diagnostics and care in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {stores.map(({ name, logo: Logo }) => (
              <span key={name} aria-disabled className="flex items-center gap-2.5 h-12 pl-3.5 pr-4 rounded-xl bg-[#0A1E6E]/45 ring-1 ring-inset ring-white/20 select-none">
                <Logo className="w-6 h-6 shrink-0" />
                <span className="flex flex-col leading-none">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#BFD2FF]">Coming soon on</span>
                  <span className="mt-1 text-[15px] font-bold tracking-tight">{name}</span>
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[300px]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[204px] xl:w-[236px]">
            <Image src={`${ART}/plus.webp`} alt="" width={89} height={85} className={`hidden xl:block absolute -left-[92px] top-[18px] w-[72px] -rotate-6 ${glow}`} />
            <Image src={`${ART}/stethoscope.webp`} alt="" width={115} height={184} className={`hidden xl:block absolute -left-[104px] bottom-[-6px] w-[96px] ${glow}`} />
            <Image src={`${ART}/coat.webp`} alt="" width={135} height={147} className={`hidden xl:block absolute -right-[114px] top-[8px] w-[100px] ${glow}`} />
            <Image src={`${ART}/kit.webp`} alt="" width={122} height={113} className={`hidden xl:block absolute -right-[104px] bottom-[12px] w-[88px] ${glow}`} />

            {/* The phone, cut off by the banner's bottom edge */}
            <div className="rounded-t-[40px] bg-[#0A1022] p-[9px] pb-0 shadow-[0_30px_70px_rgba(4,14,52,0.55)] ring-1 ring-white/15">
              <div className="h-[238px] xl:h-[256px] rounded-t-[32px] bg-white pt-3 px-4 flex flex-col items-center">
                <span aria-hidden className="w-[78px] h-[22px] rounded-full bg-[#0A1022]" />
                <div className="mt-4 p-2.5 rounded-2xl bg-white shadow-[0_0_0_1px_#E6EBF3,0_8px_18px_rgba(11,27,63,0.08)]">
                  <div role="img" aria-label="QR code that opens Consult your Doctor" className="w-[112px] h-[112px] xl:w-[132px] xl:h-[132px] [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
                </div>
                <p className="mt-3 text-center text-[13px] xl:text-[14px] leading-tight font-extrabold text-[#1D4ED8] text-balance">Scan to open on your phone</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Phones: the same banner as a strip at the very top of the home page. */
export function AppPromoStrip() {
  return (
    <section aria-labelledby="app-strip-title" className="md:hidden relative isolate overflow-hidden text-white bg-[linear-gradient(135deg,#0B2075_0%,#1638B5_55%,#1D4ED8_100%)] border-b border-white/10">
      <span aria-hidden className="absolute -z-10 -right-16 -top-24 w-[260px] h-[260px] rounded-full bg-[radial-gradient(circle,rgba(169,203,255,0.34),rgba(169,203,255,0)_62%)]" />
      <span aria-hidden className="absolute -z-10 -left-20 -bottom-28 w-[220px] h-[220px] rounded-full border-[34px] border-white/[0.05]" />
      <div className="flex items-stretch min-h-[156px]">
        <div className="flex-1 min-w-0 pl-4 pr-1 pt-3.5 pb-4 flex flex-col">
          <div className="flex items-center gap-2">
            <Image src="/logo-icon-white.png" alt="" width={48} height={48} className="w-[22px] h-[22px] object-contain" />
            <Wordmark className="text-[13.5px]" />
          </div>
          <p id="app-strip-title" className="mt-2.5 text-[18px] leading-[1.18] font-extrabold tracking-[-0.02em] text-balance">
            Get the Consult your Doctor app
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.4] text-[#CFDCFF] text-balance">Appointments, diagnostics and care in one place.</p>
          <div className="mt-auto pt-3 flex items-center gap-2.5">
            <AppComingSoon variant="promo" />
            <ComingSoon className="h-6 px-2.5 text-[10px]" />
          </div>
        </div>

        <div className="relative w-[118px] shrink-0">
          <Image src={`${ART}/plus.webp`} alt="" width={89} height={85} className={`absolute left-[-2px] top-[14px] w-[34px] -rotate-6 ${glow}`} />
          <Image src={`${ART}/kit.webp`} alt="" width={122} height={113} className={`absolute right-[2px] bottom-[4px] w-[44px] z-[1] ${glow}`} />
          {/* A small phone with the logo on its screen, cut off by the strip's bottom edge */}
          <div className="absolute bottom-0 left-[16px] w-[80px] rounded-t-[20px] bg-[#0A1022] p-[5px] pb-0 shadow-[0_16px_30px_rgba(4,14,52,0.5)] ring-1 ring-white/15">
            <div className="h-[112px] rounded-t-[15px] bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF3FF_100%)] pt-1.5 flex flex-col items-center">
              <span aria-hidden className="w-7 h-2 rounded-full bg-[#0A1022]" />
              {/* The app's icon, as it will sit on a home screen */}
              <span className="mt-4 w-11 h-11 rounded-[12px] bg-white shadow-[0_4px_10px_rgba(11,27,63,0.14),0_0_0_1px_#E6EBF3] flex items-center justify-center">
                <Image src="/logo-icon.png" alt="" width={96} height={96} className="w-7 h-7 object-contain" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
