import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const router = useRouter();
  const showNavbar = router.pathname !== '/login';

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      {showNavbar && <Navbar />}
      <Component {...pageProps} />
      <Toaster />
    </SessionContextProvider>
  );
}

export default MyApp;
