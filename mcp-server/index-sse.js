#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import axios from "axios";

const BASE_URL = "https://pmz9p6sb-3000.inc1.devtunnels.ms";
const TIMEOUT = 5000;
const MCP_PORT = process.env.MCP_PORT || 3001;

// Store active transports by session ID
const activeTransports = new Map();

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
        throw new Error(
          `Failed after ${retries} attempts: ${error.message}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Tools listing endpoint for testing
app.get("/tools", (req, res) => {
  res.json({
    tools: [
      {
        name: "get_menu",
        description: "Retrieves the complete coffee and food menu",
        parameters: {}
      },
      {
        name: "get_hours",
        description: "Returns operating hours",
        parameters: { day: "optional - Monday through Sunday" }
      },
      {
        name: "get_location",
        description: "Fetches location information",
        parameters: { city: "optional - New York, Los Angeles, Chicago, San Francisco, Seattle" }
      }
    ]
  });
});

// Create MCP server factory
function createMCPServer() {
  const server = new Server(
    {
      name: "brew-coffee-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("ListTools request received");
    return {
      tools: [
        {
          name: "get_menu",
          description:
            "Retrieves the complete coffee and food menu with prices and categories. The menu is consistent across all franchise locations and includes hot coffee, cold coffee, pastries, and breakfast items.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_hours",
          description:
            "Returns operating hours for the coffee shop. Without parameters, returns hours for all days of the week (Monday-Sunday). With the optional 'day' parameter, returns hours for a specific day.",
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
            "Fetches detailed location information. Without parameters, returns all franchise locations. With the optional 'city' parameter, returns details for a specific city including full address, phone number, and GPS coordinates.",
          inputSchema: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "Optional city name (e.g., New York, Los Angeles, Chicago, San Francisco, Seattle)",
              },
            },
            additionalProperties: false,
          },
        },
      ],
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`Tool called: ${name}`, args);

    try {
      switch (name) {
        case "get_menu": {
          const result = await makeRequest("/api/menu");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "get_hours": {
          const params = args?.day ? { day: args.day } : {};
          const result = await makeRequest("/api/hours", params);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "get_location": {
          const params = args?.city ? { city: args.city } : {};
          const result = await makeRequest("/api/location", params);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error.message,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// SSE endpoint
app.get("/sse", async (req, res) => {
  console.error("New SSE connection established");

  const server = createMCPServer();
  const transport = new SSEServerTransport("/message", res);

  // Store by a unique identifier - use the response object as key
  const sessionKey = Date.now().toString() + Math.random().toString();
  activeTransports.set(sessionKey, { transport, server });

  req.on("close", () => {
    console.error(`SSE connection closed`);
    activeTransports.delete(sessionKey);
    server.close();
  });

  try {
    await server.connect(transport);
    console.error(`MCP Server connected successfully`);
  } catch (error) {
    console.error("Connection error:", error);
    activeTransports.delete(sessionKey);
  }
});

// Message endpoint - receives messages from client
app.post("/message", express.raw({ type: 'application/json' }), async (req, res) => {
  console.error(`Message received:`, req.body?.toString());

  // The SSEServerTransport should handle this internally
  // We just need to acknowledge receipt
  res.status(200).end();
});

// Start server
app.listen(MCP_PORT, () => {
  console.error(`☕ Brew Coffee MCP Server (SSE) running on http://localhost:${MCP_PORT}`);
  console.error(`\nMCP Endpoint: http://localhost:${MCP_PORT}/sse`);
  console.error(`Health Check: http://localhost:${MCP_PORT}/health`);
  console.error(`Tools List: http://localhost:${MCP_PORT}/tools`);
  console.error(`\nTest with MCP Inspector:`);
  console.error(`  npx @modelcontextprotocol/inspector http://localhost:${MCP_PORT}/sse`);
});
