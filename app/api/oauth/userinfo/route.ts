import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  try {
    // In a real implementation, validate the token against your database
    // For now, we'll return mock user data
    const userData = {
      sub: '123',
      name: 'Test User',
      preferred_username: 'testuser',
      email: 'test@example.com',
      picture: 'https://avatars.githubusercontent.com/u/123?v=4'
    };

    const response = NextResponse.json(userData);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');

    return response;

  } catch (error) {
    console.error('Userinfo endpoint error:', error);
    
    const response = NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');

    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  
  // Add CORS headers for preflight requests
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version');
  
  return response;
}
