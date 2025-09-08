import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/oauth-storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Check if we have an authorization code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    );
  }

  try {
    // Get the GitHub access token from our storage using the authorization code
    const authCodeData = await fetch(`${request.nextUrl.origin}/api/debug/auth-codes?code=${code}`).then(r => r.json());
    
    if (!authCodeData.found) {
      throw new Error('Authorization code not found or expired');
    }
    
    // Get client credentials from the stored client data
    const clientId = authCodeData.data.clientId;
    const client = getClient(clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    const clientSecret = client.client_secret;
    
    // Exchange the authorization code for an MCP access token
    const tokenResponse = await fetch(`${request.nextUrl.origin}/api/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${request.nextUrl.origin}/api/auth/callback/github`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const mcpAccessToken = tokenData.access_token;
    
    if (!mcpAccessToken) {
      throw new Error('No MCP access token received');
    }

    // Create a response that sets the MCP token in localStorage via JavaScript
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Auth Success</title>
        </head>
        <body>
          <script>
            localStorage.setItem('mcp_token', '${mcpAccessToken}');
            window.location.href = '/';
          </script>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
            <div>Authentication successful! Redirecting...</div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
