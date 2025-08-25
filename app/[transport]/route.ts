import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import { validateGitHubToken } from "@/lib/github";
import { registerAllTools } from "@/tools";
import { AuthInfo } from "@/lib/types";

// Create the base MCP handler with tool registration
const baseHandler = createMcpHandler(
  (server) => {
    // Register basic tools that are always available
    registerAllTools(server, {
      token: "",
      clientId: "",
      scopes: [],
      extra: { user: null, subject: "", audience: "" }
    });
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message with user context",
        },
        roll_dice: {
          description: "Roll one or more dice with specified number of sides",
        },
        adminInfo: {
          description: "Get admin information (privileged users only)",
        },
        githubUserInfo: {
          description: "Get information about the authenticated GitHub user",
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

// Create authenticated handler with GitHub OAuth
const authenticatedHandler = withMcpAuth(
  baseHandler,
  async (_, token): Promise<AuthInfo | undefined> => {
    if (!token) return undefined;
    
    try {
      // Validate the GitHub token
      const authInfo = await validateGitHubToken(token);
      return authInfo;
    } catch (error) {
      console.error('Token validation failed:', error);
      return undefined;
    }
  },
  { 
    required: true,
    requiredScopes: ['read:user'],
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  }
);

export { authenticatedHandler as GET, authenticatedHandler as POST, authenticatedHandler as DELETE };
