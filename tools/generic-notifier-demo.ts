import { z } from 'zod';
import { withNotifications, delay } from '@/lib/mcp/simplified-decorators';

/**
 * Demo tool showing the generic base notifier
 * Developers can emit any type of notification without assumptions about task nature
 */
export const genericNotifierDemoTool = {
  name: 'generic_notifier_demo',
  description: 'Demonstrates the generic base notifier - emit any notification without task assumptions',
  schema: { 
    message: z.string().describe('Custom message to send'),
    delay: z.number().int().min(1).max(10).describe('Delay between notifications in seconds'),
    count: z.number().int().min(1).max(5).describe('Number of notifications to send')
  },
  handler: withNotifications(async (notifier, { message, delay: delaySeconds, count }: { message: string; delay: number; count: number }) => {
    console.log(`[generic_notifier_demo] Tool called with message: ${message}, delay: ${delaySeconds}s, count: ${count}`);
    
    if (notifier) {
      console.log(`[generic_notifier_demo] Using generic notifier for custom notifications`);
      
      for (let i = 1; i <= count; i++) {
        // Send custom notifications with any data - no assumptions about progress, steps, etc.
        await notifier.notify(`${message} #${i}`, { 
          iteration: i, 
          total: count,
          timestamp: new Date().toISOString(),
          customData: { 
            randomValue: Math.random(),
            step: `step_${i}` 
          }
        });
        
        console.log(`[generic_notifier_demo] Sent notification ${i}/${count}`);
        
        if (i < count) {
          await delay(delaySeconds * 1000);
        }
      }
      
      await notifier.complete(`Demo completed! Sent ${count} custom notifications`);
    } else {
      console.log(`[generic_notifier_demo] No notifier available, running without notifications`);
      
      for (let i = 1; i <= count; i++) {
        console.log(`[generic_notifier_demo] Would send: ${message} #${i}`);
        if (i < count) {
          await delay(delaySeconds * 1000);
        }
      }
    }
    
    const resultText = `🎯 Generic notifier demo completed! Sent ${count} custom notifications with "${message}" message.`;
    console.log(`[generic_notifier_demo] Final result: ${resultText}`);
    
    return {
      content: [{ type: 'text', text: resultText }],
    };
  }),
};
