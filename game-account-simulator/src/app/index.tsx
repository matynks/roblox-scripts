import { Redirect } from 'expo-router';

import { useSession } from '@/state/session';

export default function Index() {
  const { session, recovering } = useSession();
  return <Redirect href={session && !recovering ? '/home' : '/welcome'} />;
}
