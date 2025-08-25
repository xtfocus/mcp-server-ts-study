import { getAccessToken } from './oauth-storage';
import { AuthInfo } from './types';

export async function validateProxyToken(token: string): Promise<AuthInfo> {
  // Remove 'Bearer ' prefix if present
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  
  // Get the token data from our storage
  const tokenData = getAccessToken(cleanToken);
  
  if (!tokenData) {
    throw new Error('Invalid or expired access token');
  }
  
  // Check if token is expired
  if (Date.now() > tokenData.expiresAt) {
    throw new Error('Access token has expired');
  }
  
  // Return the auth info
  const authInfo: AuthInfo = {
    token: cleanToken,
    scopes: tokenData.scope ? tokenData.scope.split(' ') : ['read:user'],
    clientId: tokenData.clientId,
    extra: {
      userData: tokenData.userData,
      expiresAt: tokenData.expiresAt,
    },
  };
  
  return authInfo;
}
