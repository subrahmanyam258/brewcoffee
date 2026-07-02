# Brew Coffee API

A Node.js Express API for managing coffee franchise menu, hours, and locations.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Menu API
Get the complete menu (same across all locations).

**Endpoint:** `GET /api/menu`

**cURL:**
```bash
curl http://localhost:3000/api/menu
```

---

### 2. Hours API
Get operating hours for all days or a specific day.

**Endpoint:** `GET /api/hours`

**Get all hours:**
```bash
curl http://localhost:3000/api/hours
```

**Get hours for a specific day:**
```bash
curl "http://localhost:3000/api/hours?day=Monday"
curl "http://localhost:3000/api/hours?day=Friday"
curl "http://localhost:3000/api/hours?day=Sunday"
```

---

### 3. Location API
Get location details by city name.

**Endpoint:** `GET /api/location?city=<city_name>`

**cURL Examples:**
```bash
# New York location
curl "http://localhost:3000/api/location?city=New%20York"

# Los Angeles location
curl "http://localhost:3000/api/location?city=Los%20Angeles"

# Chicago location
curl "http://localhost:3000/api/location?city=Chicago"

# San Francisco location
curl "http://localhost:3000/api/location?city=San%20Francisco"

# Seattle location
curl "http://localhost:3000/api/location?city=Seattle"
```

---

## Available Cities
- New York
- Los Angeles
- Chicago
- San Francisco
- Seattle

## Response Format

All responses follow this structure:
```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```
