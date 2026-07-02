const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory data store (replace with database in production)
const menuData = {
  coffee: [
    { id: 1, name: 'Espresso', price: 2.99, category: 'Hot Coffee' },
    { id: 2, name: 'Cappuccino', price: 4.49, category: 'Hot Coffee' },
    { id: 3, name: 'Latte', price: 4.99, category: 'Hot Coffee' },
    { id: 4, name: 'Americano', price: 3.49, category: 'Hot Coffee' },
    { id: 5, name: 'Iced Coffee', price: 3.99, category: 'Cold Coffee' },
    { id: 6, name: 'Cold Brew', price: 4.49, category: 'Cold Coffee' }
  ],
  food: [
    { id: 7, name: 'Croissant', price: 3.49, category: 'Pastries' },
    { id: 8, name: 'Blueberry Muffin', price: 3.99, category: 'Pastries' },
    { id: 9, name: 'Avocado Toast', price: 7.99, category: 'Breakfast' },
    { id: 10, name: 'Bagel with Cream Cheese', price: 4.99, category: 'Breakfast' }
  ]
};

const hoursData = {
  Monday: { open: '06:00', close: '20:00' },
  Tuesday: { open: '06:00', close: '20:00' },
  Wednesday: { open: '06:00', close: '20:00' },
  Thursday: { open: '06:00', close: '20:00' },
  Friday: { open: '06:00', close: '22:00' },
  Saturday: { open: '07:00', close: '22:00' },
  Sunday: { open: '07:00', close: '19:00' }
};

const locationsData = {
  'new york': {
    city: 'New York',
    address: '123 Broadway Ave, New York, NY 10001',
    phone: '(212) 555-0100',
    coordinates: { lat: 40.7580, lng: -73.9855 }
  },
  'los angeles': {
    city: 'Los Angeles',
    address: '456 Sunset Blvd, Los Angeles, CA 90028',
    phone: '(310) 555-0200',
    coordinates: { lat: 34.0522, lng: -118.2437 }
  },
  'chicago': {
    city: 'Chicago',
    address: '789 Michigan Ave, Chicago, IL 60611',
    phone: '(312) 555-0300',
    coordinates: { lat: 41.8781, lng: -87.6298 }
  },
  'san francisco': {
    city: 'San Francisco',
    address: '321 Market St, San Francisco, CA 94102',
    phone: '(415) 555-0400',
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  'seattle': {
    city: 'Seattle',
    address: '654 Pike St, Seattle, WA 98101',
    phone: '(206) 555-0500',
    coordinates: { lat: 47.6062, lng: -122.3321 }
  }
};

// API Routes

// 1. Menu API - Returns the complete menu
app.get('/api/menu', (req, res) => {
  try {
    res.json({
      success: true,
      data: menuData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu',
      error: error.message
    });
  }
});

// 2. Hours API - Returns operating hours, optionally filtered by day
app.get('/api/hours', (req, res) => {
  try {
    const { day } = req.query;

    if (day) {
      const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      const dayHours = hoursData[capitalizedDay];

      if (!dayHours) {
        return res.status(404).json({
          success: false,
          message: `Invalid day: ${day}. Please use Monday-Sunday.`
        });
      }

      return res.json({
        success: true,
        data: {
          day: capitalizedDay,
          hours: dayHours
        }
      });
    }

    res.json({
      success: true,
      data: hoursData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hours',
      error: error.message
    });
  }
});

// 3. Location API - Returns location details by city (or all locations)
app.get('/api/location', (req, res) => {
  try {
    const { city } = req.query;

    // If no city provided, return all locations
    if (!city) {
      return res.json({
        success: true,
        data: Object.values(locationsData)
      });
    }

    const normalizedCity = city.toLowerCase();
    const locationData = locationsData[normalizedCity];

    if (!locationData) {
      return res.status(404).json({
        success: false,
        message: `Location not found for city: ${city}. Available cities: New York, Los Angeles, Chicago, San Francisco, Seattle`
      });
    }

    res.json({
      success: true,
      data: locationData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`☕ Brew Coffee API is running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET /api/menu - Get full menu`);
  console.log(`  GET /api/hours - Get operating hours (add ?day=Monday for specific day)`);
  console.log(`  GET /api/location?city=<city> - Get location by city`);
});

module.exports = app;
