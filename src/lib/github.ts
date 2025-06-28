import { Octokit } from 'octokit';

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
    const headers: { [key: string]: string } = {
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (bustCache) {
      headers['Cache-Control'] = 'no-cache';
      // headers['If-None-Match'] = ''; // Another option to try if no-cache isn't enough
    }
    const response = await octokit.request('GET /repos/{owner}/{repo}/branches', {
      owner,
      repo,
      headers,
    });
    return response.data.map(branch => ({ name: branch.name }));
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error; // Re-throw the error to be handled by the caller
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
 * @returns {Promise<any>} A promise that resolves with the response data from GitHub.
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
    const { data: sourceBranchData } = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
      owner,
      repo,
      branch: sourceBranchName,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const sourceSha = sourceBranchData.commit.sha;

    // 2. Create the new branch (ref)
    const response = await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: sourceSha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    return response.data;
  } catch (error: unknown) { // Use unknown for better type safety
    console.error('Error creating branch:', error);
    // Check if the error is because the branch already exists
    // GitHub API returns 422 if ref already exists
    if (error instanceof Object && 'status' in error && error.status === 422) {
      if ('response' in error && error.response && 
          typeof error.response === 'object' && error.response && 'data' in error.response && 
          typeof error.response.data === 'object' && error.response.data && 'message' in error.response.data &&
          error.response.data.message === 'Reference already exists') {
        throw new Error(`Branch '${newBranchName}' already exists.`);
      }
    }
    // Re-throw original error or a generic one if it's not an Error instance
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while creating the branch.');
  }
}
