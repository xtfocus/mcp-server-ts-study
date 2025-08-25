import { NextRequest, NextResponse } from 'next/server';
import { validateClient, storeAuthCode } from '@/lib/oauth-storage';
import { OAUTH_CONFIG } from '@/lib/oauth-config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Extract GitHub OAuth response
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error, errorDescription);
    return NextResponse.json(
      { error: 'access_denied', error_description: errorDescription || error },
      { status: 400 }
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  try {
    // Decode the OAuth request info from state
    const oauthRequestInfo = JSON.parse(Buffer.from(state, 'base64').toString());
    const { clientId, redirectUri, scope, codeChallenge, codeChallengeMethod } = oauthRequestInfo;

    console.log('OAuth callback - Decoded state:', oauthRequestInfo);
    console.log('OAuth callback - Client ID:', clientId);

    // Validate client again
    const client = validateClient(clientId);
    console.log('OAuth callback - Client validation result:', client ? 'valid' : 'invalid');
    
    if (!client) {
      console.error('OAuth callback - Client not found:', clientId);
      throw new Error('Invalid client');
    }

    console.log('Exchanging GitHub authorization code for access token...');
    console.log('GitHub Client ID:', process.env.GITHUB_CLIENT_ID);
    console.log('GitHub Client Secret:', process.env.GITHUB_CLIENT_SECRET ? '***' : 'NOT SET');
    console.log('Authorization Code:', code);
    console.log('Redirect URI:', `${request.nextUrl.origin}/api/oauth/callback`);

    // Prepare token exchange body
    const tokenBody: any = {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: `${request.nextUrl.origin}/api/oauth/callback`,
    };

    // Add PKCE code_verifier if the original request had a code_challenge
    if (oauthRequestInfo.codeChallenge) {
      console.log('PKCE detected - adding code_verifier to token exchange');
      // For now, we'll skip PKCE validation since we're proxying
      // In a production implementation, you'd need to implement proper PKCE handling
      console.warn('PKCE code_verifier not available - this is a limitation of the proxy pattern');
    }

    // Exchange authorization code for access token with GitHub
    const tokenResponse = await fetch(OAUTH_CONFIG.GITHUB.TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenBody),
    });

    console.log('GitHub token response status:', tokenResponse.status);
    console.log('GitHub token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GitHub token exchange error response:', errorText);
      throw new Error(`GitHub token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from GitHub');
    }

    // Fetch user info from GitHub
    const userResponse = await fetch(OAUTH_CONFIG.GITHUB.USERINFO_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'mcp-for-next.js'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    // Generate our own authorization code for the MCP client
    const authorizationCode = `mcp_${Buffer.from(Math.random().toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // Store the authorization code and associated data (in production, use a database)
    const authCodeData = {
      code: authorizationCode,
      clientId,
      accessToken,
      userData,
      scope,
      codeChallenge,
      codeChallengeMethod,
      redirectUri,
      expiresAt: Date.now() + OAUTH_CONFIG.AUTH_CODE_EXPIRY,
    };

    // Store the authorization code for later use by the token endpoint
    storeAuthCode(authorizationCode, authCodeData);

    console.log(`Generated authorization code ${authorizationCode} for client ${clientId}`);

    // Build redirect URL back to the MCP client
    const redirectUrl = new URL(redirectUri);
    
    // Add the authorization code
    redirectUrl.searchParams.set('code', authorizationCode);
    
    // Add state if provided
    if (oauthRequestInfo.state) {
      redirectUrl.searchParams.set('state', oauthRequestInfo.state);
    }

    console.log(`Redirecting client ${clientId} back to: ${redirectUrl.toString()}`);

    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Try to redirect back to client with error
    try {
      const oauthRequestInfo = JSON.parse(Buffer.from(state, 'base64').toString());
      const redirectUrl = new URL(oauthRequestInfo.redirectUri);
      redirectUrl.searchParams.set('error', 'server_error');
      redirectUrl.searchParams.set('error_description', error instanceof Error ? error.message : 'Unknown error');
      if (oauthRequestInfo.state) {
        redirectUrl.searchParams.set('state', oauthRequestInfo.state);
      }
      return NextResponse.redirect(redirectUrl.toString());
    } catch (redirectError) {
      return NextResponse.json(
        { error: 'server_error', error_description: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}
