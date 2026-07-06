# Real-Time Map - Quick Setup & Testing Guide

## ⚡ Quick Start (5 Minutes)

### **Step 1: Get Google Maps API Key**

1. Open https://console.cloud.google.com in your browser
2. Create a new project (or select existing one)
3. Search for "Maps JavaScript API" and enable it
4. Go to "Credentials" in the left menu
5. Click "Create Credentials" → "API Key"
6. Copy the generated key (looks like: `AIzaSyDyWJOw5r-kLSY8jQ8q8_-4K9L8m9p0q1r`)

### **Step 2: Add API Key to Frontend**

Edit `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:5001
VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
```

Replace `YOUR_KEY_HERE` with your actual key from Step 1.

### **Step 3: Add Test Workers to Database**

Open your terminal and run:
```bash
cd backend
# You can use curl or Postman to call this endpoint:
# POST http://localhost:5001/api/workers/seed
# This requires authentication, so you need to login first
```

Or use MongoDB Compass to insert test workers directly:
```javascript
db.workers.insertMany([
  {
    name: "John Smith",
    skills: ["Plumbing", "Installation"],
    rating: 4.8,
    pricePerHour: 45,
    available: true,
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749]  // [longitude, latitude]
    }
  },
  {
    name: "Maria Garcia",
    skills: ["Electrical", "Wiring"],
    rating: 4.9,
    pricePerHour: 50,
    available: true,
    location: {
      type: "Point",
      coordinates: [-122.4094, 37.7849]
    }
  }
])
```

### **Step 4: Start Both Servers**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Output: Server running on port 5001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Output: Local: http://localhost:5173/
```

### **Step 5: Test the Map**

1. Open http://localhost:5173/login
2. Login or create account
3. Navigate to `/map` or click "Live Map" in navbar
4. You should see:
   - ✅ Map loaded with your location (or default: San Francisco)
   - ✅ Colored markers for providers
   - ✅ Legend showing available/busy count
   - ✅ Click marker to see popup with provider details

---

## 🧪 Testing Real-Time Updates

### **Test 1: Location Updates**

1. Open map in browser
2. Open worker dashboard (or simulate worker location update)
3. Worker updates location via API call:
   ```bash
   curl -X POST http://localhost:5001/api/workers/availability \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"available": true, "lat": 37.8, "lng": -122.5}'
   ```
4. Watch marker move in real-time on map ✅

### **Test 2: Availability Changes**

1. Map shows provider as green (available)
2. Worker changes status to "Busy" in dashboard
3. Marker color changes from green → red ✅
4. Try to book disabled worker → Button shows "Currently Busy" ✅

### **Test 3: Booking a Provider**

1. Click on a green (available) marker
2. Popup shows "Book Now" button enabled
3. Click "Book Now"
4. Success toast appears ✅
5. Backend receives booking request ✅

---

## 📊 What's Happening Behind the Scenes

### **Frontend Flow:**
```
1. User visits /map
   ↓
2. Google Maps API loads
   ↓
3. Browser gets user's location (Geolocation API)
   ↓
4. WebSocket connects: io(http://localhost:5001)
   ↓
5. API call: GET /api/workers?lat=37.77&lng=-122.42
   ↓
6. Backend returns array of workers with locations
   ↓
7. Create markers on map for each worker
   ↓
8. Listen for WebSocket events:
   - 'worker-location-updated' → Move marker
   - 'worker-availability-changed' → Change marker color
```

### **Backend Flow:**
```
1. Accept GET /api/workers request
   ↓
2. Query database: Find workers near coordinates
   ↓
3. Return worker array with location data
   ↓
4. When worker updates location:
   - Socket.IO emits: 'worker-location-updated'
   ↓
5. When worker changes status:
   - Socket.IO emits: 'worker-availability-changed'
   ↓
6. All connected clients receive updates instantly
```

---

## 🎯 Component Structure

```
MapView.jsx (Main Component)
├── Google Maps API Integration
│   └── Loads map centered on user location
├── Worker Data
│   ├── Fetches from /api/workers
│   └── Transforms for marker format
├── Markers
│   ├── Color: Green (available) or Red (busy)
│   └── Click shows InfoWindow popup
├── InfoWindow (Popup)
│   ├── Shows provider details
│   ├── Name, skills, rating, price
│   └── "Book Now" button
├── WebSocket Listener
│   ├── Listens for location updates
│   └── Listens for availability changes
└── Helper Functions
    ├── getMarkerColor() - Returns color based on status
    ├── handleHire() - Books a provider
    └── getDemoWorkers() - Test data
```

---

## 🔍 Browser DevTools Debugging

### **Check WebSocket Connection:**
1. Press `F12` → Network tab
2. Filter by "WS" (WebSocket)
3. You should see: `localhost:5001/socket.io`
4. Click it to see real-time messages

### **Check API Calls:**
1. Press `F12` → Network tab
2. Look for `/api/workers` request
3. Status should be 200
4. Response shows worker array

### **Check Console Logs:**
1. Press `F12` → Console tab
2. Should see:
   - `"Email transporter is ready"` (backend)
   - Map loading messages
   - WebSocket connected
   - Worker location updates (real-time)

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Map not showing" | Invalid API key | Replace with real key in `.env.local` |
| "No markers appear" | No workers in DB | Add test workers (see Step 3) |
| "Clicking marker does nothing" | InfoWindow not working | Check browser console for errors |
| "Real-time updates don't work" | WebSocket not connected | Ensure backend running on 5001 |
| "Geolocation prompt not showing" | HTTPS required in production | Works on localhost without HTTPS |
| "Booking button disabled" | Worker not available | Check worker.available = true in DB |

---

## 📝 Environment Variables Reference

**Frontend (.env.local):**
```env
VITE_API_URL=http://localhost:5001              # Backend URL
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_KEY_HERE  # Google Maps API Key
```

**Backend (.env):**
```env
MONGO_URI=mongodb://127.0.0.1:27017/servease
JWT_SECRET=supersecret_jwt_key_replace_me_in_prod
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=5001
FRONTEND_URL=http://localhost:5173
```

---

## ✅ Testing Checklist

- [ ] Google Maps API key obtained and valid
- [ ] `.env.local` updated with API key
- [ ] Backend running on port 5001
- [ ] Frontend running on port 5173
- [ ] Test workers exist in database
- [ ] Map loads without errors
- [ ] User location geolocation works
- [ ] Markers appear on map
- [ ] Marker colors correct (green/red)
- [ ] Clicking marker shows popup
- [ ] Provider details display correctly
- [ ] "Book Now" button works
- [ ] WebSocket real-time updates work
- [ ] Marker moves when location updates
- [ ] Marker color changes when availability changes

---

## 🚀 Next Steps

1. **Customize Map:**
   - Change default center location
   - Adjust zoom level
   - Add custom markers/styling

2. **Add Filters:**
   - Search by skill
   - Filter by rating
   - Filter by price range

3. **Advanced Features:**
   - Draw radius circle around user
   - Show distance to each provider
   - Sort by distance/rating/price
   - Show ETA using Google Maps Directions API

4. **Production:**
   - Get real Google Maps API key
   - Set API key restrictions
   - Deploy to hosting platform
   - Enable HTTPS

---

## 📚 Useful Links

- Google Maps API: https://developers.google.com/maps
- Socket.IO Documentation: https://socket.io/docs
- MongoDB Geospatial: https://docs.mongodb.com/manual/geospatial-queries/
- React Google Maps: https://react-google-maps-api-docs.netlify.app/

---

## 💡 Tips

✅ **Pro Tips:**
- Use browser DevTools to debug WebSocket messages
- Monitor Network tab to see API calls
- Check Console for error messages
- Use MongoDB Compass to verify worker locations
- Test with multiple browser tabs to see real-time updates

⚠️ **Important:**
- API key should NOT be committed to git
- Use `.env.local` (in .gitignore)
- Keep API key secret in production
- Use API key restrictions in Google Cloud Console

