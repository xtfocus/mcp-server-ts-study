# MCP Server Architecture

## Overview

This document describes the high-level architecture of the Model Context Protocol (MCP) server implementation in `mcp-for-next.js`. The server provides GitHub OAuth authentication with Dynamic Client Registration (DCR) support, following the OAuth 2.1 specification and MCP authorization requirements.

## Architecture Components

### 1. **OAuth Proxy Pattern**

The core architectural decision is the **OAuth Proxy Pattern**, which solves the fundamental incompatibility between GitHub OAuth (no DCR support) and MCP requirements (DCR required).

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   Our Server     │    │   GitHub OAuth  │
│                 │    │   (OAuth Proxy)  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Register Client    │                       │
         │──────────────────────▶│                       │
         │                       │                       │
         │ 2. Authorize Request  │                       │
         │──────────────────────▶│                       │
         │                       │ 3. Redirect to GitHub │
         │                       │──────────────────────▶│
         │                       │                       │
         │                       │ 4. User Auth          │
         │                       │◀──────────────────────│
         │                       │                       │
         │                       │ 5. Token Exchange     │
         │                       │──────────────────────▶│
         │                       │                       │
         │ 6. Our Token          │                       │
         │◀──────────────────────│                       │
```

**Key Benefits:**
- **DCR Support**: MCP clients can dynamically register
- **Scope Control**: We control what scopes are requested from GitHub
- **Security**: We act as a trusted intermediary
- **Flexibility**: Can add custom logic and validation

### 2. **Authentication Flow**

#### **Step 1: Client Registration (DCR)**
```typescript
POST /api/oauth/register
{
  "client_name": "MCP Inspector",
  "redirect_uris": ["http://localhost:6274/callback"]
}
```

**Security Features:**
- **Client ID Generation**: Cryptographically secure random IDs
- **Client Secret**: 64-character hex string for token exchange
- **Redirect URI Validation**: Only pre-registered URIs allowed
- **Expiration**: Configurable client secret expiration

#### **Step 2: Authorization Request**
```typescript
GET /oauth/authorize?client_id=mcp_xxx&redirect_uri=...&scope=...
```

**Security Features:**
- **Client Validation**: Verify client exists and is active
- **Scope Filtering**: Always use `read:user` regardless of client request
- **State Parameter**: Encoded client request for callback
- **PKCE Support**: Handle code challenges from MCP clients

#### **Step 3: GitHub OAuth**
```typescript
// Redirect to GitHub with our OAuth App credentials
https://github.com/login/oauth/authorize?client_id=OUR_APP&scope=read:user
```

**Security Features:**
- **Minimal Scopes**: Only request `read:user` from GitHub
- **Fixed Credentials**: Use our pre-registered GitHub OAuth App
- **No PKCE Forwarding**: Handle PKCE at our layer, not GitHub's

#### **Step 4: Token Exchange**
```typescript
POST /api/oauth/token
{
  "grant_type": "authorization_code",
  "code": "our_auth_code",
  "client_id": "mcp_xxx",
  "client_secret": "xxx",
  "code_verifier": "pkce_verifier"
}
```

**Security Features:**
- **PKCE Validation**: Verify code challenge/verifier pairs
- **Client Authentication**: Validate client credentials
- **Code Expiration**: 10-minute expiration for auth codes
- **One-time Use**: Auth codes are deleted after use

### 3. **Storage Architecture**

#### **Development Storage (File-based)**
```typescript
// .oauth-storage.json
{
  "clients": {
    "mcp_xxx": { "client_name": "...", "client_secret": "..." }
  },
  "authCodes": {
    "code_xxx": { "clientId": "...", "scope": "...", "expiresAt": 123 }
  },
  "accessTokens": {
    "token_xxx": { "clientId": "...", "scope": "...", "expiresAt": 123 }
  }
}
```

**Security Features:**
- **File-based Persistence**: Survives server restarts
- **JSON Structure**: Human-readable for debugging
- **Automatic Loading**: Loads on server startup
- **Error Handling**: Graceful fallback on file errors

#### **Production Storage Requirements**
- **Database**: PostgreSQL, MongoDB, or similar
- **Encryption**: Encrypt sensitive data at rest
- **Backup**: Regular backups of OAuth state
- **Monitoring**: Track storage operations

### 4. **MCP Server Integration**

#### **Token Validation**
```typescript
// lib/proxy-token-validation.ts
export async function validateProxyToken(token: string): Promise<AuthInfo> {
  const tokenData = getAccessToken(token);
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    throw new Error('Invalid or expired token');
  }
  return {
    token,
    scopes: tokenData.scope.split(' '),
    clientId: tokenData.clientId,
    extra: { userData: tokenData.userData }
  };
}
```

**Security Features:**
- **Token Expiration**: 1-hour expiration for access tokens
- **Scope Validation**: Verify token has required scopes
- **Client Association**: Link tokens to specific clients
- **User Data**: Include GitHub user information

#### **Tool Registration**
```typescript
// tools/index.ts
export function registerAllTools(server: any, authInfo: AuthInfo) {
  server.tool('echo', 'Echo with user context', 
    { message: z.string() },
    async ({ message }) => {
      const user = authInfo.extra?.userData;
      return { content: [{ type: 'text', text: `Echo: ${message} (User: ${user?.login})` }] };
    }
  );
}
```

**Security Features:**
- **User Context**: Tools have access to authenticated user
- **Scope-based Access**: Tools can check required scopes
- **Input Validation**: Zod schemas for all tool inputs
- **Error Handling**: Graceful error responses

### 5. **Metadata Endpoints**

#### **OAuth Protected Resource Metadata**
```typescript
// .well-known/oauth-protected-resource/route.ts
{
  "issuer": "http://localhost:3000",
  "authorization_servers": ["http://localhost:3000/.well-known/oauth-authorization-server"],
  "scopes_supported": ["read:user"],
  "resource": "http://localhost:3000",
  "resource_type": "mcp-server"
}
```

#### **OAuth Authorization Server Metadata**
```typescript
// .well-known/oauth-authorization-server/route.ts
{
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/oauth/authorize",
  "token_endpoint": "http://localhost:3000/api/oauth/token",
  "registration_endpoint": "http://localhost:3000/api/oauth/register",
  "scopes_supported": ["read:user"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"]
}
```

**Security Features:**
- **CORS Headers**: Proper CORS configuration for discovery
- **MCP Headers**: Support for MCP-specific headers
- **Scope Disclosure**: Only reveal supported scopes
- **Endpoint Validation**: Verify all endpoints are accessible

## Security Architecture

### 1. **Authentication Security**

#### **OAuth 2.1 Compliance**
- **PKCE**: Proof Key for Code Exchange for public clients
- **State Parameters**: Prevent CSRF attacks
- **Scope Validation**: Enforce minimal required scopes
- **Token Expiration**: Short-lived tokens with refresh capability

#### **Client Security**
- **Client Registration**: Secure client ID/secret generation
- **Redirect URI Validation**: Prevent open redirect attacks
- **Client Authentication**: Validate client credentials
- **Scope Enforcement**: Ignore client-requested scopes

#### **Token Security**
- **Cryptographic Tokens**: Secure random token generation
- **Token Expiration**: Configurable expiration times
- **Token Revocation**: Support for token revocation
- **Scope Binding**: Tokens bound to specific scopes

### 2. **Transport Security**

#### **HTTPS Enforcement**
- **Production Requirement**: All endpoints must use HTTPS
- **HSTS Headers**: HTTP Strict Transport Security
- **Certificate Validation**: Valid SSL certificates

#### **CORS Configuration**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
  'Access-Control-Max-Age': '86400'
};
```

### 3. **Data Security**

#### **Storage Security**
- **Encryption at Rest**: Encrypt sensitive data in storage
- **Access Control**: Limit access to OAuth data
- **Audit Logging**: Log all OAuth operations
- **Data Minimization**: Store only necessary data

#### **Input Validation**
- **Zod Schemas**: Type-safe input validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Sanitize all user inputs
- **Rate Limiting**: Prevent abuse

### 4. **Monitoring and Logging**

#### **Security Events**
- **Authentication Attempts**: Log all auth attempts
- **Token Operations**: Track token creation/validation
- **Client Registration**: Monitor client registrations
- **Error Tracking**: Capture and analyze errors

#### **Performance Monitoring**
- **Response Times**: Monitor endpoint performance
- **Error Rates**: Track error frequencies
- **Resource Usage**: Monitor storage and memory usage
- **Availability**: Track uptime and reliability

## Deployment Architecture

### 1. **Development Environment**
- **Local Storage**: File-based storage for development
- **Hot Reloading**: Next.js development server
- **Debug Endpoints**: `/api/debug/*` for troubleshooting
- **Environment Variables**: `.env.local` for configuration

### 2. **Production Environment**
- **Database Storage**: Replace file storage with database
- **Environment Variables**: Secure environment configuration
- **Monitoring**: Application performance monitoring
- **Backup**: Regular data backups
- **SSL/TLS**: HTTPS enforcement

### 3. **Scaling Considerations**
- **Stateless Design**: Minimize server state
- **Database Connection Pooling**: Efficient database connections
- **Caching**: Redis or similar for token caching
- **Load Balancing**: Multiple server instances
- **CDN**: Content delivery for static assets

## Conclusion

This architecture provides a secure, scalable MCP server implementation with comprehensive OAuth 2.1 support. The OAuth proxy pattern enables Dynamic Client Registration while maintaining security through proper scope control, token management, and input validation.

The modular design allows for easy extension and maintenance, while the security features ensure protection against common OAuth and web application vulnerabilities.
