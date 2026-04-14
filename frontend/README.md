# ServEase Frontend

A modern React frontend for the ServEase application with secure authentication system.

## Features

- User registration and login
- Email verification with OTP
- Forgot password functionality
- JWT-based authentication
- Responsive design with Tailwind CSS
- Real-time notifications with Toast component

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API base URL in `src/utils/api.js` if needed

3. Start the development server:
   ```bash
   npm run dev
   ```

## Authentication Flow

1. **Registration**: User enters details, receives OTP via email
2. **Email Verification**: User enters OTP to verify email
3. **Login**: Verified users can log in with email/password
4. **Forgot Password**: Users can reset password via email link

## Pages

- `/login` - Login/Register page
- `/verify-email` - Email verification with OTP
- `/forgot-password` - Request password reset
- `/reset-password/:token` - Reset password with token
- `/dashboard` - User dashboard
- `/worker-dashboard` - Worker dashboard

## Tech Stack

- React 18
- Vite
- React Router
- Tailwind CSS
- Axios for API calls
- Lucide React for icons
