import { z } from 'zod';
import { AuthInfo } from '@/lib/types';

/**
 * Admin information tool (only for users with admin scopes)
 */
export const adminInfoTool = {
  name: 'adminInfo',
  description: 'Get admin information (privileged users only)',
  schema: {},
  handler: async (args: {}, authInfo: AuthInfo) => {
    const user = authInfo.extra?.userData;
    const hasAdminScope = authInfo.scopes.includes('admin:org') || authInfo.scopes.includes('admin:user');
    
    if (!hasAdminScope) {
      return {
        content: [{ 
          type: 'text', 
          text: '❌ Access denied. This tool requires admin privileges.' 
        }],
      };
    }

    const adminInfo = {
      user: user?.login || 'Unknown',
      scopes: authInfo.scopes,
      clientId: authInfo.clientId,
      tokenType: 'GitHub OAuth',
      permissions: 'Admin access granted'
    };

    return {
      content: [{ 
        type: 'text', 
        text: `🔐 Admin Information:\n${JSON.stringify(adminInfo, null, 2)}` 
      }],
    };
  },
};
