// Test script to send OTP
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Pass:', process.env.EMAIL_PASS ? '✓ Set' : '✗ Not set');
  console.log('Frontend URL:', process.env.FRONTEND_URL);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    // Verify connection
    console.log('\nVerifying transporter...');
    await transporter.verify();
    console.log('✓ Email transporter verified successfully');

    // Send test email
    console.log('\nSending test email...');
    const testOTP = '123456';
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Test OTP - ServEase',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test OTP</h2>
          <p>Your test OTP is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${testOTP}
          </div>
          <p>This is a test email to verify your email configuration is working.</p>
        </div>
      `
    });

    console.log('✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n✅ Email configuration is working correctly!');
    console.log('Check your inbox at:', process.env.EMAIL_USER);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('\nFull error details:');
    console.error(error);
  }

  process.exit(0);
}

testEmail();
