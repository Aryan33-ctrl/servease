// Test OTP API endpoint
const http = require('http');

const postData = JSON.stringify({
  name: 'Test User',
  email: 'test@gmail.com',
  role: 'client'
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/auth/send-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing OTP API endpoint...');
console.log('Sending request to:', `http://localhost:5001/api/auth/send-otp`);
console.log('Payload:', JSON.parse(postData));
console.log('');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(postData);
req.end();
