import { NextRequest, NextResponse } from 'next/server';
import { validateClient, getAuthCode, deleteAuthCode, storeAccessToken } from '@/lib/oauth-storage';
import { OAUTH_CONFIG } from '@/lib/oauth-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    
    const grantType = body.get('grant_type');
    const code = body.get('code');
    const clientId = body.get('client_id');
    const clientSecret = body.get('client_secret');
    const redirectUri = body.get('redirect_uri');
    const codeVerifier = body.get('code_verifier');

    console.log('Token exchange request:');
    console.log('- grant_type:', grantType);
    console.log('- code:', code);
    console.log('- client_id:', clientId);
    console.log('- client_secret:', clientSecret ? '***' : 'not provided');
    console.log('- redirect_uri:', redirectUri);
    console.log('- code_verifier:', codeVerifier ? '***' : 'not provided');

    // Validate required parameters
    if (grantType !== 'authorization_code') {
      console.log('Invalid grant type:', grantType);
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Only authorization_code grant type is supported' },
        { status: 400 }
      );
    }

    if (!code || !clientId || !clientSecret) {
      console.log('Missing required parameters:', { code: !!code, clientId: !!clientId, clientSecret: !!clientSecret });
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate client
    const client = validateClient(clientId as string, clientSecret as string);
    if (!client) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client credentials' },
        { status: 400 }
      );
    }

    // Find the authorization code (in production, query database)
    console.log('Looking for authorization code:', code);
    const authCodeData = getAuthCode(code as string);
    console.log('Authorization code lookup result:', authCodeData ? 'found' : 'not found');
    
    if (!authCodeData) {
      console.log('Authorization code not found:', code);
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid authorization code' },
        { status: 400 }
      );
    }

    // Check if authorization code is expired
    if (Date.now() > authCodeData.expiresAt) {
      deleteAuthCode(code as string);
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Authorization code expired' },
        { status: 400 }
      );
    }

    // Validate redirect URI
    if (redirectUri && authCodeData.redirectUri !== redirectUri) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
        { status: 400 }
      );
    }

    // Validate PKCE if used
    if (authCodeData.codeChallenge && !codeVerifier) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'PKCE code_verifier required' },
        { status: 400 }
      );
    }

    // Validate PKCE if both challenge and verifier are provided
    if (authCodeData.codeChallenge && codeVerifier) {
      console.log('Validating PKCE...');
      // TODO: Implement proper PKCE validation
      // For now, we'll accept any code_verifier for simplicity
      console.log('PKCE validation skipped for development');
    }

    // Remove the used authorization code
    deleteAuthCode(code as string);

    // Generate access token
    const accessToken = `mcp_at_${Buffer.from(Math.random().toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // Store access token data (in production, use a database)
    const tokenData = {
      accessToken,
      clientId,
      userData: authCodeData.userData,
      scope: authCodeData.scope,
      expiresAt: Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
    };

    // Store the access token for later validation
    storeAccessToken(accessToken, tokenData);

    console.log(`Generated access token ${accessToken} for client ${clientId}`);

    // Return the access token response
    const response = NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY / 1000,
      scope: authCodeData.scope,
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');

    return response;

  } catch (error) {
    console.error('Token endpoint error:', error);
    
    const response = NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');

    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  
  // Add CORS headers for preflight requests
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');
  
  return response;
}


