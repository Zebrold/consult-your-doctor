import { getCurrentUser } from '@/lib/supabase/server';
import { ClientHeader } from './ClientHeader';

export async function Header() {
  // Shares the root layout's check of the session, so the header costs no extra request.
  const user = await getCurrentUser();

  return <ClientHeader user={user} />;
}
