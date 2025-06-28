import { useSupabaseClient } from '@supabase/auth-helpers-react';
import toast from 'react-hot-toast';
import Head from 'next/head';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// GitHub SVG Icon component
const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.06.069-.06 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.65.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z"
      clipRule="evenodd"
    />
  </svg>
);

export default function Login() {
  const supabaseClient = useSupabaseClient();

  const handleLogin = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/repos`,
        scopes: 'repo', // Requesting repo scope
      },
    });
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - GitHub README Editor</title>
      </Head>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/file.svg" // Assuming this is the project logo
                alt="GitHub README Editor Logo"
                width={64}
                height={64}
              />
            </div>
            <CardTitle className="text-2xl font-bold">
              GitHub README Editor
            </CardTitle>
            <CardDescription>
              Sign in with your GitHub account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} className="w-full">
              <GitHubIcon className="w-5 h-5 mr-2" />
              Sign in with GitHub
            </Button>
          </CardContent>
        </Card>
        <p className="mt-8 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} README Editor. All rights reserved.
        </p>
      </div>
    </>
  );
}
