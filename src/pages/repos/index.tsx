import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getOctokit } from '../../lib/github';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export default function Repos() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchRepos = async () => {
      if (user) {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        if (session?.provider_token) {
          const octokit = getOctokit(session.provider_token);
          try {
            const { data } = await octokit.request('GET /user/repos', {
              per_page: 10,
              page,
            });
            if (Array.isArray(data) && data.length === 0) {
              console.log('Received empty array of repos.');
              toast('No repositories found or token lacks permissions.');
            }
            setRepos(data as Repo[]);
          } catch (error) {
            console.error('Error fetching repos:', error);
            toast.error(`Failed to fetch repositories: ${(error as Error).message}`);
          } finally {
            setLoading(false);
          }
        }
      }
    };
    fetchRepos();
  }, [user, supabaseClient, page]);

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Repositories</h1>
      <input
        type="text"
        placeholder="Search repos..."
        className="w-full p-2 mb-4 border rounded"
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {filteredRepos.map((repo) => (
            <li key={repo.id} className="p-4 mb-2 border rounded">
              <Link
                href={`/repos/${repo.owner.login}/${repo.name}`}
                className="text-blue-500 hover:underline"
              >
                {repo.full_name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(page + 1)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
