import { z } from 'zod';
import { AuthInfo } from '@/lib/types';

/**
 * GitHub user info tool
 */
export const githubUserInfoTool = {
  name: 'githubUserInfo',
  description: 'Get information about the authenticated GitHub user',
  schema: {},
  handler: async (args: {}, authInfo: AuthInfo) => {
    const user = authInfo.extra?.userData;
    
    if (!user) {
      return {
        content: [{ 
          type: 'text', 
          text: '❌ No user information available' 
        }],
      };
    }

    const userInfo = {
      id: user.id,
      login: user.login,
      name: user.name || 'Not provided',
      email: user.email || 'Not provided',
      avatar_url: user.avatar_url,
      scopes: authInfo.scopes
    };

    return {
      content: [{ 
        type: 'text', 
        text: `👤 GitHub User Information:\n${JSON.stringify(userInfo, null, 2)}` 
      }],
    };
  },
};
