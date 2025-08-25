import { NextRequest, NextResponse } from 'next/server';
import { getSupportedScopes, OAUTH_CONFIG } from '@/lib/oauth-config';

/**
 * OAuth Protected Resource Metadata endpoint
 * 
 * This endpoint provides OAuth configuration details that allow MCP clients to discover:
 * - How to authorize with this server
 * - Which authorization servers can issue valid tokens
 * - What scopes are supported
 * 
 * This is required by the MCP specification for OAuth-enabled servers.
 */

export async function GET(request: NextRequest) {
  const metadata = {
    issuer: request.nextUrl.origin,
    authorization_servers: [`${request.nextUrl.origin}/.well-known/oauth-authorization-server`],
    scopes_supported: getSupportedScopes(),
    resource: request.nextUrl.origin,
    resource_type: OAUTH_CONFIG.METADATA.RESOURCE_TYPE,
    resource_description: OAUTH_CONFIG.METADATA.RESOURCE_DESCRIPTION,
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
