'use client';

import { useState, useEffect } from 'react';

interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
}

export default function HomePage() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      fetchUserInfo(token);
    }
  }, []);

  const fetchUserInfo = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const userData = await response.json();
      setUser(userData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch user info');
      localStorage.removeItem('github_token');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/callback/github`;
    const scope = 'read:user user:email';
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${Math.random().toString(36).substring(7)}`;
    
    window.location.href = githubAuthUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setUser(null);
    setError(null);
  };

  const copyToken = () => {
    const token = localStorage.getItem('github_token');
    if (token) {
      navigator.clipboard.writeText(token);
      alert('Token copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '400px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>MCP Server</h1>
        
        {error && (
          <div style={{ background: '#fee', border: '1px solid #fcc', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {!user ? (
          <div>
            <button
              onClick={handleGitHubLogin}
              style={{
                width: '100%',
                padding: '10px',
                background: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              Sign in with GitHub
            </button>
            <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Required scopes: read:user, user:email
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <img
                src={user.avatar_url}
                alt={user.login}
                style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '10px' }}
              />
              <div>
                <h3>{user.name || user.login}</h3>
                <p style={{ margin: '0', color: '#666' }}>@{user.login}</p>
              </div>
            </div>

            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>MCP Server Access</h4>
              <button
                onClick={copyToken}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                Copy GitHub Token
              </button>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <p><strong>MCP Endpoint:</strong> {window.location.origin}/mcp</p>
                <p><strong>OAuth Metadata:</strong> {window.location.origin}/.well-known/oauth-protected-resource/mcp</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
