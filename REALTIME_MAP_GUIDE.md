# Real-Time Service Availability Map - Complete Guide

## 🎯 What Does This Map Do?

The Real-Time Service Availability Map is an interactive Google Map that displays all available service providers (workers) near a user's location. Here's what happens:

### **Core Features:**

1. **📍 Provider Display**
   - Shows all service providers as color-coded markers on a Google Map
   - Green markers = Available providers (ready to work)
   - Red markers = Busy providers (currently working)
   - Each marker shows the provider's exact location

2. **🔄 Real-Time Updates**
   - When a provider's location changes → Marker moves instantly
   - When a provider becomes available/busy → Marker color changes instantly
   - Uses WebSocket for instant communication (no page refresh needed)

3. **👤 Provider Details**
   - Click any marker to see detailed popup with:
     - Provider name & phone number
     - Skills (plumbing, electrical, carpentry, etc.)
     - Star rating & number of reviews
     - Hourly rate
     - Current availability status

4. **📞 One-Click Booking**
   - Click "Book Now" button to send a booking request directly
   - Only enabled when provider is available

5. **📊 Map Legend**
   - Shows what each color means
   - Displays count of available vs total providers

---

## 🛠️ How It Works - Step by Step

### **Step 1: User Opens Map**
```
User navigates to /map page
  ↓
Component loads Google Maps JavaScript API
  ↓
Browser asks for user's location (geolocation)
  ↓
API call to backend: GET /api/workers?lat=USER_LAT&lng=USER_LNG
```

### **Step 2: Fetch Providers**
```
Backend receives location request
  ↓
Database finds all workers near user (geospatial query)
  ↓
Returns worker data: [
  {
    _id: "123",
    name: "John Smith",
    location: { coordinates: [-122.4194, 37.7749] },
    available: true,
    rating: 4.8,
    skills: ["Plumbing", "Installation"],
    pricePerHour: 45
  },
  ...
]
  ↓
Frontend converts to marker format and displays on map
```

### **Step 3: Real-Time WebSocket Connection**
```
Frontend connects to backend WebSocket
  ↓
Listens for events:
  - 'worker-location-updated' → Move marker on map
  - 'worker-availability-changed' → Change marker color
  ↓
When worker location changes on backend:
Backend emits: { workerId: "123", location: {lat, lng} }
  ↓
Frontend receives and updates marker position instantly
```

### **Step 4: User Clicks a Marker**
```
User clicks marker on map
  ↓
Popup shows: Provider name, skills, rating, phone, price
  ↓
User can:
  - View all provider details
  - Click "Book Now" to request service
```

### **Step 5: Book a Provider**
```
User clicks "Book Now"
  ↓
Frontend calls: POST /api/workers/hire
  ↓
Backend creates booking request
  ↓
Toast notification: "Booking request sent to John!"
```

---

## ⚙️ Technical Architecture

### **Frontend Components**

```
MapView.jsx (Master Component)
  │
  ├─ Google Maps API Loader
  │  ├─ Loads map JavaScript library
  │  ├─ Authenticates with API key
  │  └─ Provides map rendering
  │
  ├─ WebSocket Connection
  │  ├─ Connects to backend via Socket.IO
  │  ├─ Listens for location updates
  │  └─ Listens for availability changes
  │
  ├─ Geolocation API
  │  └─ Gets user's current location (lat/lng)
  │
  ├─ Markers & Info Windows
  │  ├─ Marker = Clickable provider icon
  │  ├─ Color = Green (available) or Red (busy)
  │  └─ Info Window = Popup with provider details
  │
  └─ API Integration
     └─ Calls /api/workers to fetch provider data
```

### **Backend Integration**

The frontend makes these API calls:

```javascript
// 1. Get all workers near a location
GET /api/workers?lat=37.7749&lng=-122.4194&available=true

// 2. Hire a specific worker
POST /api/workers/hire
Body: { workerId: "123" }

// 3. WebSocket events (real-time):
socket.on('worker-location-updated', (data) => {...})
socket.on('worker-availability-changed', (data) => {...})
```

---

## 🚀 Setup Instructions

### **Step 1: Get Google Maps API Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Maps JavaScript API"
4. Go to Credentials → Create API Key
5. Copy your API key (looks like: `AIzaSyDyWJOw5r-kLSY8jQ8q8_-4K9L8m9p0q1r`)

### **Step 2: Add API Key to Environment**

Edit `.env.local` in the `frontend` folder:

```env
VITE_API_URL=http://localhost:5001
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

Replace `YOUR_ACTUAL_API_KEY_HERE` with your real API key.

### **Step 3: Ensure Backend is Running**

Your backend must:
- ✅ Have `/api/workers` endpoint (already exists)
- ✅ Have WebSocket setup (Socket.IO already configured)
- ✅ Have Worker model with location field (already exists)

### **Step 4: Test the Map**

1. Start frontend: `npm run dev` (in frontend folder)
2. Start backend: `npm run dev` (in backend folder)
3. Open browser: `http://localhost:5173/map`
4. You should see:
   - Map centered on your location
   - Colored markers for providers
   - Legend showing available/busy count

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MapView.jsx Component                                │  │
│  │ ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │ │ Google Maps  │  │ WebSocket    │  │ Geolocation│  │  │
│  │ │ Displays map │  │ Listens for  │  │ Gets user  │  │  │
│  │ │ & markers    │  │ real-time    │  │ location   │  │  │
│  │ │              │  │ updates      │  │            │  │  │
│  │ └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ API Calls          ↑ WebSocket Events           │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            ↓                      ↑
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Express.js + Socket.IO                               │  │
│  │ ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │ │ /api/workers │  │ WebSocket    │  │ Database   │  │  │
│  │ │ endpoint     │  │ broadcasts   │  │ MongoDB    │  │  │
│  │ │ fetches      │  │ location &   │  │ stores all │  │  │
│  │ │ workers      │  │ availability │  │ worker     │  │  │
│  │ │ from DB      │  │ changes      │  │ data       │  │  │
│  │ └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Marker Colors & What They Mean

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | Available | Provider is ready to accept jobs |
| 🔴 Red | Busy | Provider is currently working on a job |

**How Colors Update:**
- When provider changes status in their dashboard
- Backend broadcasts via WebSocket
- Frontend receives event and updates marker color instantly
- No page refresh needed

---

## 📱 User Interaction Flow

```
1. User opens map page
   ↓
2. Browser asks "Can we access your location?"
   - User clicks "Allow"
   ↓
3. Map centers on user's location
   ↓
4. Providers nearby appear as colored markers
   ↓
5. User clicks on a marker
   ↓
6. Popup shows provider details:
   - Name, skills, rating, price/hour
   - "Book Now" button
   ↓
7. User clicks "Book Now"
   ↓
8. Request sent to backend
   ↓
9. Success message shown
   ↓
10. Provider receives notification
```

---

## 🔧 Customization Options

### **Change Default Center**
```javascript
const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco
// Change to your city
```

### **Change Zoom Level**
```javascript
zoom={14} // 1-20, higher = closer
```

### **Change Marker Color**
```javascript
const getMarkerColor = (available) => {
  return available ? '#22c55e' : '#ef4444'; // Green/Red
  // Change to your preferred colors
};
```

### **Filter Providers**
```javascript
const response = await api.get('/api/workers', {
  params: {
    lat, lng,
    available: true,        // Only show available
    minRating: 4.5,         // Minimum rating
    maxPrice: 100,          // Maximum price/hour
    search: 'plumbing'      // Search by skill
  }
});
```

---

## 🐛 Troubleshooting

### **Map Not Showing**
- ❌ **Problem:** API key is invalid or missing
- ✅ **Solution:** Add valid key to `.env.local`

### **Markers Not Appearing**
- ❌ **Problem:** No workers in database
- ✅ **Solution:** Seed test data or check if workers have location data

### **Real-Time Updates Not Working**
- ❌ **Problem:** WebSocket connection failed
- ✅ **Solution:** Ensure backend is running on correct port

### **Geolocation Not Working**
- ❌ **Problem:** Browser doesn't have permission
- ✅ **Solution:** Map falls back to default center (San Francisco)

---

## 📚 API References

### **Get Workers**
```javascript
GET /api/workers?lat=37.7749&lng=-122.4194

Response:
[
  {
    _id: "123",
    name: "John Smith",
    skills: ["Plumbing"],
    rating: 4.8,
    pricePerHour: 45,
    available: true,
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749]
    }
  }
]
```

### **Hire Worker**
```javascript
POST /api/workers/hire
Body: { workerId: "123" }

Response:
{ success: true, message: "Booking request sent!" }
```

### **WebSocket Events**

**Listen for location updates:**
```javascript
socket.on('worker-location-updated', (data) => {
  // data = { workerId: "123", location: {lat, lng} }
});
```

**Listen for availability changes:**
```javascript
socket.on('worker-availability-changed', (data) => {
  // data = { workerId: "123", available: true/false }
});
```

---

## ✅ Checklist for Running the Map

- [ ] Google Maps API key obtained
- [ ] `.env.local` updated with API key
- [ ] Backend is running (`npm run dev`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Worker data exists in database
- [ ] WebSocket connection established (check console)
- [ ] Map displays without errors
- [ ] Markers appear on map
- [ ] Clicking markers shows popup
- [ ] Booking works

---

## 🔒 Security Notes

✅ **Good Practices Used:**
- API key only in environment variables (not committed to git)
- WebSocket authenticated with JWT token
- API calls use interceptor (auto-attaches token)
- User location not stored (only used for proximity search)

⚠️ **For Production:**
- Use Google Maps API key restrictions
- Implement rate limiting on `/api/workers`
- Add input validation for location coordinates
- Consider using Maps Platform with billing alerts

---

## 📞 Support

If the map isn't working:
1. Check browser console for errors (`F12` → Console)
2. Verify API key is valid
3. Ensure backend is running on port 5001
4. Check that workers have location data
5. Look at network tab to see if API calls succeed

