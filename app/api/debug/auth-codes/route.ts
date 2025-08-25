import { NextRequest, NextResponse } from 'next/server';
import { getAuthCode } from '@/lib/oauth-storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (code) {
    const authCode = getAuthCode(code);
    return NextResponse.json({
      code,
      found: !!authCode,
      data: authCode
    });
  }
  
  return NextResponse.json({
    message: 'Use ?code=CODE to check specific authorization code'
  });
}
