import Image from "next/image";

/** Decorative preview of the patient mobile app shown on the marketing home page. */
export function HomePhoneMockup() {
  return (
    <div
      role="img"
      aria-label="Preview of the Consult your Doctor mobile app showing top doctors and specialties"
      className="relative w-full max-w-[340px] md:max-w-[360px] lg:max-w-[380px] flex items-center justify-center transition-all duration-500 hover:scale-[1.02] filter drop-shadow-xl select-none"
    >
      <Image
        src="/mobile-app-preview.png"
        alt="Consult your Doctor patient mobile application preview"
        width={673}
        height={1024}
        priority
        className="w-full h-auto object-contain select-none pointer-events-none"
      />
    </div>
  );
}

