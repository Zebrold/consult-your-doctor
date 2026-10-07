import type { CSSProperties } from "react";
import Image from "next/image";
import { BadgeCheck, Bot, ChevronRight, FileChartLine, ShieldCheck, Stethoscope, UserRound, type LucideIcon } from "lucide-react";

const BLUE = "#2563EB";
const INK = "#0F172A";
const MUTED = "#5B6478";

// Fades the photo's edges into the hero background so its rectangle doesn't show.
const fade = "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)";
const edgeFade: CSSProperties = { maskImage: fade, maskComposite: "intersect", WebkitMaskImage: fade, WebkitMaskComposite: "source-in" };

/**
 * The home hero illustration. The photo is served as is (re-encoding it smears its fine detail), and the floating
 * cards and phone screen are redrawn as vector SVG on the photo's own 1003×851 grid, exactly over their baked-in
 * counterparts, so their text stays sharp at any size and screen density.
 */
export function HomeHeroArt() {
  return (
    <div className="relative w-full max-w-[620px] select-none">
      <Image
        src="/home-hero-art.webp"
        alt="A doctor next to the Consult Your Doctor app, with its AI assistant and lab reports"
        width={1003}
        height={851}
        priority
        unoptimized
        className="w-full h-auto"
        style={edgeFade}
      />
      <svg viewBox="0 0 1003 851" aria-hidden className="absolute inset-0 w-full h-full font-sans pointer-events-none">
        <FloatingCard x={75} y={136} w={203} h={162} icon={Bot} title="AI Assistant" lines={["How can I", "help you today?"]} wave />
        <FloatingCard x={662} y={155} w={217} h={121} icon={FileChartLine} title="Instant Reports" lines={["Track your health", "in real-time"]} />
        <FloatingCard x={82} y={519} w={212} h={118} icon={ShieldCheck} title="Secure & Private" lines={["Your data is 100%", "safe with us"]} />
        <BadgeCheck x={274} y={617} width={34} height={34} fill={BLUE} color="#fff" strokeWidth={2} />
        <PhoneScreen />
      </svg>
    </div>
  );
}

function FloatingCard({ x, y, w, h, icon: Icon, title, lines, wave = false }: { x: number; y: number; w: number; h: number; icon: LucideIcon; title: string; lines: string[]; wave?: boolean }) {
  const textX = x + 70;
  return (
    <g>
      {/* A touch larger than the card in the photo, so none of it peeks out. */}
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={18} fill="#fff" />
      <circle cx={x + 35} cy={y + 42} r={22} fill="#EAF1FE" />
      <Icon x={x + 24} y={y + 31} width={22} height={22} color={BLUE} strokeWidth={2} />
      <text x={textX} y={y + 38} fontSize={16} fontWeight={700} fill={INK}>{title}</text>
      {lines.map((line, i) => (
        <text key={line} x={textX} y={y + 70 + i * 23} fontSize={14} fill={MUTED}>{line}</text>
      ))}
      {wave &&
        [5, 10, 16, 8, 20, 12, 18, 7, 14, 9, 5].map((barHeight, i) => (
          <rect key={i} x={textX + i * 5.5} y={y + 131 - barHeight / 2} width={3} height={barHeight} rx={1.5} fill={BLUE} />
        ))}
    </g>
  );
}

function PhoneScreen() {
  return (
    <g>
      {/* Covers the screen's baked-in content, inside the bezel and clear of its rounded corners. */}
      <rect x={327} y={112} width={219} height={484} fill="#FEFEFE" />
      <image href="/logo-icon.png" x={393.5} y={134.5} width={89} height={89} />
      <text x={436.5} y={246} textAnchor="middle" fontSize={14.5} fontWeight={600} fill={INK}>Consult Your Doctor</text>
      <ScreenAction y={303} fill="#EFF4FD" icon={UserRound} title="AI Symptom Checker" detail="Get AI insights instantly" action="Check Symptoms" pill="#E1EBFB" actionColor={BLUE} />
      <ScreenAction y={448} fill="#F1F3F7" icon={Stethoscope} title="Talk to Doctor" detail="Consult with verified doctors" action="Start Consultation" pill="#E2E8F0" actionColor={INK} />
    </g>
  );
}

function ScreenAction({ y, fill, icon: Icon, title, detail, action, pill, actionColor }: { y: number; fill: string; icon: LucideIcon; title: string; detail: string; action: string; pill: string; actionColor: string }) {
  return (
    <g>
      <rect x={336} y={y} width={201} height={130} rx={16} fill={fill} />
      <Icon x={355} y={y + 24} width={18} height={18} color={BLUE} strokeWidth={2.2} />
      <text x={381} y={y + 38} fontSize={12.5} fontWeight={700} fill={INK}>{title}</text>
      <text x={352} y={y + 59} fontSize={11} fill={MUTED}>{detail}</text>
      <rect x={350} y={y + 74} width={174} height={35} rx={17.5} fill={pill} />
      <text x={364} y={y + 96} fontSize={12.5} fontWeight={500} fill={actionColor}>{action}</text>
      <circle cx={505} cy={y + 91.5} r={14} fill="#fff" />
      <ChevronRight x={497} y={y + 83.5} width={16} height={16} color={BLUE} strokeWidth={2.6} />
    </g>
  );
}
