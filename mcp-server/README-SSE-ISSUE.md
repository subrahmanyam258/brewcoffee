# SSE Transport Issue

## Problem
The MCP SDK's `SSEServerTransport` is not fully functional for production use. It has several issues:
1. Handshake timeout
2. Message routing between `/sse` and `/message` endpoints is unclear
3. Limited documentation and examples

## Recommendation

**Use stdio transport** which is production-ready and widely supported.

### For stdio with Claude Desktop:

```json
{
  "mcpServers": {
    "brew-coffee": {
      "command": "node",
      "args": ["/Users/Subrahmanyam.D/Documents/Axis collections/brewCoffee/mcp-server/index-stdio.js"]
    }
  }
}
```

### Alternative: HTTP with JSON-RPC

If you absolutely need HTTP-based communication (not stdio), we can implement a simple HTTP JSON-RPC endpoint instead of SSE.

Would you like me to:
1. Implement an HTTP JSON-RPC endpoint (simpler than SSE)
2. Continue debugging SSE (may not be solvable with current SDK)
3. Use stdio (most reliable)
