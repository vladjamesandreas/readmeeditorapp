import { Octokit } from 'octokit'; // Import Octokit type
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { getOctokit, listBranches, getRepoDetails, createBranch } from '@/lib/github';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

interface Branch {
  name: string;
}

export default function RepositoryPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const { owner, repo } = router.query as { owner: string; repo: string };

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false); // New state for create branch loading
  const [error, setError] = useState<string | null>(null);

  // Updated signature to match listBranches
  const fetchBranchesList = async (octokitInstance: Octokit, targetBranchNameToSelect?: string, bustCacheParam?: boolean) => { 
    setIsLoadingBranches(true);
    setError(null);
    try {
      // Pass bustCacheParam to listBranches, defaulting to false if not provided
      const fetchedBranches = await listBranches(octokitInstance, owner, repo, bustCacheParam || false);
      setBranches(fetchedBranches);
      
      if (targetBranchNameToSelect && fetchedBranches.some(b => b.name === targetBranchNameToSelect)) {
        setSelectedBranch(targetBranchNameToSelect);
      } else if (fetchedBranches.length > 0 && !selectedBranch) { 
        const defaultBranchName = fetchedBranches.find(b => b.name === 'main' || b.name === 'master')?.name || fetchedBranches[0]?.name;
        setSelectedBranch(defaultBranchName);
      } else if (fetchedBranches.length === 0) {
        setSelectedBranch(undefined);
      }
      // If a target was specified but not found, it won't be selected.
      // If selectedBranch was already set and no target, it remains.
    } catch (err: unknown) {
      console.error('Error fetching branches:', err);
      let errorMessage = 'An unknown error occurred while fetching branches';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error(`Failed to fetch branches: ${errorMessage}`);
      setError(`Failed to fetch branches: ${errorMessage}`);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (!user || !owner || !repo) return;

    const initialLoad = async () => { // Renamed from fetchBranches to avoid confusion
      // setIsLoadingBranches(true); // Already set in fetchBranchesList
      // setError(null); // Already set in fetchBranchesList
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || 'Not authenticated');
        }
        const token = sessionData.session.provider_token;
        if (!token) {
          throw new Error('GitHub token not found.');
        }

        const octokit = getOctokit(token);
        await fetchBranchesList(octokit); // Use the refactored function
      } catch (err: unknown) {
        console.error('Error getting session or token:', err);
        let errorMessage = 'An unknown error occurred during setup';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        toast.error(errorMessage);
        setError(errorMessage);
        setIsLoadingBranches(false); 
      }
    };

    initialLoad(); // Corrected function call
  }, [user, owner, repo, supabase.auth]);

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    // TODO: Fetch file tree for the selected branch
    toast(`Switched to branch: ${value}`);
  };

  const handleCreateDocsBranch = async () => {
    if (!user || !owner || !repo) return;
    setIsCreatingBranch(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(sessionError?.message || 'Not authenticated');
      }
      const token = sessionData.session.provider_token;
      if (!token) {
        throw new Error('GitHub token not found.');
      }
      const octokit = getOctokit(token);

      // Get default branch
      const repoDetails = await getRepoDetails(octokit, owner, repo);
      const defaultBranchName = repoDetails.default_branch;
      
      const newDocsBranchName = `docs`; // Changed to simply "docs"

      await createBranch(octokit, owner, repo, newDocsBranchName, defaultBranchName);
      toast.success(`Branch '${newDocsBranchName}' created successfully!`);
      
      // Refresh branch list and select the new branch, attempting to bust cache
      await fetchBranchesList(octokit, newDocsBranchName, true); // Pass true for bustCache

    } catch (err: unknown) {
      console.error('Error creating docs branch:', err);
      let errorMessage = 'An unknown error occurred while creating branch';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error(`Failed to create branch: ${errorMessage}`);
      setError(`Failed to create branch: ${errorMessage}`);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar /> {/* Added Navbar back */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {owner} / {repo}
          </h1>
        </div>

        <div className="mb-6 flex items-center space-x-4">
          {isLoadingBranches ? (
            <p>Loading branches...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : branches.length > 0 ? (
            <Select onValueChange={handleBranchChange} value={selectedBranch}>
              <SelectTrigger className="w-[280px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                {branches.map((branch) => (
                  <SelectItem key={branch.name} value={branch.name} className="hover:bg-gray-700">
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p>No branches found for this repository.</p>
          )}
          <Button 
            variant="outline" 
            className="bg-gray-800 border-gray-700 hover:bg-gray-700"
            onClick={handleCreateDocsBranch}
            disabled={isLoadingBranches || isCreatingBranch}
          >
            {isCreatingBranch ? 'Creating...' : 'Create Docs Branch'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Files</h2>
            <p className="text-gray-400">File tree will be displayed here.</p>
            {/* TODO: Implement file tree component */}
          </div>
          <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Content</h2>
            <p className="text-gray-400">Selected file content or editor will be here.</p>
            {/* TODO: Implement file viewer/editor component */}
          </div>
        </div>
      </main>
    </div>
  );
}
