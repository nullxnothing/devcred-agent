import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/wallet-auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect to profile - prefer Twitter handle, fallback to wallet address
  if (user.twitter_handle && user.twitter_handle.trim() !== '') {
    redirect(`/profile/${user.twitter_handle}`);
  } else if (user.primary_wallet) {
    redirect(`/profile/${user.primary_wallet}`);
  }

  // Fallback: no valid identifier, send to login
  redirect('/login');
}
