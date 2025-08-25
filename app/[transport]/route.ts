import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "echo",
      "description",
      {
        message: z.string(),
      },
      async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }],
      })
    );

    server.tool(
      "roll_dice",
      "Roll one or more dice with specified number of sides",
      {
        sides: z.number().min(1).max(1000).default(6).describe("Number of sides on the dice (default: 6)"),
        count: z.number().min(1).max(100).default(1).describe("Number of dice to roll (default: 1)"),
      },
      async ({ sides, count }) => {
        const results = [];
        const total = [];
        
        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          results.push(roll);
          total.push(roll);
        }
        
        const sum = total.reduce((acc, val) => acc + val, 0);
        
        let resultText = `Rolled ${count} ${sides}-sided dice: [${results.join(', ')}]`;
        if (count > 1) {
          resultText += `\nTotal: ${sum}`;
        }
        
        return {
          content: [{ type: "text", text: resultText }],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message",
        },
        roll_dice: {
          description: "Roll one or more dice with specified number of sides",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
