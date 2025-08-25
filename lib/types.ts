export interface AuthInfo {
  token: string;
  scopes: string[];
  clientId: string;
  extra: Record<string, any>;
}

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
}

export interface GitHubTokenInfo {
  user: GitHubUser;
  scopes: string[];
  token: string;
}
