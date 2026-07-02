#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const BASE_URL = "https://pmz9p6sb-3000.inc1.devtunnels.ms";
const TIMEOUT = 5000;

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

// Create MCP server
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
          "Fetches detailed location information. Without parameters, returns all franchise locations. With the optional 'city' parameter, returns details for a specific city.",
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
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Brew Coffee MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
