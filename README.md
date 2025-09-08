# GitHub OAuth MCP Server

**OAuth Proxy Pattern with Dynamic Client Registration**

This MCP server implements GitHub OAuth authentication using the **OAuth Proxy Pattern**, which enables Dynamic Client Registration (DCR) while maintaining compatibility with GitHub OAuth. The server acts as an OAuth authorization server for MCP clients and proxies authentication requests to GitHub.

## Features

- 🔐 **GitHub OAuth Authentication**: Secure access using GitHub OAuth
- 🛠️ **Multiple Tools**: Echo, dice rolling, admin info, and GitHub user info
- 🔒 **Scope-based Access Control**: Minimal scopes (`read:user`) for security
- 📋 **OAuth Metadata Endpoints**: Full OAuth 2.1 discovery compliance
- 🚀 **Dynamic Client Registration**: Automatic client registration (RFC7591)
- 🛡️ **OAuth Proxy Pattern**: Enables DCR with GitHub OAuth
- 🌐 **Web Login Interface**: Simple login page at `localhost:3000`
- 📡 **Real-time Notifications**: Server-Sent Events (SSE) for progress updates
- 🎯 **Progress Tracking**: Step-based and phase-based progress notifications
- 🧪 **Comprehensive Testing**: 49 unit tests + integration test scripts

## Available Tools

1. **echo** - Echo a message with user context (requires `read:user`)
2. **roll_dice** - Roll one or more dice with progress notifications (requires `read:user`)
3. **wait** - Configurable wait with progress updates (requires `read:user`)
4. **generic_notifier_demo** - Demonstrate generic notification capabilities (requires `read:user`)
5. **adminInfo** - Get admin information (requires `read:user`)
6. **githubUserInfo** - Get information about the authenticated GitHub user (requires `read:user`)

## How It Works

### OAuth Proxy Pattern

The server implements an **OAuth Proxy Pattern** that solves the fundamental incompatibility between GitHub OAuth (no DCR support) and MCP requirements (DCR required):

1. **MCP Client Registration**: Clients register dynamically via `/api/oauth/register`
2. **Authorization Request**: Clients request authorization via `/oauth/authorize`
3. **GitHub OAuth**: Server redirects to GitHub using our OAuth App credentials
4. **Token Exchange**: Server exchanges GitHub codes for our own tokens
5. **MCP Access**: Clients use our tokens to access MCP tools

### Security Features

- **Minimal Scopes**: Always requests only `read:user` from GitHub
- **Scope Filtering**: Ignores client-requested scopes for security
- **PKCE Support**: Handles PKCE at our layer, not GitHub's
- **Token Expiration**: 1-hour expiration for access tokens
- **Client Validation**: Strict client credential validation

## GitHub OAuth Setup

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `MCP Server` (or any name you prefer)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/oauth/callback`
4. Note down the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Create `.env.local` and add the following:

```bash
# GitHub OAuth Configuration (for our OAuth proxy)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Important**: These are the credentials for our GitHub OAuth App that acts as the proxy. MCP clients will register dynamically and get their own credentials.

## Usage

### Running the Server

```sh
npm install
npm run dev
```

The server will be available at `http://localhost:3000`.

### Web Login Interface

Visit `http://localhost:3000` to see a simple login interface that demonstrates the OAuth flow.

### Testing with MCP Inspector

1. **Start the server**: `npm run dev`
2. **Open MCP Inspector** in your browser
3. **Connect to**: `http://localhost:3000/mcp`
4. **Follow the OAuth flow** - the Inspector will automatically:
   - Register as a client
   - Request authorization
   - Complete GitHub OAuth
   - Access MCP tools

**No manual token configuration needed!** The OAuth flow handles everything automatically.

### Testing with Cursor

Add the following to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "github-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/mcp"],
      "env": {}
    }
  }
}
```

**Note**: Cursor will automatically handle the OAuth flow when you first connect.

## OAuth Discovery and Dynamic Client Registration

The server implements complete OAuth 2.1 discovery and Dynamic Client Registration (DCR) according to the MCP specification:

### **OAuth Discovery Endpoints:**
- `/.well-known/oauth-protected-resource` - Protected resource metadata
- `/.well-known/oauth-authorization-server` - Authorization server metadata
- `/.well-known/openid-configuration` - OpenID Connect metadata

### **Dynamic Client Registration:**
- `POST /api/oauth/register` - Client registration endpoint (RFC7591)
- Automatically generates client credentials for MCP clients
- No manual registration required
- Supports automatic client discovery and registration

### **OAuth Endpoints:**
- `GET /oauth/authorize` - Authorization endpoint
- `POST /api/oauth/token` - Token exchange endpoint
- `GET /api/oauth/userinfo` - User information endpoint

### **What This Enables:**
- **Seamless client registration** - MCP clients can automatically register
- **No manual configuration** - No need to pre-register clients
- **Standards compliance** - Follows OAuth 2.1 and RFC7591 specifications
- **Automatic discovery** - Clients can discover all required endpoints
- **GitHub OAuth compatibility** - Works with GitHub's OAuth system

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
4. Deploy

### Environment Variables for Production

Update your GitHub OAuth App for production:
- **Authorization callback URL**: `https://your-app.vercel.app/api/oauth/callback`

### Production Considerations

For production deployment, you'll need to:
- Replace file-based storage with a database
- Set up monitoring and error tracking
- Configure proper security headers
- Set up automated backups

See `CONSIDERATION.md` for detailed production deployment guide.

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment variables for all sensitive configuration
- The server always requests minimal scopes (`read:user`) from GitHub
- Client-requested scopes are filtered for security
- Access tokens expire after 1 hour
- Authorization codes expire after 10 minutes

## Troubleshooting

### Common Issues

1. **"The redirect_uri is not associated with this application"**: Update your GitHub OAuth App callback URL to `http://localhost:3000/api/oauth/callback`
2. **"No code found: server_error, Invalid client"**: Restart the server to reload client storage
3. **"GitHub token exchange failed: 400"**: Check that your GitHub OAuth App credentials are correct
4. **Broad scopes displayed by GitHub**: Revoke existing authorization for your OAuth App in GitHub Settings > Applications

### Debug Endpoints

In development, you can access debug endpoints:
- `GET /api/debug/clients` - List registered clients
- `GET /api/debug/auth-codes?code=xxx` - Check authorization codes

### Storage

The server uses file-based storage (`.oauth-storage.json`) for development. This file persists OAuth data between server restarts.

See `COMMON_ISSUES.md` for detailed troubleshooting guide.

## Local Development

### Running the Server

```sh
npm install
npm run dev
```

The server will be available at `http://localhost:3000`.

### Testing with MCP Inspector

To test this MCP server using the [MCP Inspector](https://modelcontextprotocol.io/inspector):

1. **Start the server**: `npm run dev`
2. **Open MCP Inspector** in your browser
3. **Connect to**: `http://localhost:3000/mcp`
4. **Follow the OAuth flow** - no manual configuration needed

**Note**: The `/mcp` endpoint uses HTTP transport which works without additional dependencies.

## Testing

The project includes comprehensive testing for both integration scenarios and unit tests for the notification system.

### Unit Tests

The notification system includes a complete test suite with 49 tests covering all core functionality:

```sh
# Run all unit tests
npm test

# Run tests with verbose output
npx jest --verbose

# Run specific test file
npx jest lib/notifications/__tests__/base-notifier.test.ts

# Run tests with coverage report
npx jest --coverage
```

#### Test Coverage

- **BaseNotificationHandler** (19 tests): Core notification functionality, state management, error handling
- **ProgressTracker** (19 tests): Step-based progress tracking, history management, inheritance
- **Configuration** (11 tests): Logging system, configuration management, default values

#### Test Results
```
✓ Test Suites: 3 passed, 3 total
✓ Tests: 49 passed, 49 total
✓ Time: ~1.6s
```

### Integration Test Scripts

The project includes several test scripts for different scenarios:

```sh
# Test basic OAuth functionality
node scripts/test-oauth.mjs

# Test complete OAuth proxy flow
node scripts/test-complete-flow.mjs

# Test web login flow
node scripts/test-web-login.mjs

# Test scope filtering
node scripts/test-scope-filtering.mjs

# Test notification system
node scripts/test-notifications.mjs

# Test MCP client functionality
node scripts/test-client.mjs

# Test streamable HTTP client
node scripts/test-streamable-http-client.mjs
```

## Notification System

The server includes a comprehensive notification system that enables real-time progress updates via Server-Sent Events (SSE). This system is designed to be:

- **Generic**: No assumptions about task nature - developers can emit any type of notification
- **Extensible**: Specialized classes for step-based and phase-based progress tracking
- **Well-tested**: 49 unit tests covering all functionality
- **Production-ready**: Comprehensive error handling and logging

### Key Components

- **BaseNotificationHandler**: Generic notification interface for any task type
- **ProgressTracker**: Step-based progress tracking with history
- **HierarchicalProgressTracker**: Phase-based progress with weighted completion
- **NotificationService**: Centralized service for creating handlers and sending notifications
- **Simplified Decorators**: Easy-to-use decorators for tool integration

### Usage Examples

```typescript
// Generic notifications (no task assumptions)
import { withNotifications } from '@/lib/mcp/simplified-decorators';

export const myTool = {
  handler: withNotifications(async (notifier, args) => {
    if (notifier) {
      await notifier.notify("Starting process", { step: 1 });
      // ... do work ...
      await notifier.complete("All done!");
    }
  })
};

// Step-based progress tracking
import { withProgressTracking } from '@/lib/mcp/simplified-decorators';

export const myTool = {
  handler: withProgressTracking(async (tracker, args) => {
    if (tracker) {
      await tracker.setTotal(5);
      for (let i = 0; i < 5; i++) {
        await tracker.updateProgress(`Step ${i + 1}`);
        // ... do work ...
      }
    }
  })
};
```

For detailed documentation, see `lib/notifications/README.md` and `lib/notifications/ARCHITECTURE.md`.

## Architecture Documentation

- **`ARCHITECTURE.md`** - Detailed architecture and security features
- **`COMMON_ISSUES.md`** - Issues encountered and solutions implemented
- **`CONSIDERATION.md`** - Production deployment requirements and considerations
- **`lib/notifications/README.md`** - Notification system documentation
- **`lib/notifications/ARCHITECTURE.md`** - Notification system architecture
