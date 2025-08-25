import { NextRequest, NextResponse } from 'next/server';

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
    
    // Use the GitHub access token directly for web login
    const accessToken = authCodeData.data.accessToken;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Create a response that sets the token in localStorage via JavaScript
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Auth Success</title>
        </head>
        <body>
          <script>
            localStorage.setItem('github_token', '${accessToken}');
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
