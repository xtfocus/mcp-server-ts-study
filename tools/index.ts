import { AuthInfo } from '@/lib/types';
import { toolRegistry } from './registry';

/**
 * Registers all available tools with the MCP server
 * @param server - The MCP server instance
 * @param authInfo - Authentication information from the user
 */
export function registerAllTools(server: any, authInfo: AuthInfo) {
  console.log(`[ToolRegistry] Registering ${toolRegistry.length} tools`);
  
  for (const tool of toolRegistry) {
    console.log(`[ToolRegistry] Registering tool: ${tool.name}`);
    
    // Register the tool with the server
    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      async (args: any, extra: any) => {
        console.log(`[ToolRegistry] Executing tool: ${tool.name}`);
        console.log(`[ToolRegistry] Args:`, args);
        console.log(`[ToolRegistry] Extra:`, extra);
        
        // If the tool handler is a decorator (like withProgressTracking), we need to create a mock request
        if (typeof tool.handler === 'function' && tool.handler.length === 2) {
          // This is a decorator function that expects (request, extra)
          console.log(`[ToolRegistry] Calling decorator handler`);
          
          // Create a mock request object that matches the expected structure
          const mockRequest = {
            params: {
              arguments: args,
              _meta: extra?._meta || {}
            }
          };
          
          return await tool.handler(mockRequest, extra);
        } else {
          // This is a regular handler that expects (args, authInfo)
          console.log(`[ToolRegistry] Calling regular handler with args:`, args);
          return await tool.handler(args, authInfo);
        }
      }
    );
  }
  
  console.log(`[ToolRegistry] Successfully registered ${toolRegistry.length} tools`);
}

/**
 * Get all available tool names
 */
export function getAllToolNames(): string[] {
  return toolRegistry.map(tool => tool.name);
}

/**
 * Get tool capabilities for MCP server configuration
 */
export function getToolCapabilities() {
  const capabilities: Record<string, { description: string }> = {};
  
  for (const tool of toolRegistry) {
    capabilities[tool.name] = {
      description: tool.description
    };
  }
  
  return capabilities;
}
