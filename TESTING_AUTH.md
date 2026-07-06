# Authentication Testing Guide

## Quick Start Testing

### 1. Test Basic Login Flow
```bash
# Start backend: npm start (in backend folder)
# Start frontend: npm run dev (in frontend folder)

1. Go to http://localhost:5173/login
2. Click "Create an account"
3. Fill in: Name, Email, select role (Client/Worker)
4. Click "Send OTP"
5. Check email for OTP code
6. Enter OTP and verify
7. Set password
8. You should be logged in and redirected to dashboard
```

### 2. Test Route Protection
```
1. Login as a client user
2. Try accessing /worker-dashboard
   ✓ Should redirect to /dashboard
3. Try accessing /map
   ✓ Should show the map (client access allowed)
4. Logout and try accessing /dashboard
   ✓ Should redirect to /login
```

### 3. Test Token Verification on App Load
```
1. Login to the app (token saved in localStorage)
2. Refresh the page (Cmd+R or F5)
3. You should stay logged in (user data appears)
4. Check browser Console → Network tab
   ✓ Should see GET /api/auth/verify-token call
   ✓ Response should contain your user data
```

### 4. Test Token Expiration
```
Currently: JWT tokens expire in 24 hours

To test manually:
1. Login and note the token in localStorage
2. In browser DevTools → Application → Storage → LocalStorage
3. Modify the token (change a few characters)
4. Refresh the page
5. You should be logged out and redirected to /login
```

### 5. Test Logout
```
1. Login to the app
2. Click "Log out" button in navbar
3. Should be redirected to home page
4. Refresh the page
5. Should NOT see user data (token cleared)
6. Try accessing /dashboard
   ✓ Should redirect to /login
```

### 6. Test Role-Based Access
```
As a WORKER:
- Can access: /worker-dashboard, /worker-settings, /map
- Cannot access: /dashboard, /my-hires (redirects to /dashboard)

As a CLIENT:
- Can access: /dashboard, /my-hires, /map
- Cannot access: /worker-dashboard, /worker-settings (redirects to /dashboard)
```

## API Endpoints to Test

### Test Token Verification
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/auth/verify-token
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "isVerified": true
    }
  }
}
```

### Test with Invalid Token
```bash
curl -H "Authorization: Bearer INVALID_TOKEN" \
  http://localhost:5001/api/auth/verify-token
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid token. Please log in again."
}
```

### Test Logout
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/auth/logout
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

## Browser DevTools Testing

### Check localStorage
```javascript
// In browser Console:
localStorage.getItem('token')    // Should show JWT token
localStorage.getItem('user')      // Should show user JSON
```

### Decode JWT Token (in Console)
```javascript
const token = localStorage.getItem('token');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log(payload);
// Shows: { user: { id: "..." }, iat: ..., exp: ... }
```

### Monitor API Calls
1. Open DevTools → Network tab
2. Reload page
3. Look for requests:
   - `GET /api/auth/verify-token` - Token verification on load
   - `POST /api/auth/logout` - When clicking logout
   - `401` responses - When token is invalid

## Common Issues & Solutions

### Issue: Token not persisting after refresh
**Solution:** 
- Check if localStorage is enabled in browser
- Verify `/api/auth/verify-token` endpoint is being called (Network tab)
- Check backend logs for errors

### Issue: Getting logged out unexpectedly
**Solution:**
- Check token expiration time (currently 24 hours)
- Check browser console for error messages
- Verify token wasn't corrupted in localStorage

### Issue: Can't access worker routes as worker
**Solution:**
- Verify your role is set correctly in the database
- Check the role returned from `/api/auth/verify-token`
- Ensure ProtectedRoute component has `requiredRole="worker"`

### Issue: Infinite redirect loop
**Solution:**
- Clear localStorage: `localStorage.clear()`
- Clear browser cache
- Check browser console for error messages
- Restart both frontend and backend servers

## Performance Notes

✅ Token verification is lightweight (single API call on app load)
✅ Routes protected client-side (instant redirects)
✅ No additional API calls unless accessing protected resources
✅ Loading state shown while verifying auth (prevents flash of wrong content)

## Next Steps

1. ✅ Test all scenarios above
2. ✅ Check backend logs for any errors
3. ✅ Monitor Network tab for failed API calls
4. Consider upgrading to httpOnly cookies (more secure)
5. Consider implementing refresh token mechanism (longer sessions)

---

For more details, see `AUTHENTICATION_FIXES.md`
