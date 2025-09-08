import { z } from 'zod';
import { AuthInfo } from '@/lib/types';

/**
 * Echo tool that includes user context
 */
export const echoTool = {
  name: 'echo',
  description: 'Echo a message with user context',
  schema: { 
    message: z.string().describe('The message to echo') 
  },
  handler: async ({ message }: { message: string }, authInfo: AuthInfo) => {
    const user = authInfo.extra?.userData;
    const userInfo = user ? ` (User: ${user.login})` : '';
    
    return {
      content: [{ 
        type: 'text', 
        text: `Echo: ${message}${userInfo}` 
      }],
    };
  },
};
