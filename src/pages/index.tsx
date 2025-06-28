import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/repos');
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  return null;
}
