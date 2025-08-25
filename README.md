# GitHub OAuth MCP Server

**Uses `mcp-handler` with GitHub OAuth Authentication**

This MCP server demonstrates how to implement OAuth 2.1 authentication using GitHub as the authorization server. The server provides various tools that require different levels of GitHub permissions.

## Features

- 🔐 **GitHub OAuth Authentication**: Secure access using GitHub Personal Access Tokens
- 🛠️ **Multiple Tools**: Echo, dice rolling, admin info, GitHub user info, and repository listing
- 🔒 **Scope-based Access Control**: Different tools require different GitHub scopes
- 📋 **OAuth Metadata Endpoint**: Compliant with MCP specification for OAuth discovery

## Available Tools

1. **echo** - Echo a message with user context (requires `read:user`)
2. **roll_dice** - Roll one or more dice with specified number of sides (requires `read:user`)
3. **adminInfo** - Get admin information (requires `admin:org` or `admin:user`)
4. **githubUserInfo** - Get information about the authenticated GitHub user (requires `read:user`)

## GitHub OAuth Setup

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `MCP Server`
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Note down the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and update the values:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 3. Create a GitHub Personal Access Token

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `read:user` (required for basic access)
   - `user:email` (optional, for email access)
4. Copy the generated token

## Usage

### Running the Server

```sh
pnpm install
pnpm dev
```

The server will be available at `http://localhost:3000`.

### Testing with MCP Inspector

1. **Start the server**: `pnpm dev`
2. **Open MCP Inspector** in your browser
3. **Configure the connection**:
   - **URL**: `http://localhost:3000/mcp`
   - **Transport Type**: `streamable-http`
   - **Authorization**: Add your GitHub Personal Access Token as a Bearer token
4. **Connect** to test the server

### Testing with Cursor

Add the following to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "github-mcp": {
      "url": "http://localhost:3000/mcp",
      "authorization": {
        "type": "bearer",
        "token": "your_github_personal_access_token"
      }
    }
  }
}
```

## OAuth Metadata Endpoint

The server exposes an OAuth metadata endpoint at `/.well-known/oauth-protected-resource/mcp` that provides:

- Authorization server URLs (GitHub)
- Supported scopes
- Resource information

This allows MCP clients to discover how to authenticate with the server.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Update your `.env.local` for production:

```bash
NEXTAUTH_URL=https://your-app.vercel.app
```

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your GitHub Personal Access Tokens
- Consider using GitHub Apps instead of OAuth Apps for production use

## Troubleshooting

### Common Issues

1. **"Invalid GitHub token" error**: Ensure your token has the required scopes
2. **"Access denied" for admin tools**: Your token needs `admin:org` or `admin:user` scope
3. **"Access denied" for repository tools**: Your token needs `repo` or `public_repo` scope

### Debug Mode

Enable verbose logging by setting `verboseLogs: true` in the MCP handler configuration.

## Local Development

### Running the Server

```sh
pnpm install
pnpm dev
```

The server will be available at `http://localhost:3000`.

### Testing with MCP Inspector

To test this MCP server using the [MCP Inspector](https://modelcontextprotocol.io/inspector):

1. **Start the server**: `pnpm dev`
2. **Open MCP Inspector** in your browser
3. **Configure the connection**:
   - **URL**: `http://localhost:3000/mcp`
   - **Transport Type**: `streamable-http`
4. **Connect** to test the server

**Note**: Use the `/mcp` endpoint (not `/sse`) to avoid Redis requirements. The `/mcp` endpoint uses HTTP transport which works without additional dependencies.

## Notes for running on Vercel

- To use the SSE transport, requires a Redis attached to the project under `process.env.REDIS_URL`
- Make sure you have [Fluid compute](https://vercel.com/docs/functions/fluid-compute) enabled for efficient execution
- After enabling Fluid compute, open `app/route.ts` and adjust `maxDuration` to 800 if you using a Vercel Pro or Enterprise account
- [Deploy the Next.js MCP template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)

## Sample Clients

### HTTP Transport (Recommended for local testing)

`scripts/test-streamable-http-client.mjs` contains a sample client for HTTP transport (no Redis required).

```sh
node scripts/test-streamable-http-client.mjs http://localhost:3000
```

### SSE Transport (Requires Redis)

`scripts/test-client.mjs` contains a sample client for SSE transport (requires Redis).

```sh
node scripts/test-client.mjs https://mcp-for-next-js.vercel.app
```
