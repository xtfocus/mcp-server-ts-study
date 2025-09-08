import { z } from 'zod';
import { withProgressTracking, delay } from '@/lib/mcp/simplified-decorators';
import { AuthInfo } from '@/lib/types';

/**
 * Enhanced dice rolling tool with progress notifications
 */
export const rollDiceTool = {
  name: 'roll_dice',
  description: 'Roll one or more dice with specified number of sides and progress updates',
  schema: { 
    sides: z.number().int().min(2).max(100).describe('Number of sides on the die'),
    count: z.number().int().min(1).max(10).default(1).describe('Number of dice to roll'),
    showProgress: z.boolean().default(true).describe('Whether to show progress updates')
  },
  handler: withProgressTracking(async (tracker, { sides, count, showProgress }: { sides: number; count: number; showProgress: boolean }) => {
    console.log(`[roll_dice] Tool called with sides: ${sides}, count: ${count}, showProgress: ${showProgress}, tracker: ${!!tracker}`);
    
    const results = [];
    
    if (showProgress && tracker) {
      console.log(`[roll_dice] Using progress tracking mode`);
      await tracker.updateProgress('🎲 Grabbing the dice...');
      await delay(500);
      
      await tracker.updateProgress('🎲 Rolling the dice...');
      await tracker.setTotal(count);
      
      for (let i = 0; i < count; i++) {
        await tracker.setProgress(i + 1, count, `Rolling die ${i + 1} of ${count}`);
        const value = 1 + Math.floor(Math.random() * sides);
        results.push(value);
        console.log(`[roll_dice] Rolled die ${i + 1}: ${value}`);
        await delay(300); // Simulate rolling time
      }
      
      await tracker.updateProgress('🎲 Reading the results...');
      await delay(200);
    } else {
      console.log(`[roll_dice] Using fast mode without progress updates`);
      // Fast mode without progress updates
      for (let i = 0; i < count; i++) {
        const value = 1 + Math.floor(Math.random() * sides);
        results.push(value);
        console.log(`[roll_dice] Rolled die ${i + 1}: ${value}`);
      }
    }
    
    const resultText = count === 1 
      ? `🎲 You rolled a ${results[0]}!`
      : `🎲 You rolled: ${results.join(', ')} (${results.reduce((a, b) => a + b, 0)} total)`;
    
    console.log(`[roll_dice] Final result: ${resultText}`);
    
    return {
      content: [{ type: 'text', text: resultText }],
    };
  }),
};
