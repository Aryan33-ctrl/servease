# ServEase Backend

A secure Node.js backend for the ServEase application with authentication, email verification, and user management.

## Features

- User Registration with email validation
- Email verification with OTP
- Secure login with JWT authentication
- Password hashing with bcrypt
- Rate limiting for security
- Forgot password functionality
- Input validation and sanitization

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/servease
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   FRONTEND_URL=http://localhost:5173
   ```

3. Set up Gmail for email sending:
   - Enable 2-factor authentication on your Gmail account
   - Generate an App Password: https://support.google.com/accounts/answer/185833
   - Use the App Password as EMAIL_PASS

4. Start MongoDB locally or update MONGO_URI for your database

5. Run the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/resend-otp` - Resend verification OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting (100 requests/15min general, 5 auth requests/15min)
- Input validation with express-validator
- Email verification required for login
- OTP expiration (10 minutes)
- Password reset token expiration (1 hour)

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- nodemailer for email sending
- express-rate-limit for rate limiting
- express-validator for input validation