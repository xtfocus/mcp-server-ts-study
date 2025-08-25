import { z } from 'zod';
import { AuthInfo } from '@/lib/types';

/**
 * Registers all available tools with the MCP server
 * @param server - The MCP server instance
 * @param authInfo - Authentication information from the user
 */
export function registerAllTools(server: any, authInfo: AuthInfo) {
  // Basic echo tool that includes user context
  server.tool(
    'echo',
    'Echo a message with user context',
    { message: z.string().describe('The message to echo') },
    async ({ message }: { message: string }) => {
      const user = authInfo.extra?.userData;
      const userInfo = user ? ` (User: ${user.login})` : '';
      
      return {
        content: [{ 
          type: 'text', 
          text: `Echo: ${message}${userInfo}` 
        }],
      };
    },
  );

  // Dice rolling tool
  server.tool(
    'roll_dice',
    'Roll one or more dice with specified number of sides',
    { 
      sides: z.number().int().min(2).max(100).describe('Number of sides on the die'),
      count: z.number().int().min(1).max(10).default(1).describe('Number of dice to roll')
    },
    async ({ sides, count }: { sides: number; count: number }) => {
      const results = [];
      for (let i = 0; i < count; i++) {
        const value = 1 + Math.floor(Math.random() * sides);
        results.push(value);
      }
      
      const resultText = count === 1 
        ? `🎲 You rolled a ${results[0]}!`
        : `🎲 You rolled: ${results.join(', ')} (${results.reduce((a, b) => a + b, 0)} total)`;
      
      return {
        content: [{ type: 'text', text: resultText }],
      };
    },
  );

  // Admin information tool (only for users with admin scopes)
  server.tool(
    'adminInfo',
    'Get admin information (privileged users only)',
    {},
    async () => {
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
  );

  // GitHub user info tool
  server.tool(
    'githubUserInfo',
    'Get information about the authenticated GitHub user',
    {},
    async () => {
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
  );


}
