# Example Next.js MCP Server

**Uses `mcp-handler`**

## Usage

This sample app uses the [Vercel MCP Adapter](https://www.npmjs.com/package/mcp-handler) that allows you to drop in an MCP server on a group of routes in any Next.js project.

Update `app/[transport]/route.ts` with your tools, prompts, and resources following the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server).

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
