import Link from "next/link";

/**
 * "Partner with us" in the desktop headers: a plain link to the top of the partner page (no dropdown). The partner
 * logins are under that page's Login button, so the home page's Login stays a straight patient sign-in.
 */
export function PartnerLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/corporate" className={className}>
      Partner with us
    </Link>
  );
}
