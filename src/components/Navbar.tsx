import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function Navbar() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged out successfully');
      router.push('/login');
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="text-xl font-bold text-gray-800">
          GitHub README Editor
        </Link>
        <div>
          {user ? (
            <div className="flex items-center">
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.user_name}
                className="w-10 h-10 rounded-full mr-4 border-2 border-gray-200"
              />
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800 font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
