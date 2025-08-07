import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { getOctokit, listBranches, getRepoDetails, createBranch, sleep, getTree, getFileContent, updateFile } from "@/lib/github";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { FileTree, Tree as FileTreeData } from "@/components/FileTree";
import RichTextEditor from "@/components/RichTextEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Branch {
    name: string;
}

interface GitHubFile {
    path?: string;
    mode?: string;
    type?: "blob" | "tree" | "commit";
    sha?: string;
    size?: number;
    url?: string;
}

export default function RepositoryPage() {
    const router = useRouter();
    const supabase = useSupabaseClient();
    const user = useUser();

    // router.query is empty until router.isReady === true
    const { owner, repo } = router.query as {
        owner: string | undefined;
        repo: string | undefined;
    };

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>();
    const [isLoadingBranches, setIsLoadingBranches] = useState(true);
    const [isCreatingBranch, setIsCreatingBranch] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tree, setTree] = useState<FileTreeData[]>([]);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState<string>("");
    const [fileSha, setFileSha] = useState<string>("");
    const [commitMessage, setCommitMessage] = useState<string>("");
    const [isCommitting, setIsCommitting] = useState(false);

    /** Fetch branch list and set default / target branch */
    const fetchBranchesList = async (octokit: Octokit, targetBranchName?: string, bustCache = false) => {
        setIsLoadingBranches(true); // FIX: always show spinner at call-time
        setError(null);

        try {
            const fetchedBranches = await listBranches(octokit, owner!, repo!, bustCache);

            setBranches(fetchedBranches);

            // Decide which branch should be selected
            const branchToSelect =
                (targetBranchName && fetchedBranches.some((b) => b.name === targetBranchName) && targetBranchName) || // explicit target
                (selectedBranch && fetchedBranches.some((b) => b.name === selectedBranch) && selectedBranch) || // keep current if still present
                fetchedBranches.find((b) => b.name === "main" || b.name === "master")?.name || // else main/master
                fetchedBranches[0]?.name; // else first

            setSelectedBranch(branchToSelect);
        } catch (err: unknown) {
            console.error("Error fetching branches:", err);
            toast.error(`Failed to fetch branches: ${err instanceof Error ? err.message : "Unknown error"}`);
            setError(`Failed to fetch branches: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setIsLoadingBranches(false);
        }
    };

    /** Initial load – waits until both the router and the user are ready */
    useEffect(() => {
        if (!router.isReady || !user || !owner || !repo) return;

        let cancelled = false;

        (async () => {
            try {
                setIsLoadingBranches(true); // FIX: show spinner on first render
                const {
                    data: { session },
                    error: sessionError
                } = await supabase.auth.getSession();

                if (sessionError || !session) throw new Error("Not authenticated");
                const token = session.provider_token;
                if (!token) throw new Error("GitHub token not found");

                const octokit = getOctokit(token);
                if (!cancelled) await fetchBranchesList(octokit);
            } catch (err: unknown) {
                console.error(err);
                toast.error(err instanceof Error ? err.message : "An unknown error occurred during setup");
                if (!cancelled) setError("Failed to set up GitHub connection");
            }
        })();

        return () => {
            cancelled = true; // avoid setState on unmounted component
        };
    }, [router.isReady, user, owner, repo, supabase]);

    /** Fetch file tree for the selected branch */
    useEffect(() => {
        if (!selectedBranch || !user || !owner || !repo) return;

        let cancelled = false;

        const buildTree = (files: GitHubFile[]): FileTreeData[] => {
            const root: FileTreeData[] = [];
            const map: { [key: string]: FileTreeData } = {};

            for (const file of files) {
                if (!file.path) continue;

                const parts = file.path.split("/");
                let currentLevel = root;

                for (let i = 0; i < parts.length; i++) {
                    const fullPath = parts.slice(0, i + 1).join("/");

                    let node = map[fullPath];

                    if (!node) {
                        node = {
                            path: fullPath,
                            type: i === parts.length - 1 ? "blob" : "tree",
                            children: []
                        };
                        map[fullPath] = node;

                        if (i === 0) {
                            currentLevel.push(node);
                        } else {
                            const parentPath = parts.slice(0, i).join("/");
                            const parentNode = map[parentPath];
                            if (parentNode && parentNode.type === "tree") {
                                parentNode.children = parentNode.children || [];
                                parentNode.children.push(node);
                            }
                        }
                    }

                    if (node.type === "tree") {
                        currentLevel = node.children = node.children || [];
                    }
                }
            }
            return root;
        };

        (async () => {
            try {
                setIsLoadingTree(true);
                const {
                    data: { session }
                } = await supabase.auth.getSession();
                if (!session?.provider_token) throw new Error("GitHub token not found");

                const octokit = getOctokit(session.provider_token);
                const files: GitHubFile[] = await getTree(octokit, owner, repo, selectedBranch);
                const markdownFiles = files.filter((file) => file.path?.endsWith(".md"));
                const treeData = buildTree(markdownFiles);

                if (!cancelled) {
                    setTree(treeData);
                }
            } catch (err: unknown) {
                console.error("Error fetching file tree:", err);
                toast.error("Failed to fetch file tree.");
            } finally {
                if (!cancelled) {
                    setIsLoadingTree(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedBranch, user, owner, repo, supabase]);

    /** Branch selector */
    const handleBranchChange = (value: string) => {
        setSelectedBranch(value);
        toast(`Switched to branch: ${value}`);
    };

    const handleSelectFile = async (path: string) => {
        if (isEditing) {
            toast.error("Please save or discard your changes before selecting a new file.");
            return;
        }
        setSelectedFile(path);
        setIsLoadingFileContent(true);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            if (!session?.provider_token) throw new Error("GitHub token not found");

            const octokit = getOctokit(session.provider_token);
            const { content, sha } = await getFileContent(octokit, owner!, repo!, path);
            setFileContent(content);
            setEditedContent(content);
            setFileSha(sha);
        } catch (err: unknown) {
            console.error("Error fetching file content:", err);
            toast.error("Failed to fetch file content.");
        } finally {
            setIsLoadingFileContent(false);
        }
    };

    const handleCommit = async () => {
        if (!selectedFile || !selectedBranch) return;

        setIsCommitting(true);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            if (!session?.provider_token) throw new Error("GitHub token not found");

            const octokit = getOctokit(session.provider_token);
            const message = commitMessage || `Update ${selectedFile}`;

            await updateFile(octokit, owner!, repo!, selectedFile, editedContent, fileSha, selectedBranch, message);

            toast.success("File committed successfully!");
            setIsEditing(false);
            setFileContent(editedContent);
            setCommitMessage("");
        } catch (err: unknown) {
            console.error("Error committing file:", err);
            toast.error("Failed to commit file.");
        } finally {
            setIsCommitting(false);
        }
    };

    /** Create (or switch to) a `docs` branch */
    const handleCreateDocsBranch = async () => {
        if (!user || !owner || !repo) return;

        setIsCreatingBranch(true);
        setError(null);

        try {
            const {
                data: { session },
                error: sessionError
            } = await supabase.auth.getSession();

            if (sessionError || !session) throw new Error("Not authenticated");
            const token = session.provider_token;
            if (!token) throw new Error("GitHub token not found");

            const octokit = getOctokit(token);

            // Find default branch
            const repoDetails = await getRepoDetails(octokit, owner, repo);
            const defaultBranch = repoDetails.default_branch;
            const newBranchName = "docs";

            try {
                await createBranch(octokit, owner, repo, newBranchName, defaultBranch);
                toast.success(`Branch '${newBranchName}' created. Verifying...`);

                // Poll for the new branch to appear
                const pollStartTime = Date.now();
                const pollTimeout = 30000; // 30 seconds
                let branchExists = false;

                while (Date.now() - pollStartTime < pollTimeout) {
                    try {
                        const freshBranches = await listBranches(octokit, owner, repo, true); // bust cache
                        if (freshBranches.some((b) => b.name === newBranchName)) {
                            branchExists = true;
                            break;
                        }
                    } catch (pollErr) {
                        // Ignore errors during polling, as the branch might not be ready
                        console.warn("Polling for branch failed, retrying...", pollErr);
                    }
                    await sleep(2000); // wait 2 seconds before next poll
                }

                if (!branchExists) {
                    // Final attempt with cache busting before giving up
                    await sleep(2000); // one last small delay
                    const finalBranches = await listBranches(octokit, owner, repo, true);
                    if (!finalBranches.some((b) => b.name === newBranchName)) {
                        throw new Error(`Branch '${newBranchName}' not found after ${pollTimeout / 1000} seconds.`);
                    }
                }
            } catch (err: unknown) {
                // Handle "already exists" error gracefully
                if (err instanceof Error && err.name === "AlreadyExistsError") {
                    toast("Branch already exists – switching to it.");
                } else {
                    // For other errors, re-throw to be caught by the outer catch block
                    throw err;
                }
            }

            // Refresh branch list and auto-select the new branch (bust cache)
            await fetchBranchesList(octokit, newBranchName, true);
        } catch (err: unknown) {
            console.error(err);
            toast.error(`Failed to create/select docs branch: ${err instanceof Error ? err.message : "Unknown error"}`);
            setError(err instanceof Error ? err.message : "Failed to create/select branch");
        } finally {
            setIsCreatingBranch(false);
        }
    };

    /* ---------- UI ---------- */
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">
                        <Link href="/repos" className="hover:underline">
                            {owner}
                        </Link>{" "}
                        / {repo}
                    </h1>
                    <Button variant="outline" className="border-gray-700 bg-gray-800 hover:bg-gray-700" onClick={() => router.back()}>
                        Back
                    </Button>
                </div>

                <div className="mb-6 flex items-center gap-4">
                    {isLoadingBranches ? (
                        <p>Loading branches…</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : branches.length ? (
                        <Select onValueChange={handleBranchChange} value={selectedBranch}>
                            <SelectTrigger className="w-[280px] border-gray-700 bg-gray-800">
                                <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-700 bg-gray-800 text-white">
                                {branches.map((b) => (
                                    <SelectItem key={b.name} value={b.name} className="hover:bg-gray-700">
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p>No branches found.</p>
                    )}

                    <Button
                        variant="outline"
                        className="border-gray-700 bg-gray-800 hover:bg-gray-700"
                        onClick={handleCreateDocsBranch}
                        disabled={isLoadingBranches || isCreatingBranch}
                    >
                        {isCreatingBranch ? "Creating…" : "Create Docs Branch"}
                    </Button>
                </div>

                {/* Placeholder layout */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
                    <section className="rounded-lg bg-gray-800 p-4 shadow md:col-span-1 h-fit">
                        <h2 className="mb-3 text-xl font-semibold">Files</h2>
                        {isLoadingTree ? (
                            <p>Loading file tree...</p>
                        ) : tree.length > 0 ? (
                            <FileTree tree={tree} onSelectFile={handleSelectFile} />
                        ) : (
                            <p className="text-gray-400">No markdown files found in this branch.</p>
                        )}
                    </section>

                    <section className="rounded-lg bg-gray-800 p-4 shadow md:col-span-2">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xl font-semibold">Content</h2>
                            {selectedFile && (
                                <Button
                                    variant="outline"
                                    className="border-gray-700 bg-gray-800 hover:bg-gray-700"
                                    onClick={() => setIsEditing(!isEditing)}
                                    disabled={isLoadingFileContent}
                                >
                                    {isEditing ? "Cancel" : "Edit"}
                                </Button>
                            )}
                        </div>
                        {isLoadingFileContent ? (
                            <p>Loading file content...</p>
                        ) : selectedFile ? (
                            isEditing ? (
                                <>
                                    <RichTextEditor content={editedContent} onChange={setEditedContent} />
                                    <div className="mt-4 flex justify-end gap-4">
                                        <input
                                            type="text"
                                            className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700"
                                            placeholder="Commit message"
                                            value={commitMessage}
                                            onChange={(e) => setCommitMessage(e.target.value)}
                                        />
                                        <Button
                                            variant="outline"
                                            className="border-gray-700 bg-gray-800 hover:bg-gray-700"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setEditedContent(fileContent);
                                            }}
                                        >
                                            Discard
                                        </Button>
                                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCommit} disabled={isCommitting}>
                                            {isCommitting ? "Committing..." : "Save & Commit"}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="prose prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                        {fileContent}
                                    </ReactMarkdown>
                                </div>
                            )
                        ) : (
                            <p className="text-gray-400">Select a file to view its content.</p>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
