# Deploy Brew Coffee MCP Server to Render

## Quick Deploy Steps

### 1. Push Code to GitHub
```bash
cd "/Users/Subrahmanyam.D/Documents/Axis collections/brewCoffee"
git add .
git commit -m "Add Render configuration"
git push origin main
```

### 2. Deploy on Render

#### Option A: Using Blueprint (render.yaml) - RECOMMENDED
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create both services:
   - `brew-coffee-api` (main API)
   - `brew-coffee-mcp-server` (MCP server)

#### Option B: Manual Web Service Creation
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `brew-coffee-mcp-server`
   - **Root Directory**: `mcp-server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:http`
   - **Instance Type**: Free

### 3. Configure Environment Variables (if needed)

In Render dashboard for the MCP service, add:
- `BASE_URL`: URL of your main coffee API (if deployed separately)
- `NODE_ENV`: `production`

### 4. Get Your MCP Endpoint

After deployment completes, Render will provide a URL like:
```
https://brew-coffee-mcp-server.onrender.com
```

Your MCP endpoint will be:
```
https://brew-coffee-mcp-server.onrender.com/mcp
```

### 5. Test Your Deployed MCP Server

```bash
# Health check
curl https://brew-coffee-mcp-server.onrender.com/health

# List tools
curl -X POST https://brew-coffee-mcp-server.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Register with MCP Client

Use this URL in your MCP client configuration:
```
https://brew-coffee-mcp-server.onrender.com/mcp
```

## Notes

- Free tier may spin down after inactivity (cold starts ~30 seconds)
- Upgrade to paid tier for always-on service
- Health check endpoint helps keep service warm
