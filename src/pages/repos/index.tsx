import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getOctokit } from "@/lib/github";

interface Repo {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
}

export default function Repos() {
    const supabase = useSupabaseClient();
    const user = useUser();

    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const perPage = 10;

    // ref to drop stale responses (race-condition fix)
    const latestPageRef = useRef(page);

    useEffect(() => {
        latestPageRef.current = page;
        if (!user) return;

        const fetchRepos = async () => {
            setLoading(true); // FIX: reset spinner on page change

            try {
                const {
                    data: { session }
                } = await supabase.auth.getSession();

                const token = session?.provider_token;
                if (!token) throw new Error("GitHub token not found");

                const octokit = getOctokit(token);
                const { data } = await octokit.request("GET /user/repos", {
                    per_page: perPage,
                    page
                });

                // Ignore if another request finished after this one
                if (latestPageRef.current !== page) return;

                const reposArray = data as Repo[];

                // FIX: append if you want infinite list -- or replace for classic paging
                setRepos(reposArray);

                if (reposArray.length === 0) {
                    toast("No more repositories.");
                }
            } catch (error) {
                console.error(error);
                toast.error(`Failed to fetch repositories: ${(error as Error).message ?? "Unknown error"}`);
            } finally {
                if (latestPageRef.current === page) setLoading(false);
            }
        };

        fetchRepos();
    }, [user, supabase, page]);

    const filteredRepos = repos.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const nextDisabled = repos.length < perPage; // FIX: stop at last page

    return (
        <div className="bg-gray-900 min-h-screen text-white">
            <div className="container mx-auto p-4">
                <h1 className="mb-4 text-2xl font-bold">Your Repositories</h1>

                <input
                    type="text"
                    placeholder="Search repos…"
                    className="mb-4 w-full rounded border border-gray-700 bg-gray-800 p-2 text-white placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {loading ? (
                    <p>Loading…</p>
                ) : (
                    <ul>
                        {filteredRepos.map((repo) => (
                            <li key={repo.id} className="mb-2 rounded border border-gray-700 bg-gray-800 p-4">
                                <Link
                                    href={`/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`} // FIX: encode
                                    className="text-blue-400 hover:underline"
                                >
                                    {repo.full_name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-4 flex justify-between">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="rounded bg-gray-700 py-2 px-4 font-bold text-white hover:bg-gray-600 disabled:opacity-50"
                    >
                        Previous
                    </button>

                    <button
                        onClick={() => !nextDisabled && setPage((p) => p + 1)}
                        disabled={nextDisabled || loading}
                        className="rounded py-2 px-4 font-bold text-white disabled:opacity-50"
                        style={{ backgroundColor: '#d76d77' }}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
