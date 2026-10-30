import { STORE_LINKS } from "@/lib/app-links";

// The App Store and Google Play badges. No hooks, so server pages (the footer) and client ones (the header's Get the
// app card) both use them.

export function AppleLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function GooglePlayLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} strokeLinejoin="round" strokeWidth={0.8}>
      <path d="M3 1.5 13.5 12 3 22.5Z" fill="#00B4FF" stroke="#00B4FF" />
      <path d="M3 1.5 16.5 9.16 13.5 12Z" fill="#00D26A" stroke="#00D26A" />
      <path d="M3 22.5 13.5 12 16.5 14.84Z" fill="#FF3A44" stroke="#FF3A44" />
      <path d="M16.5 9.16 21.5 12 16.5 14.84 13.5 12Z" fill="#FFC400" stroke="#FFC400" />
    </svg>
  );
}

const STORES = {
  apple: { name: "App Store", line: "Download on the", Logo: AppleLogo },
  google: { name: "Google Play", line: "Get it on", Logo: GooglePlayLogo },
};

const SIZE = {
  sm: { box: "h-11 pl-2.5 pr-3 gap-2 rounded-[10px]", logo: "w-[22px] h-[22px]", line: "text-[8px] tracking-[0.03em]", name: "text-[14px]" },
  md: { box: "h-[52px] pl-3.5 pr-4 gap-2.5 rounded-xl", logo: "w-[26px] h-[26px]", line: "text-[9.5px] tracking-[0.06em]", name: "text-[16.5px]" },
};

const TONE = {
  /** Navy, for white cards and the footer's blue. */
  dark: "bg-[#0B1B3F] text-white ring-1 ring-inset ring-white/15",
  /** See-through, on the blue app banner. */
  glass: "bg-[#0A1E6E]/45 text-white ring-1 ring-inset ring-white/20",
};

export function StoreBadge({ store, size = "md", tone = "dark" }: { store: keyof typeof STORES; size?: keyof typeof SIZE; tone?: keyof typeof TONE }) {
  const { name, line, Logo } = STORES[store];
  const s = SIZE[size];
  const href = STORE_LINKS[store];
  const body = (
    <>
      <Logo className={`${s.logo} shrink-0`} />
      <span className="flex flex-col leading-none text-left">
        <span className={`${s.line} font-bold uppercase whitespace-nowrap text-white/80`}>{line}</span>
        <span className={`mt-[3px] ${s.name} font-extrabold tracking-[-0.01em] whitespace-nowrap`}>{name}</span>
      </span>
    </>
  );
  const cls = `inline-flex items-center select-none ${s.box} ${TONE[tone]}`;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${line} ${name}`} className={`${cls} hover:brightness-125 transition-[filter]`}>
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

export function StoreBadges({ size, tone, className = "" }: { size?: keyof typeof SIZE; tone?: keyof typeof TONE; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <StoreBadge store="apple" size={size} tone={tone} />
      <StoreBadge store="google" size={size} tone={tone} />
    </div>
  );
}
