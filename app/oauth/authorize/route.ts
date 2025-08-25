import { NextRequest, NextResponse } from 'next/server';
import { validateClient } from '@/lib/oauth-storage';
import { OAUTH_CONFIG } from '@/lib/oauth-config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Extract OAuth parameters
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const resource = searchParams.get('resource');

  // Validate required parameters
  if (!clientId || !redirectUri || responseType !== 'code') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters' },
      { status: 400 }
    );
  }

  // Validate client
  const client = validateClient(clientId);
  if (!client) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Invalid client' },
      { status: 400 }
    );
  }

  // Validate redirect URI
  if (!client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Invalid redirect URI' },
      { status: 400 }
    );
  }

  // Store OAuth request info in session/cookie for later use
  const oauthRequestInfo = {
    clientId,
    redirectUri,
    responseType,
    state,
    scope,
    codeChallenge,
    codeChallengeMethod,
    resource,
    timestamp: Date.now()
  };

  // Encode the OAuth request info in the state parameter for GitHub
  const encodedState = Buffer.from(JSON.stringify(oauthRequestInfo)).toString('base64');

  // Build GitHub OAuth URL using our GitHub OAuth App credentials
  const githubAuthUrl = new URL(OAUTH_CONFIG.GITHUB.AUTHORIZATION_ENDPOINT);
  githubAuthUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!);
  githubAuthUrl.searchParams.set('redirect_uri', `${request.nextUrl.origin}/api/oauth/callback`);
  
  // Always use minimal scope (matching remote-mcp-server-with-auth)
  // Ignore whatever scope the client requested for security
  githubAuthUrl.searchParams.set('scope', OAUTH_CONFIG.SCOPE);
  githubAuthUrl.searchParams.set('state', encodedState);
  githubAuthUrl.searchParams.set('response_type', 'code');

  // Note: We don't forward PKCE to GitHub because we can't access the client's code_verifier
  // The MCP client's PKCE will be validated when they exchange our authorization code
  console.log('PKCE from client will be validated during token exchange with our server');

  console.log(`Redirecting client ${clientId} to GitHub OAuth: ${githubAuthUrl.toString()}`);

  // Redirect to GitHub OAuth
  return NextResponse.redirect(githubAuthUrl.toString());
}
