const http = require('http');

function testLogin() {
  const postData = JSON.stringify({
    email: 'admin@example.com',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Testing login...');

  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
      try {
        const result = JSON.parse(data);
        if (result.token) {
          console.log('Token received:', result.token);
          testTimetableGeneration(result.token);
        }
      } catch (e) {
        console.error('Failed to parse login response');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(postData);
  req.end();
}

function testTimetableGeneration(token) {
  const postData = JSON.stringify({
    department_id: 1,
    section: 'A',
    semester: 6,
    regenerate: true
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/timetables/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('\nTesting timetable generation with token...');

  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(postData);
  req.end();
}

testLogin();
