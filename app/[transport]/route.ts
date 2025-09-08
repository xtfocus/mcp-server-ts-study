import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import { validateProxyToken } from "@/lib/proxy-token-validation";
import { registerAllTools, getToolCapabilities } from "@/tools";
import { AuthInfo } from "@/lib/types";
import { getRequiredScopes } from "@/lib/oauth-config";

// Create the base MCP handler
const baseHandler = createMcpHandler(
  (server) => {
    // Register tools with the server
    registerAllTools(server, {
      token: '',
      scopes: [],
      clientId: '',
      extra: {}
    });
  },
  {
    capabilities: {
      tools: getToolCapabilities(),
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  }
);

// Create authenticated handler with OAuth Proxy
const authenticatedHandler = withMcpAuth(
  baseHandler,
  async (server, token): Promise<AuthInfo | undefined> => {
    if (!token) return undefined;
    
    try {
      // Validate the proxy token
      const authInfo = await validateProxyToken(token);
      
      // Tools are already registered in the base handler
      // The auth info will be available to the tools through the server context
      
      return authInfo;
    } catch (error) {
      console.error('Token validation failed:', error);
      return undefined;
    }
  },
  { 
    required: true,
    requiredScopes: getRequiredScopes(),
    resourceMetadataPath: '/.well-known/oauth-protected-resource',
  }
);

export { authenticatedHandler as GET, authenticatedHandler as POST, authenticatedHandler as DELETE };
