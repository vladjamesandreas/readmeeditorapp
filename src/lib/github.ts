import { Octokit } from "octokit";

/**
 * A simple sleep utility.
 * @param {number} ms The number of milliseconds to sleep.
 * @returns {Promise<void>}
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get an Octokit client.
 *
 * @param {string} token The GitHub access token.
 * @returns {Octokit} An Octokit client.
 */
export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

/**
 * Lists branches for a repository.
 *
 * @param {Octokit} octokit The Octokit client.
 * @param {string} owner The repository owner.
 * @param {string} repo The repository name.
 * @param {boolean} [bustCache=false] Whether to try and bypass the cache for this request.
 * @returns {Promise<Array<{ name: string }>>} A promise that resolves to an array of branches.
 */
export async function listBranches(octokit: Octokit, owner: string, repo: string, bustCache: boolean = false) {
  try {
    const headers: { [key:string]: string } = {
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const params: { owner: string; repo: string; [key: string]: any } = {
        owner,
        repo,
    };
    if (bustCache) {
        params.t = new Date().getTime();
    }
    const response = await octokit.request('GET /repos/{owner}/{repo}/branches', {
      ...params,
      headers,
    });
    return response.data.map(branch => ({ name: branch.name }));
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error; // Re-throw the error to be handled by the caller
    }
}

/**
 * Updates a file in a repository.
 *
 * @param {Octokit} octokit The Octokit client.
 * @param {string} owner The repository owner.
 * @param {string} repo The repository name.
 * @param {string} path The path to the file.
 * @param {string} content The new content of the file.
 * @param {string} sha The blob SHA of the file being replaced.
 * @param {string} branch The branch name.
 * @param {string} commitMessage The commit message.
 * @returns {Promise<object>} A promise that resolves with the response data from GitHub.
 */
export async function updateFile(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha: string,
    branch: string,
    commitMessage: string
) {
    try {
        const response = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
            owner,
            repo,
            path,
            message: commitMessage,
            content: Buffer.from(content).toString("base64"),
            sha,
            branch
        });
        return response.data;
    } catch (error) {
        console.error("Error updating file:", error);
        throw error;
    }
}

/**
 * Fetches the content of a file.
 *
 * @param {Octokit} octokit The Octokit client.
 * @param {string} owner The repository owner.
 * @param {string} repo The repository name.
 * @param {string} path The path to the file.
 * @returns {Promise<{content: string; sha: string}>} A promise that resolves to the file content and sha.
 */
export async function getFileContent(octokit: Octokit, owner: string, repo: string, path: string): Promise<{content: string; sha: string}> {
    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
            owner,
            repo,
            path
        });

        if (Array.isArray(data) || !("content" in data) || !("sha" in data)) {
            throw new Error("Invalid file content response");
        }

        // Decode the base64 content
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return { content, sha: data.sha };
    } catch (error) {
        console.error("Error fetching file content:", error);
        throw error;
    }
}

/**
 * Fetches the file tree for a given branch.
 *
 * @param {Octokit} octokit The Octokit client.
 * @param {string} owner The repository owner.
 * @param {string} repo The repository name.
 * @param {string} branch The branch name.
 * @returns {Promise<{path?: string; mode?: string; type?: "blob" | "tree" | "commit"; sha?: string; size?: number; url?: string;}[]>} A promise that resolves to the file tree.
 */
export async function getTree(octokit: Octokit, owner: string, repo: string, branch: string): Promise<{path?: string; mode?: string; type?: "blob" | "tree" | "commit"; sha?: string; size?: number; url?: string;}[]> {
    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
            owner,
            repo,
            tree_sha: branch,
            recursive: "1"
        });
        return data.tree as {path?: string; mode?: string; type?: "blob" | "tree" | "commit"; sha?: string; size?: number; url?: string;}[];
    } catch (error) {
        console.error("Error fetching tree:", error);
        throw error;
    }
}

/**
 * Gets repository details, including the default branch.
 *
 * @param {Octokit} octokit The Octokit client.
 * @param {string} owner The repository owner.
 * @param {string} repo The repository name.
 * @returns {Promise<{ default_branch: string }>} A promise that resolves to an object containing the default branch name.
 */
export async function getRepoDetails(octokit: Octokit, owner: string, repo: string) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    return { default_branch: response.data.default_branch };
  } catch (error) {
    console.error('Error fetching repository details:', error);
    throw error;
  }
}

/**
 * Creates a new branch in a repository.
 *
 * @param {Octokit} octokit The Octokit client.
 * @param {string} owner The repository owner.
 * @param {string} repo The repository name.
 * @param {string} newBranchName The name for the new branch (e.g., "docs/main").
 * @param {string} sourceBranchName The name of the branch to base the new branch on (e.g., "main").
 * @returns {Promise<object>} A promise that resolves with the response data from GitHub.
 */
export async function createBranch(
    octokit: Octokit,
    owner: string,
    repo: string,
    newBranchName: string,
    sourceBranchName: string
) {
    try {
        // 1. Get the SHA of the source branch's head
        const { data: sourceBranchData } = await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
            owner,
            repo,
            branch: sourceBranchName,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        const sourceSha = sourceBranchData.commit.sha;

        // 2. Create the new branch (ref)
        const response = await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
            owner,
            repo,
            ref: `refs/heads/${newBranchName}`,
            sha: sourceSha,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        return response.data;
    } catch (error: unknown) {
        // Use unknown for better type safety
        console.error("Error creating branch:", error);

        // Check if the error is because the branch already exists (HTTP 422)
        if (
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            (error as { status?: number }).status === 422
        ) {
            // Re-throw a specific error that the UI can check for
            const alreadyExistsError = new Error(`Branch '${newBranchName}' already exists.`);
            alreadyExistsError.name = "AlreadyExistsError";
            throw alreadyExistsError;
        }

        // Re-throw original error or a generic one
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while creating the branch.");
    }
}
