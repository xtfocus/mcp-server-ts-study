import { NextRequest, NextResponse } from 'next/server';

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
  const baseUrl = request.nextUrl.origin;
  const metadata = {
    issuer: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: ['read:user', 'user:email'],
    resource: baseUrl,
    resource_type: 'mcp-server',
    resource_description: 'MCP Server with GitHub OAuth authentication',
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
