import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { storeClient } from '@/lib/oauth-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_name, redirect_uris, grant_types, response_types, scopes } = body;

    // Validate required fields
    if (!client_name || !redirect_uris) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing required fields: client_name, redirect_uris' },
        { status: 400 }
      );
    }

    // Generate client credentials
    const clientId = `mcp_${randomBytes(16).toString('hex')}`;
    const clientSecret = randomBytes(32).toString('hex');

    // Store client information
    const client = {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: client_name,
      redirect_uris: redirect_uris,
      grant_types: grant_types || ['authorization_code'],
      response_types: response_types || ['code'],
      scopes: scopes || ['read:user', 'user:email'],
      created_at: new Date().toISOString(),
    };

    storeClient(clientId, client);

    console.log(`Registered new MCP client: ${client_name} (${clientId})`);

    // Return client credentials according to RFC7591
    const response = NextResponse.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      client_name: client_name,
      redirect_uris: redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      scopes: client.scopes.join(' '),
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');

    return response;

  } catch (error) {
    console.error('Client registration error:', error);
    
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


