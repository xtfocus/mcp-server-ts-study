import { NextRequest, NextResponse } from 'next/server';
import { validateProxyToken } from '@/lib/proxy-token-validation';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate the MCP token and get user data
    const authInfo = await validateProxyToken(token);
    
    // Return the user data from the token
    return NextResponse.json({
      user: authInfo.extra.userData,
      scopes: authInfo.scopes,
      clientId: authInfo.clientId,
    });

  } catch (error) {
    console.error('User info error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
