# Live Tracking Debug Guide

## Critical Fixes Made

### 1. **Auto-Start Live Tracking in WorkerSettings**
- Workers now **automatically enable live tracking** when they navigate to WorkerSettings
- Live tracking status is visually displayed with 🟢 Active / ⚪ Inactive indicator
- Socket connection status is shown (Connected / Disconnected)
- Console logs track every geolocation update and socket emission

### 2. **Enhanced Logging for Debugging**
- **Backend Socket Logs**: Every location update, connection, and broadcast is logged
- **Frontend Console Logs**: Worker geolocation updates and socket events are logged
- **MapView Socket Logs**: All real-time updates received are logged with timestamps

### 3. **Socket Connection Debugging**
- Socket connection status indicators on both Worker and Client sides
- Detailed console output for authentication, connection, and data flow

## How the System Should Work

### Worker Flow
```
1. Worker logs in
2. Navigate to WorkerSettings page
3. ✅ Auto-start live tracking begins
4. Browser requests geolocation permission (if first time)
5. ✅ Geolocation accepted → watchPosition starts
6. ✅ Every 5 seconds: Current location → Socket.emit('update-location')
7. ✅ Backend receives → Updates DB → Broadcasts 'worker-location-updated'
8. ✅ Clients receive broadcast → Map markers update in real-time
```

### Client Flow
```
1. Client logs in
2. View Dashboard or click "Track Live Location" for a hired worker
3. ✅ Map shows client's location (blue marker)
4. ✅ Worker marker updates in real-time as they move
5. ✅ Distance and arrival time update continuously
```

## Testing Checklist

### Phase 1: Worker Setup (5 minutes)

**On Worker Device/Browser:**

1. Open browser DevTools (F12) → Console tab
2. Log in as a **worker** account
3. Navigate to `/worker-settings`
4. Check console for these logs:
   ```
   [Worker] ✅ Socket connected. Worker ID: ...
   [Worker] 📍 Initial location: {lat: XX.XXXX, lng: XX.XXXX}
   [Worker] 🚀 Starting live tracking from {lat: XX.XXXX, lng: XX.XXXX}
   [Worker] 📍 Location update: {lat: XX.XXXX, lng: XX.XXXX} | Accuracy: XXXm
   [Worker] 📡 Emitting update-location to server
   ```
5. **Expected**: Console shows repeating location updates every 5 seconds
6. **Check Page**: You should see:
   - ✅ Server Connection: Active
   - 🟢 Live Tracking: ACTIVE
   - Current Location coordinates displayed
   - Last updated timestamp

### Phase 2: Backend Verification (2 minutes)

**In Backend Terminal:**

1. Stop backend if running: `Ctrl+C`
2. Start backend: `npm start`
3. Watch for these logs when worker connects:
   ```
   [Socket] ✅ New connection: John (worker) [Socket ID: ...]
   [Socket] 👤 Worker John joined room: worker_...
   [Socket] 📬 Joined user room: user_...
   ```
4. When location updates are sent:
   ```
   [Socket] 📍 Received location update from worker John: 37.7857, -122.4145
   [Socket] 💾 Updated worker ... location in DB
   [Socket] 📡 Broadcasting worker-location-updated to all clients
   ```

### Phase 3: Client Map Verification (5 minutes)

**On Client Device/Browser:**

1. Log in as a **client** account (different browser/device is best)
2. Open DevTools Console
3. Navigate to `/dashboard` or `/map?workerId=<worker_id>`
4. Check console for:
   ```
   [MapView] ✅ Socket connected
   [MapView] 📍 Worker location updated: {workerId: ..., location: {...}}
   ```
5. **On the Map**, you should see:
   - Your location marker (blue) - updates continuously
   - Worker marker (green if available, red if busy) - updates as they move
   - Distance updates (e.g., "1.2 km", "50 m")
   - "Booked Worker" panel shows the tracked worker (if viewing with ?workerId param)

### Phase 4: Live Hire + Tracking (5 minutes)

**Worker and Client Together:**

1. **Client**: Go to Dashboard
2. **Client**: Click "Hire" on a worker
3. **Worker**: Check WorkerSettings for hire notification (optional enhancement)
4. **Worker**: Accept the hire (in UserHires or via notification)
5. **Client**: Go to "Your Hires" → Find accepted hire
6. **Client**: Click "Track Live Location"
7. **Client**: Map loads with worker's location
8. **Worker**: Move around (walk, drive, etc.)
9. **Expected**: 
   - Worker marker moves on client's map in real-time
   - Distance decreases as they get closer
   - Markers update every 5 seconds max

## Troubleshooting

### Issue: "Server Connection: Offline"
**Cause**: Socket not connecting to backend
**Fix**:
1. Verify backend is running: `npm start` in backend folder
2. Check `VITE_API_URL` in frontend `.env` or `vite.config.js`
3. Verify token is valid in localStorage
4. Check browser Console for connection errors

### Issue: "Live Tracking: INACTIVE"
**Cause**: Geolocation permission denied or browser not asking
**Fix**:
1. Check browser geolocation permission:
   - Chrome: Settings → Privacy → Site settings → Location
   - Firefox: Permissions → Locations
   - Safari: Developer → Preferences → Experimental Features
2. Make sure to click "Allow" when browser asks
3. Grant "While Using" permission, not just "Only This Time"

### Issue: Worker location not updating on map
**Cause**: Socket event not reaching clients
**Verification**:
1. **Backend console**: Do you see "[Socket] 📡 Broadcasting worker-location-updated"?
   - NO → Worker not emitting locations (check worker's browser console)
   - YES → Continue to next step
2. **Client console**: Do you see "[MapView] 📍 Worker location updated"?
   - NO → Event not reaching client (network/socket issue)
   - YES → Map should be updating (check if markers are actually moving)

### Issue: All workers at San Francisco (default location)
**Cause**: Workers never updated their locations from DB default [0, 0]
**Fix**:
1. Enable live tracking on at least one worker
2. Wait 10 seconds for location to broadcast
3. Check backend logs for "[Socket] 💾 Updated worker ... location in DB"
4. Query MongoDB to verify worker location changed:
   ```bash
   mongo serveasse
   db.workers.find({}, {location: 1})
   ```
   Should show realistic coordinates, not [0, 0]

### Issue: Accuracy showing as very large (5000m+)
**Cause**: Browser returning approximate location instead of exact GPS
**Fix**:
1. Ensure device has GPS enabled
2. Enable "High Accuracy" mode (should be automatic with `enableHighAccuracy: true`)
3. On mobile: Turn on WiFi + Cellular location services
4. On desktop: Browser may not have GPS hardware

## Manual Testing Command

### Test location updates directly (Backend Terminal):

```bash
# Get a worker ID first
mongo serveasse
db.workers.findOne({}, {_id: 1, name: 1})
# Copy the _id

# Exit mongo and run test
node backend/test-location.js
```

### Check database directly:

```bash
# See all worker locations
mongo serveasse
db.workers.find({}, {name: 1, location: 1, lastLocationUpdate: 1})

# See specific worker
db.workers.findOne({_id: ObjectId("YOUR_WORKER_ID")}, {name: 1, location: 1, lastLocationUpdate: 1})
```

## What You Should See

### Console Output (Worker)
```
[Worker] ✅ Socket connected. Worker ID: 60d5ec49c0c3...
[Worker] 📍 Initial location: {lat: 37.7749, lng: -122.4194}
[Worker] 🚀 Starting live tracking from {lat: 37.7749, lng: -122.4194}
[Worker] 📍 Location update: {lat: 37.7749, lng: -122.4194} | Accuracy: 5m
[Worker] 📡 Emitting update-location to server
[Worker] 📍 Location update: {lat: 37.7753, lng: -122.4194} | Accuracy: 5m
[Worker] 📡 Emitting update-location to server
...repeats every 5 seconds
```

### Console Output (Backend)
```
[Socket] ✅ New connection: John (worker) [Socket ID: abc123]
[Socket] 👤 Worker John joined room: worker_60d5ec49...
[Socket] 📬 Joined user room: user_user123
[Socket] 📍 Received location update from worker John: 37.7749, -122.4194
[Socket] 💾 Updated worker 60d5ec49... location in DB
[Socket] 📡 Broadcasting worker-location-updated to all clients
```

### Console Output (Client/MapView)
```
[MapView] ✅ Socket connected
[MapView] 📍 Worker location updated: {workerId: 60d5ec49..., location: {type: 'Point', coordinates: [-122.4194, 37.7749]}}
```

## After Testing

If everything works:
1. ✅ Live tracking system is operational
2. ✅ Distance calculation is working
3. ✅ Real-time map updates are flowing
4. ✅ Clients can track hired workers

If issues persist:
1. Share console logs from both browser and backend
2. Check if workers are actually moving (or just standing still)
3. Verify worker account has proper role: `role === 'worker'`
4. Confirm hire relationship exists between client and worker

## Next Steps

1. **Real Testing**: Get actual users on both devices
2. **Mobile Testing**: Verify on actual phones with GPS
3. **Reliability**: Test for 30+ minutes to see if connection drops
4. **UI Improvements**: Add more visual feedback for live tracking status
5. **Performance**: Monitor socket memory usage with many concurrent workers
