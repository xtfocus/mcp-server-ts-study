import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all route for recursive OAuth authorization server discovery
 * 
 * This handles cases where the client incorrectly appends paths to the authorization server URL
 * and returns the same metadata as the main authorization server endpoint.
 */

export async function GET(request: NextRequest) {
  const metadata = {
    issuer: request.nextUrl.origin,
    authorization_endpoint: `${request.nextUrl.origin}/oauth/authorize`,
    token_endpoint: `${request.nextUrl.origin}/api/oauth/token`,
    userinfo_endpoint: `${request.nextUrl.origin}/api/oauth/userinfo`,
    registration_endpoint: `${request.nextUrl.origin}/api/oauth/register`,
    scopes_supported: ['read:user'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
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
