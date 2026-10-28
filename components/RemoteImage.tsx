import Image from 'next/image'

// Photos people upload (doctors, hospitals, labs) are stored full size in Supabase, often 1–2 MB JPEGs over 1000px
// wide, and shown in boxes 60–400px across. Through next/image they're resized to the box and sent as WebP, and cached
// for a month (next.config.ts). Only hosts next.config.ts allows can go through it; anything else (a pasted link, a
// data: preview) gets a plain <img> instead of an error.
const OPTIMIZABLE = /^(?:\/(?!\/)[^?#]*\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/|https:\/\/lh3\.googleusercontent\.com\/)/i

type Sizing =
  /** Fills its positioned parent; `sizes` is how wide it shows, e.g. "(min-width: 1024px) 290px, 240px". */
  | { fill: true; sizes: string; width?: never; height?: never }
  /** A box of this many CSS pixels at its largest (the className can draw it smaller). */
  | { fill?: false; width: number; height: number; sizes?: string }

/**
 * When the browser fetches it: 'lazy' (the default) as it nears the screen; 'eager' straight away, for images near the
 * top of the page; 'first' straight away and ahead of other images, for the one most likely to be the largest thing on
 * screen when the page opens (a hero photo, the first result's photo).
 */
export type ImageLoad = 'lazy' | 'eager' | 'first'

type Props = Sizing & { src: string; alt: string; className?: string; load?: ImageLoad }

export function RemoteImage({ src, alt, className = '', load = 'lazy', ...sizing }: Props) {
  const loading = load === 'lazy' ? 'lazy' : 'eager'
  const fetchPriority = load === 'first' ? 'high' : undefined
  if (!OPTIMIZABLE.test(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        width={sizing.fill ? undefined : sizing.width}
        height={sizing.fill ? undefined : sizing.height}
        className={sizing.fill ? `absolute inset-0 w-full h-full ${className}` : className}
      />
    )
  }
  return sizing.fill ? (
    <Image src={src} alt={alt} fill sizes={sizing.sizes} loading={loading} fetchPriority={fetchPriority} className={className} />
  ) : (
    <Image src={src} alt={alt} width={sizing.width} height={sizing.height} sizes={sizing.sizes} loading={loading} fetchPriority={fetchPriority} className={className} />
  )
}
