# Common Issues and Solutions

This document describes the issues encountered during the implementation of the MCP server with GitHub OAuth authentication and the solutions that were implemented to reach a working state.

## OAuth Flow Issues

### 1. **GitHub OAuth Scope Display Problem**

**Issue**: GitHub was displaying broad scopes like "Full control of orgs and teams", "Full control of private repositories" even after implementing scope filtering.

**Root Cause**: GitHub caches authorization state for OAuth Apps. When a user previously authorized an OAuth App with broad scopes, GitHub continues to display those scopes even if the current request only asks for minimal permissions.

**Solution**: 
- **Code Fix**: Hardcoded scope to `"read:user"` in the authorization endpoint, ignoring client-requested scopes
- **User Action**: Revoke existing authorization for the GitHub OAuth App in GitHub Settings > Applications
- **Alternative**: Create a new GitHub OAuth App with a different name

**Implementation**:
```typescript
// app/oauth/authorize/route.ts
// Always use minimal scope (matching remote-mcp-server-with-auth)
// Ignore whatever scope the client requested for security
githubAuthUrl.searchParams.set('scope', 'read:user');
```

### 2. **"The redirect_uri is not associated with this application"**

**Issue**: GitHub OAuth callback was failing with redirect URI mismatch errors.

**Root Cause**: The GitHub OAuth App was configured with a different callback URL than what our server was using.

**Solution**: 
- Updated GitHub OAuth App settings to include `http://localhost:3000/api/oauth/callback` as an authorized redirect URI
- For production, update to the actual domain

**GitHub OAuth App Configuration**:
```
Authorization callback URL: http://localhost:3000/api/oauth/callback
```

### 3. **"No code found: server_error, Invalid client"**

**Issue**: After GitHub sign-in, the callback was failing to find the authorization code.

**Root Cause**: In-memory storage was being reset on server restarts, losing all client registrations and authorization codes.

**Solution**: Implemented file-based persistent storage that survives server restarts.

**Implementation**:
```typescript
// lib/oauth-storage.ts
const STORAGE_FILE = join(process.cwd(), '.oauth-storage.json');

function loadStorage() {
  if (existsSync(STORAGE_FILE)) {
    const data = JSON.parse(readFileSync(STORAGE_FILE, 'utf8'));
    // Load clients, auth codes, and access tokens
  }
}
```

### 4. **"GitHub token exchange failed: 400 - A code_verifier was not included"**

**Issue**: PKCE (Proof Key for Code Exchange) validation was failing during token exchange.

**Root Cause**: Our OAuth proxy was forwarding PKCE parameters to GitHub, but GitHub doesn't support PKCE for server-to-server flows.

**Solution**: 
- Don't forward PKCE parameters to GitHub
- Handle PKCE validation at our token endpoint when MCP clients exchange our authorization codes

**Implementation**:
```typescript
// app/oauth/authorize/route.ts
// Don't forward PKCE to GitHub - handle it at our token endpoint
console.log('PKCE from client will be validated during token exchange with our server');
```

## MCP Server Issues

### 5. **"Token validation failed: TypeError: server.tool is not a function"**

**Issue**: MCP server was failing to register tools after authentication.

**Root Cause**: Tools were being registered in the `withMcpAuth` callback instead of the base handler.

**Solution**: Register tools in the base handler and pass authentication info through the server context.

**Implementation**:
```typescript
// app/[transport]/route.ts
const baseHandler = createMcpHandler((server) => {
  registerAllTools(server, { token: '', scopes: [], clientId: '', extra: {} });
});

const authenticatedHandler = withMcpAuth(baseHandler, async (server, token) => {
  // Only validate token, tools are already registered
  return await validateProxyToken(token);
});
```

### 6. **Metadata Discovery 404 Errors**

**Issue**: MCP clients couldn't discover OAuth metadata endpoints.

**Root Cause**: Missing metadata endpoint implementations for OAuth discovery.

**Solution**: Implemented all required metadata endpoints with proper CORS headers.

**Endpoints Created**:
- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`
- `/.well-known/openid-configuration`

**Implementation**:
```typescript
// app/.well-known/oauth-protected-resource/route.ts
export async function GET(request: NextRequest) {
  const metadata = {
    issuer: request.nextUrl.origin,
    authorization_servers: [`${request.nextUrl.origin}/.well-known/oauth-authorization-server`],
    scopes_supported: getSupportedScopes(),
    resource: request.nextUrl.origin,
    resource_type: OAUTH_CONFIG.METADATA.RESOURCE_TYPE,
  };
  return NextResponse.json(metadata, { headers: corsHeaders });
}
```

### 7. **CORS Header Issues**

**Issue**: MCP clients were getting CORS errors when accessing metadata endpoints.

**Root Cause**: Missing `mcp-protocol-version` header in CORS configuration.

**Solution**: Added MCP-specific headers to CORS configuration.

**Implementation**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
  'Access-Control-Max-Age': '86400'
};
```

### 8. **Recursive 404s for Authorization Server Metadata**

**Issue**: Clients were making recursive requests to `/.well-known/oauth-authorization-server/.well-known/oauth-authorization-server`.

**Root Cause**: Client-side path resolution issues with the `issuer` field.

**Solution**: Created a catch-all route to handle recursive requests.

**Implementation**:
```typescript
// app/.well-known/oauth-authorization-server/[...path]/route.ts
export async function GET(request: NextRequest) {
  // Return the same metadata as the main endpoint
  return await GET(new NextRequest(request.nextUrl.origin + '/.well-known/oauth-authorization-server'));
}
```

## Development and Testing Issues

### 9. **TypeScript Linter Errors**

**Issue**: Multiple TypeScript compilation errors during development.

**Solutions**:
- **Missing type annotations**: Added explicit types to function parameters
- **Unknown error types**: Added proper error type checking
- **Missing properties**: Fixed interface definitions

**Examples**:
```typescript
// Fixed type annotations
async ({ message }: { message: string }) => {
  // Function body
}

// Fixed error handling
const errorMessage = error instanceof Error ? error.message : 'Unknown error';
```

### 10. **File-based Storage Limitations**

**Issue**: File storage was not suitable for production deployment.

**Solution**: Designed storage interface to be easily replaceable with database storage.

**Implementation**:
```typescript
// lib/oauth-storage.ts
// File-based storage for development (in production, use a database)
const STORAGE_FILE = join(process.cwd(), '.oauth-storage.json');
```

### 11. **Environment Variable Management**

**Issue**: Sensitive configuration was scattered across multiple files.

**Solution**: Centralized configuration in `lib/oauth-config.ts`.

**Implementation**:
```typescript
export const OAUTH_CONFIG = {
  SCOPE: 'read:user',
  REQUIRED_SCOPES: ['read:user'] as const,
  SUPPORTED_SCOPES: ['read:user'] as const,
  AUTH_CODE_EXPIRY: 10 * 60 * 1000,
  ACCESS_TOKEN_EXPIRY: 60 * 60 * 1000,
  // ... other configuration
};
```

## Web Login Integration Issues

### 12. **Web Login Redirect URI Mismatch**

**Issue**: Direct login from `localhost:3000` was failing due to redirect URI configuration.

**Root Cause**: Web login was trying to use direct GitHub OAuth instead of our proxy.

**Solution**: Updated web login to use our OAuth proxy pattern.

**Implementation**:
```typescript
// app/page.tsx
const handleGitHubLogin = async () => {
  // Step 1: Register a client for this session
  const registerResponse = await fetch('/api/oauth/register', { /* ... */ });
  
  // Step 2: Start OAuth flow with our proxy
  const authUrl = `/oauth/authorize?client_id=${clientData.client_id}&...`;
  window.location.href = authUrl;
};
```

### 13. **Token Storage in Web Login**

**Issue**: Web login needed to store GitHub tokens for user information display.

**Root Cause**: OAuth proxy tokens don't contain GitHub user data.

**Solution**: Modified callback to fetch GitHub user data and store it.

**Implementation**:
```typescript
// app/api/auth/callback/github/route.ts
const authCodeData = await fetch(`${request.nextUrl.origin}/api/debug/auth-codes?code=${code}`).then(r => r.json());
const accessToken = authCodeData.data.accessToken;

// Store token in localStorage for web login
const html = `<script>localStorage.setItem('github_token', '${accessToken}'); window.location.href = '/';</script>`;
```

## Testing and Debugging Issues

### 14. **OAuth Flow Testing Complexity**

**Issue**: Manual testing of OAuth flows was time-consuming and error-prone.

**Solution**: Created comprehensive test scripts for different scenarios.

**Test Scripts Created**:
- `scripts/test-oauth.mjs` - Basic OAuth functionality
- `scripts/test-complete-flow.mjs` - Complete OAuth proxy flow
- `scripts/test-web-login.mjs` - Web login flow
- `scripts/test-scope-filtering.mjs` - Scope filtering verification

### 15. **Debug Endpoint Security**

**Issue**: Debug endpoints exposed sensitive information in development.

**Solution**: Created debug endpoints with proper access controls.

**Implementation**:
```typescript
// app/api/debug/clients/route.ts
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  
  return NextResponse.json({
    clients: Object.fromEntries(clients),
    count: clients.size
  });
}
```

## Performance and Scalability Issues

### 16. **In-memory Storage Scalability**

**Issue**: In-memory storage doesn't scale across multiple server instances.

**Solution**: Designed storage interface to be easily replaceable with external storage.

**Future Implementation**:
```typescript
// Example database storage interface
export async function storeClient(clientId: string, clientData: any) {
  await db.clients.create({ data: { clientId, ...clientData } });
}
```

### 17. **Token Expiration Management**

**Issue**: No automatic cleanup of expired tokens and authorization codes.

**Solution**: Implemented expiration checking in token validation.

**Implementation**:
```typescript
export async function validateProxyToken(token: string): Promise<AuthInfo> {
  const tokenData = getAccessToken(token);
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    throw new Error('Invalid or expired token');
  }
  // ... rest of validation
}
```

## Lessons Learned

### 1. **OAuth Proxy Pattern Benefits**
- Enables DCR support with GitHub OAuth
- Provides scope control and security
- Allows custom validation and logic

### 2. **Storage Strategy**
- File-based storage works well for development
- Design interfaces for easy database replacement
- Implement proper error handling and persistence

### 3. **MCP Integration**
- Register tools in base handler, not auth callback
- Implement all required metadata endpoints
- Handle CORS properly for MCP clients

### 4. **Security Best Practices**
- Always validate client credentials
- Implement proper token expiration
- Use minimal scopes for OAuth requests
- Sanitize all user inputs

### 5. **Testing Strategy**
- Create automated test scripts
- Test complete OAuth flows
- Verify scope filtering and security
- Test both MCP and web login scenarios

## Conclusion

The implementation journey revealed the complexity of integrating OAuth 2.1 with MCP requirements, particularly around Dynamic Client Registration. The OAuth proxy pattern proved to be an effective solution, providing both security and flexibility while maintaining compatibility with existing OAuth providers like GitHub.

The key to success was iterative development with comprehensive testing at each step, allowing us to identify and resolve issues early in the development process.
