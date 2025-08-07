import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getOctokit } from '../../../../../lib/github';
import RichTextEditor from '../../../../../components/RichTextEditor';

export default function ReadmeEditor() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { owner, repo } = router.query;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sha, setSha] = useState('');

  useEffect(() => {
    const fetchReadme = async () => {
      if (user && owner && repo) {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        if (session?.provider_token) {
          const octokit = getOctokit(session.provider_token);
          try {
            const { data } = await octokit.request(
              'GET /repos/{owner}/{repo}/readme',
              {
                owner: owner as string,
                repo: repo as string,
              }
            );
            const readmeContent = Buffer.from(data.content, 'base64').toString();
            setContent(readmeContent);
            setSha(data.sha);
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setLoading(false);
          }
        }
      }
    };
    fetchReadme();
  }, [user, owner, repo, supabaseClient]);

  const handleSave = async () => {
    if (user && owner && repo) {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (session?.provider_token) {
        const octokit = getOctokit(session.provider_token);
        try {
          await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner as string,
            repo: repo as string,
            path: 'README.md',
            message: 'Update README.md',
            content: Buffer.from(content).toString('base64'),
            sha,
          });
          toast.success('README.md updated successfully');
        } catch (error) {
          toast.error((error as Error).message);
        }
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Editing README for {owner}/{repo}
      </h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <RichTextEditor content={content} onChange={setContent} />
          <button
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
