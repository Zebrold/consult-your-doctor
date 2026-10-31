import Image from "next/image";
import { GetTheApp } from "@/components/GetTheApp";
import { StoreBadges } from "@/components/StoreBadges";

// The home page's "Get the app" banner, in deep blue with the store badges, and a phone between a stethoscope, a coat
// and a first-aid kit. On desktops the phone's QR code opens the site on the visitor's phone.

const ART = "/images/home/app";
const glow = "drop-shadow-[0_14px_22px_rgba(4,16,70,0.42)]";
const helvetica = "font-['Helvetica_Neue',Helvetica,Arial,sans-serif]";

/** One corner of the QR code's scan frame, turned to `at`. */
function ScanCorner({ at }: { at: string }) {
  return <span aria-hidden className={`absolute w-[18px] h-[18px] border-[#2563EB] ${at}`} />;
}

/**
 * Desktops (and tablets): the wide banner. `qr` is an SVG of the site's address (made on the server), shown on the
 * phone so the visitor can carry on there.
 */
export function AppPromo({ qr }: { qr: string }) {
  return (
    <section aria-labelledby="app-promo-title" className="hidden md:block px-[max(24px,10%)] pb-16 lg:pb-24">
      <div className="relative isolate overflow-hidden rounded-[24px] text-white bg-[linear-gradient(100deg,#0A3DB4_0%,#0B4BCB_38%,#0757D8_62%,#0A49C6_82%,#0B3BAE_100%)] shadow-[0_30px_60px_-28px_rgba(11,75,203,0.7)] md:grid md:grid-cols-[minmax(0,1fr)_250px] lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_540px] min-h-[300px] xl:min-h-[340px]">
        {/* A faint sweep of light across the middle */}
        <span aria-hidden className="absolute -z-10 left-[28%] top-[35%] w-[1200px] h-[1200px] rounded-full border-[90px] border-white/[0.035]" />
        <span aria-hidden className="absolute -z-10 inset-0 rounded-[24px] ring-1 ring-inset ring-white/10" />

        <div className={`px-10 lg:px-14 xl:px-[72px] py-10 lg:py-12 flex flex-col justify-center min-w-0 ${helvetica}`}>
          <div className="flex items-center gap-3">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} className="w-10 h-10 xl:w-11 xl:h-11 object-contain" />
            <span className="text-[22px] xl:text-[26px] font-bold tracking-[-0.01em] whitespace-nowrap">
              <span className="text-[#DCE7FF]">Consult</span> your Doctor
            </span>
          </div>
          <h2 id="app-promo-title" className="mt-5 xl:mt-6 text-[28px] lg:text-[32px] xl:text-[40px] leading-[1.12] font-bold tracking-[-0.015em] text-balance">
            Get the Consult your Doctor app
          </h2>
          <p className="mt-3 text-[15px] xl:text-[18px] leading-[1.45] text-[#E3EBFF]">
            Your personal healthcare concierge:
            <br className="hidden lg:inline" /> appointments, diagnostics and care in one place.
          </p>
          <StoreBadges tone="black" className="mt-6 xl:mt-7" />
        </div>

        <div className="relative min-h-[260px]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150px] xl:w-[162px]">
            <Image src={`${ART}/stethoscope.webp`} alt="" width={115} height={184} className={`hidden xl:block absolute right-[calc(100%+26px)] top-[70px] w-[84px] max-w-none ${glow}`} />
            <Image src={`${ART}/coat.webp`} alt="" width={135} height={147} className={`hidden xl:block absolute left-[calc(100%+26px)] top-[32px] w-[100px] max-w-none ${glow}`} />
            <Image src={`${ART}/kit.webp`} alt="" width={122} height={113} className={`hidden xl:block absolute left-[calc(100%+36px)] top-[170px] w-[74px] max-w-none ${glow}`} />

            {/* The phone, cut off by the banner's bottom edge: a metal rim, the black bezel, then the screen */}
            <div className="rounded-t-[34px] p-[2px] pb-0 bg-[linear-gradient(145deg,#71757D,#2A2C30_30%,#50545B_60%,#1D1F22)] shadow-[0_30px_60px_rgba(4,14,52,0.5)]">
              <div className="rounded-t-[32px] bg-[#0B0C0E] p-[6px] pb-0">
                <div className="h-[226px] xl:h-[264px] rounded-t-[26px] bg-[#F5F6F8] pt-2.5 flex flex-col items-center">
                  <span aria-hidden className="w-[54px] h-4 rounded-full bg-[#0B0C0E]" />
                  <div className="relative mt-6 xl:mt-9 p-[11px]">
                    <ScanCorner at="top-0 left-0 border-t-[2.5px] border-l-[2.5px] rounded-tl-[5px]" />
                    <ScanCorner at="top-0 right-0 border-t-[2.5px] border-r-[2.5px] rounded-tr-[5px]" />
                    <ScanCorner at="bottom-0 left-0 border-b-[2.5px] border-l-[2.5px] rounded-bl-[5px]" />
                    <ScanCorner at="bottom-0 right-0 border-b-[2.5px] border-r-[2.5px] rounded-br-[5px]" />
                    <div role="img" aria-label="QR code that opens Consult your Doctor" className="w-[88px] h-[88px] xl:w-[96px] xl:h-[96px] [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
                  </div>
                  <p className={`mt-4 xl:mt-6 text-center text-[13px] xl:text-[14px] leading-[1.25] font-bold text-[#1D4ED8] ${helvetica}`}>
                    Scan to open
                    <br />
                    on your phone
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Phones: a slim dark strip at the very top of the home page, with the app's icon and Open app. `data-top-strip` gives
 * the top of the page (Safari's status bar and the pull-down area) the strip's colour (globals.css).
 */
export function AppPromoStrip() {
  return (
    <section data-top-strip aria-label="Consult your Doctor app" className="md:hidden relative z-20 bg-[#0A1022] text-white border-b border-white/[0.06] font-(family-name:--font-manrope)">
      <div className="flex items-center gap-3 pl-4 pr-3 py-3">
        {/* The app's icon, as it sits on a home screen */}
        <span className="shrink-0 w-11 h-11 rounded-[12px] bg-[#2A4DD0] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_14px_rgba(42,77,208,0.35)]">
          <Image src="/logo-icon-white.png" alt="" width={96} height={96} className="w-7 h-7 object-contain" />
        </span>
        <p className="flex-1 min-w-0 text-[13.5px] leading-[1.3] font-bold tracking-[-0.01em] text-balance">Open in app for faster bookings &amp; a smoother experience!</p>
        <GetTheApp variant="open" />
      </div>
    </section>
  );
}
