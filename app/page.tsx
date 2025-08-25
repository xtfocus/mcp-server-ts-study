'use client';

import { useState, useEffect } from 'react';
import { OAUTH_CONFIG } from '@/lib/oauth-config';

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

  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      
      // Step 1: Register a client for this session
      const registerResponse = await fetch('/api/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Web Login Client',
          redirect_uris: [`${window.location.origin}/api/auth/callback/github`]
        })
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register client');
      }

      const clientData = await registerResponse.json();
      
      // Step 2: Start OAuth flow with our proxy
      const redirectUri = `${window.location.origin}/api/auth/callback/github`;
      const scope = OAUTH_CONFIG.SCOPE;
      const state = Math.random().toString(36).substring(7);
      
      // Store client info for callback
      sessionStorage.setItem('oauth_client_id', clientData.client_id);
      sessionStorage.setItem('oauth_client_secret', clientData.client_secret);
      sessionStorage.setItem('oauth_state', state);
      
      const authUrl = `/oauth/authorize?client_id=${clientData.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
      
      window.location.href = authUrl;
    } catch (error) {
      setError('Failed to start OAuth flow');
      setLoading(false);
    }
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
