import { AuthInfo, GitHubUser, GitHubTokenInfo } from './types';

/**
 * Validates a GitHub token by making an API call to GitHub's user endpoint
 * @param token - The GitHub token to validate
 * @returns Promise<AuthInfo> - Authentication information if valid
 */
export async function validateGitHubToken(token: string): Promise<AuthInfo> {
  try {
    // Make a request to GitHub's user API to validate the token
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'mcp-for-next.js'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const user: GitHubUser = await response.json();

    // Get scopes from the response headers
    const scopes = response.headers.get('x-oauth-scopes')?.split(',').map(s => s.trim()) || [];

    // Create AuthInfo object
    const authInfo: AuthInfo = {
      token,
      scopes,
      clientId: user.login, // Use GitHub username as client ID
      extra: {
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url
        },
        subject: user.login,
        audience: 'github.com'
      }
    };

    return authInfo;
  } catch (error) {
    console.error('GitHub token validation failed:', error);
    throw new Error('Invalid GitHub token');
  }
}

/**
 * Gets detailed information about a GitHub token including scopes
 * @param token - The GitHub token
 * @returns Promise<GitHubTokenInfo> - Detailed token information
 */
export async function getGitHubTokenInfo(token: string): Promise<GitHubTokenInfo> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'mcp-for-next.js'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const user: GitHubUser = await response.json();
    const scopes = response.headers.get('x-oauth-scopes')?.split(',').map(s => s.trim()) || [];

    return {
      user,
      scopes,
      token
    };
  } catch (error) {
    console.error('Failed to get GitHub token info:', error);
    throw error;
  }
}
