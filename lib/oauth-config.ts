/**
 * Centralized OAuth Configuration
 * 
 * This file contains all OAuth-related configuration to avoid scattering
 * settings across multiple files.
 */

export const OAUTH_CONFIG = {
  // The scope we always use for GitHub OAuth (matching remote-mcp-server-with-auth)
  SCOPE: 'read:user',
  
  // Required scopes for MCP server access
  REQUIRED_SCOPES: ['read:user'] as const,
  
  // Supported scopes for metadata endpoints
  SUPPORTED_SCOPES: ['read:user'] as const,
  
  // Authorization code expiration time (10 minutes)
  AUTH_CODE_EXPIRY: 10 * 60 * 1000,
  
  // Access token expiration time (1 hour)
  ACCESS_TOKEN_EXPIRY: 60 * 60 * 1000,
  
  // GitHub OAuth endpoints
  GITHUB: {
    AUTHORIZATION_ENDPOINT: 'https://github.com/login/oauth/authorize',
    TOKEN_ENDPOINT: 'https://github.com/login/oauth/access_token',
    USERINFO_ENDPOINT: 'https://api.github.com/user',
  },
  
  // OAuth metadata
  METADATA: {
    ISSUER: 'http://localhost:3000', // Will be overridden with actual origin
    RESOURCE_TYPE: 'mcp-server',
    RESOURCE_DESCRIPTION: 'MCP Server with GitHub OAuth authentication',
  },
} as const;

/**
 * Get supported scopes for metadata endpoints
 */
export function getSupportedScopes(): string[] {
  return [...OAUTH_CONFIG.SUPPORTED_SCOPES];
}

/**
 * Get required scopes for MCP server access
 */
export function getRequiredScopes(): string[] {
  return [...OAUTH_CONFIG.REQUIRED_SCOPES];
}
