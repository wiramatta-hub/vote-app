import { redirect } from 'next/navigation';
import { getVoterSession } from '@/lib/session';

export default async function Home() {
  const session = await getVoterSession();
  if (session) {
    redirect('/vote');
  }
  redirect('/login');
}
