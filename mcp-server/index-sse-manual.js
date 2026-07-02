#!/usr/bin/env node

import express from "express";
import cors from "cors";
import axios from "axios";

const BASE_URL = "https://pmz9p6sb-3000.inc1.devtunnels.ms";
const TIMEOUT = 5000;
const MCP_PORT = process.env.MCP_PORT || 3001;

// Helper function to make HTTP requests with retry logic
async function makeRequest(endpoint, params = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        params,
        timeout: TIMEOUT,
      });
      return response.data;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Store active connections
const connections = new Map();
let messageId = 0;

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SSE endpoint
app.get("/sse", (req, res) => {
  console.error("New SSE connection");

  // Setup SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const connectionId = Date.now().toString();
  connections.set(connectionId, res);

  // Send endpoint information immediately for handshake
  const endpointMessage = {
    endpoint: "/message"
  };
  res.write(`event: endpoint\n`);
  res.write(`data: ${JSON.stringify(endpointMessage)}\n\n`);

  console.error("Sent endpoint handshake");

  // Keep connection alive with comments
  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  req.on("close", () => {
    console.error(`Connection closed: ${connectionId}`);
    connections.delete(connectionId);
    clearInterval(keepAlive);
  });
});

// Handle MCP requests
app.post("/message", async (req, res) => {
  console.error("Received message:", JSON.stringify(req.body));

  const { jsonrpc, id, method, params } = req.body;

  // Acknowledge receipt immediately
  res.status(202).end();

  try {
    let result;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "brew-coffee-mcp-server",
            version: "1.0.0",
          },
          capabilities: {
            tools: {},
          },
        };
        break;

      case "tools/list":
        result = {
          tools: [
            {
              name: "get_menu",
              description:
                "Retrieves the complete coffee and food menu with prices and categories",
              inputSchema: {
                type: "object",
                properties: {},
                additionalProperties: false,
              },
            },
            {
              name: "get_hours",
              description:
                "Returns operating hours for the coffee shop. Optional 'day' parameter for specific day",
              inputSchema: {
                type: "object",
                properties: {
                  day: {
                    type: "string",
                    description: "Optional day of the week",
                    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                  },
                },
                additionalProperties: false,
              },
            },
            {
              name: "get_location",
              description:
                "Fetches location information. Optional 'city' parameter for specific city",
              inputSchema: {
                type: "object",
                properties: {
                  city: {
                    type: "string",
                    description: "Optional city name",
                  },
                },
                additionalProperties: false,
              },
            },
          ],
        };
        break;

      case "tools/call":
        const { name, arguments: args } = params;

        switch (name) {
          case "get_menu": {
            const data = await makeRequest("/api/menu");
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
            break;
          }

          case "get_hours": {
            const queryParams = args?.day ? { day: args.day } : {};
            const data = await makeRequest("/api/hours", queryParams);
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
            break;
          }

          case "get_location": {
            const queryParams = args?.city ? { city: args.city } : {};
            const data = await makeRequest("/api/location", queryParams);
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    // Send response through ALL active SSE connections
    const response = {
      jsonrpc,
      id,
      result,
    };

    console.error("Sending response:", JSON.stringify(response));

    connections.forEach((connection) => {
      connection.write(`event: message\n`);
      connection.write(`data: ${JSON.stringify(response)}\n\n`);
    });
  } catch (error) {
    console.error("Error handling request:", error);

    const errorResponse = {
      jsonrpc,
      id,
      error: {
        code: -32603,
        message: error.message,
      },
    };

    connections.forEach((connection) => {
      connection.write(`event: message\n`);
      connection.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    });
  }
});

// Start server
app.listen(MCP_PORT, () => {
  console.error(`☕ Brew Coffee MCP Server (SSE) running on http://localhost:${MCP_PORT}`);
  console.error(`\nMCP Endpoint: http://localhost:${MCP_PORT}/sse`);
  console.error(`Message Endpoint: http://localhost:${MCP_PORT}/message`);
  console.error(`Health Check: http://localhost:${MCP_PORT}/health`);
});
