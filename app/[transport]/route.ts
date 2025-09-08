import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import { validateProxyToken } from "@/lib/proxy-token-validation";
import { registerAllTools, getToolCapabilities } from "@/tools";
import { AuthInfo } from "@/lib/types";
import { getRequiredScopes } from "@/lib/oauth-config";
import { NextRequest, NextResponse } from "next/server";

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

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Wrap the authenticated handler with CORS headers
async function handleWithCors(
  request: NextRequest,
  handler: typeof authenticatedHandler
) {
  const response = await handler(request);
  
  // Add CORS headers to the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

export async function GET(request: NextRequest) {
  return handleWithCors(request, authenticatedHandler);
}

export async function POST(request: NextRequest) {
  return handleWithCors(request, authenticatedHandler);
}

export async function DELETE(request: NextRequest) {
  return handleWithCors(request, authenticatedHandler);
}
