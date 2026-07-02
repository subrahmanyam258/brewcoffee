import axios from 'axios';

const MCP_URL = 'http://localhost:3001/sse';

async function testMCPConnection() {
  try {
    console.log('Testing MCP connection...\n');

    // Connect to SSE endpoint
    const response = await axios({
      method: 'GET',
      url: MCP_URL,
      headers: {
        'Accept': 'text/event-stream',
      },
      timeout: 5000
    });

    console.log('✅ Successfully connected to MCP server');
    console.log('Status:', response.status);
    console.log('\nTo see available tools, use the MCP Inspector:');
    console.log('npx @modelcontextprotocol/inspector http://localhost:3001/sse');

  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
  }
}

testMCPConnection();
