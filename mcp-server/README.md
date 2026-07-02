# Brew Coffee MCP Server (SSE)

Model Context Protocol (MCP) server that exposes Brew Coffee API as MCP tools using Server-Sent Events (SSE).

## Installation

```bash
cd mcp-server
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3001`

**Server Endpoints:**
- **MCP SSE Endpoint**: `http://localhost:3001/sse`
- **Health Check**: `http://localhost:3001/health`
- **Message Endpoint**: `http://localhost:3001/message` (POST)

## Configuration

### For Claude Desktop

Add this to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "brew-coffee": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

### Environment Variables

- `MCP_PORT`: Server port (default: 3001)

```bash
MCP_PORT=4000 npm start
```

## Available Tools

### 1. `get_menu`
Retrieves the complete coffee and food menu with prices and categories.

**Parameters**: None

**Example usage in Claude**:
```
Can you get the coffee menu?
```

### 2. `get_hours`
Returns operating hours for the coffee shop.

**Parameters**:
- `day` (optional): Day of the week (Monday-Sunday)

**Example usage in Claude**:
```
What are the hours for Friday?
Show me all operating hours.
```

### 3. `get_location`
Fetches detailed location information including address, phone, and coordinates.

**Parameters**:
- `city` (optional): City name (New York, Los Angeles, Chicago, San Francisco, Seattle)

**Example usage in Claude**:
```
Get the New York location details.
Show me all coffee shop locations.
```

## Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Connect to SSE Endpoint
```bash
curl -N http://localhost:3001/sse
```

## Prerequisites

- Node.js 18+
- The Brew Coffee API server must be running at `https://pmz9p6sb-3000.inc1.devtunnels.ms`

## Architecture

The MCP server acts as a bridge between Claude and the Brew Coffee REST API:
- **Transport**: SSE (Server-Sent Events) over HTTP
- **Endpoint**: `http://localhost:3001/sse`
- Exposes 3 tools that map to the 3 API endpoints
- Handles retry logic (3 attempts with exponential backoff)
- 5-second timeout per request
- Supports CORS for browser-based clients

## SSE vs Stdio

This implementation uses **SSE (Server-Sent Events)**:
- ✅ Runs as an HTTP server with an endpoint
- ✅ Can be accessed remotely
- ✅ Browser-compatible
- ✅ Multiple clients can connect
- ✅ Easy to test with curl

Previously used **stdio**:
- Runs as a child process
- Only works locally
- Single client (Claude Desktop)
- No HTTP endpoint
