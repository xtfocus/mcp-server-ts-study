import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

/**
 * OAuth Protected Resource Metadata endpoint
 * 
 * This endpoint provides OAuth configuration details that allow MCP clients to discover:
 * - How to authorize with this server
 * - Which authorization servers can issue valid tokens
 * - What scopes are supported
 * 
 * This is required by the MCP specification for OAuth-enabled servers.
 */
const handler = protectedResourceHandler({
  authServerUrls: ['https://github.com'],
});

export { handler as GET, metadataCorsOptionsRequestHandler as OPTIONS };
