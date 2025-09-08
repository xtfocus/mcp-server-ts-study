import { z } from 'zod';
import { withProgressTracking, delay } from '@/lib/mcp/simplified-decorators';

/**
 * Wait tool with configurable total time and notification intervals
 * Demonstrates progress tracking with custom timing
 */
export const waitTool = {
  name: 'wait',
  description: 'Wait for a specified duration with progress notifications at custom intervals',
  schema: { 
    total: z.number().int().min(1).max(300).describe('Total wait time in seconds'),
    interval: z.number().int().min(1).max(60).describe('Interval between progress notifications in seconds'),
    message: z.string().optional().describe('Custom message to display during wait')
  },
  handler: withProgressTracking(async (tracker, { total, interval, message }: { total: number; interval: number; message?: string }) => {
    console.log(`[wait] Tool called with total: ${total}s, interval: ${interval}s, message: ${message || 'default'}`);
    
    const totalMs = total * 1000;
    const intervalMs = interval * 1000;
    const steps = Math.ceil(total / interval);
    
    console.log(`[wait] Will wait ${total}s total, sending ${steps} progress updates every ${interval}s`);
    
    if (tracker) {
      await tracker.setTotal(steps);
      
      for (let i = 0; i < steps; i++) {
        const currentTime = (i + 1) * interval;
        const progressMessage = message 
          ? `${message} (${currentTime}/${total}s)`
          : `Waiting... ${currentTime}/${total} seconds`;
        
        await tracker.setProgress(i + 1, steps, progressMessage);
        console.log(`[wait] Progress update ${i + 1}/${steps}: ${progressMessage}`);
        
        // Don't delay after the last step
        if (i < steps - 1) {
          await delay(intervalMs);
        }
      }
      
      await tracker.complete(`Wait completed! Total time: ${total} seconds`);
    } else {
      console.log(`[wait] No progress tracking, waiting ${total}s without updates`);
      await delay(totalMs);
    }
    
    const resultText = `⏰ Wait completed! Total duration: ${total} seconds with ${steps} progress updates every ${interval} seconds.`;
    console.log(`[wait] Final result: ${resultText}`);
    
    return {
      content: [{ type: 'text', text: resultText }],
    };
  }),
};
