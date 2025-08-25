import { NextRequest, NextResponse } from 'next/server';

/**
 * OpenID Connect Configuration endpoint
 * 
 * This endpoint provides OpenID Connect discovery metadata.
 * Even though we're using OAuth 2.1, some clients expect this endpoint.
 */

export async function GET(request: NextRequest) {
  const metadata = {
    issuer: 'https://github.com',
    authorization_endpoint: 'https://github.com/login/oauth/authorize',
    token_endpoint: 'https://github.com/login/oauth/access_token',
    userinfo_endpoint: 'https://api.github.com/user',
    scopes_supported: ['read:user', 'user:email', 'public_repo', 'repo', 'admin:org', 'admin:user'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    claims_supported: ['sub', 'name', 'preferred_username', 'email', 'picture'],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
    },
  });
}
