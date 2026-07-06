# Email OTP Configuration Guide

## What Was Fixed

✅ Fixed SMTP configuration from Outlook to **Gmail**
✅ Added email transporter verification
✅ Improved error logging for debugging
✅ Better error messages

---

## Current Configuration in Your .env

```
EMAIL_USER=dixitaryan361@gmail.com
EMAIL_PASS=kyri tbvx emhx xyiv
```

Your email configuration is now set to use **Gmail SMTP** (smtp.gmail.com).

---

## How to Verify Gmail Credentials

### Step 1: Check Your Google Account
1. Go to https://myaccount.google.com/
2. Click "Security" in the left menu
3. Look for "App passwords" section

**Note:** You need 2-Step Verification enabled first

### Step 2: Verify the App Password
- The password in your .env (`kyri tbvx emhx xyiv`) should be a **16-character Google App Password**
- It's NOT your regular Gmail password
- If you don't have one, create it:
  1. Go to https://myaccount.google.com/apppasswords
  2. Select "Mail" and "Windows Computer" (or your OS)
  3. Google will generate a 16-character password
  4. Copy and paste it in `.env` as `EMAIL_PASS`

### Step 3: Verify Email Configuration
```env
# These should match:
EMAIL_USER=dixitaryan361@gmail.com
EMAIL_PASS=kyri tbvx emhx xyiv
FRONTEND_URL=http://localhost:5173
```

---

## Testing the Email Configuration

### Method 1: Check Backend Logs (Recommended)

1. **Start your backend server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

2. **Try to send OTP from frontend**
   - Go to http://localhost:5173/login
   - Click "Create an account"
   - Enter email and click "Send OTP"

3. **Check the terminal output:**
   - You should see either:
     - ✅ `Email transporter is ready to send emails` (on startup)
     - ✅ `OTP Email sent successfully: ...` (when sending OTP)
     - ❌ `Email transporter verification failed: ...` (if there's an error)

4. **If you see an error:**
   - Copy the full error message
   - Check that your Google App Password is correct
   - Verify 2-Step Verification is enabled on your Google account

### Method 2: Test with Curl

```bash
# First, get a token by logging in or creating an account

# Then test the API:
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "your-email@gmail.com",
    "role": "client"
  }'
```

Expected response if successful:
```json
{
  "success": true,
  "message": "OTP sent successfully. Please check your email.",
  "data": { "email": "your-email@gmail.com" }
}
```

---

## Common Issues & Solutions

### ❌ "Failed to send OTP email"

**Issue 1: Incorrect App Password**
- Solution: Generate a new Google App Password at https://myaccount.google.com/apppasswords
- Copy the exact 16-character password to `.env` (including spaces)

**Issue 2: 2-Step Verification not enabled**
- Solution: Enable 2-Step Verification at https://myaccount.google.com/security
- Then generate an App Password

**Issue 3: EMAIL_USER or EMAIL_PASS not set in .env**
- Solution: Check your `.env` file:
  ```env
  EMAIL_USER=your-gmail@gmail.com
  EMAIL_PASS=your-app-password-here
  ```
- Restart your backend server after changing `.env`

**Issue 4: Less secure app access disabled**
- Gmail no longer allows "less secure" apps
- You MUST use an App Password, not your regular Gmail password
- Follow Step 1-2 above

### ❌ "Failed to send email" on password reset

- Same solutions as above
- Make sure `FRONTEND_URL` is set correctly in `.env`

### ❌ Email received but OTP is wrong

- Check the backend logs - the OTP should be logged when sent
- OTP expires after 5 minutes
- Maximum 3 failed attempts allowed

---

## Detailed Error Debugging

If you get an error, check the backend logs for details:

```
[Example Error Output]
OTP Email sending failed - Details: {
  error: "Invalid login: 535-5.7.8 Username and password not accepted",
  email: "user@example.com",
  emailUser: "dixitaryan361@gmail.com",
  timestamp: "2026-04-18T10:30:45.123Z"
}
```

This error means your App Password is incorrect.

---

## Step-by-Step Setup for New Email Account

If you want to use a different email account:

### 1. Get Gmail Account Ready
- Enable 2-Step Verification
- Create App Password at https://myaccount.google.com/apppasswords

### 2. Update .env File
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

### 3. Restart Backend
```bash
npm run dev
```

### 4. Test
- Try sending OTP from frontend
- Check backend logs for confirmation

---

## Security Notes

✅ **Good practices:**
- Using Google App Password (not regular password)
- Never sharing `.env` file
- Email credentials in environment variables

⚠️ **For production:**
- Use environment variables on hosting platform
- Never commit `.env` to git
- Consider email service like SendGrid or AWS SES
- Add rate limiting (already done in your code)

---

## Files Modified

✅ `backend/utils/email.js` - Changed to Gmail SMTP + added verification + better error handling
✅ `backend/controllers/authController.js` - Improved error logging

---

## Next Steps

1. Verify your Google App Password is correct
2. Restart backend server: `npm run dev`
3. Try sending OTP from frontend
4. Check backend logs for success/error messages
5. Check your email inbox for OTP

If you still have issues, the backend logs will show the exact error preventing email from sending.
