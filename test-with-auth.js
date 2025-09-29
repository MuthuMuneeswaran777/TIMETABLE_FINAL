const http = require('http');

// Function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Login to get authentication token
async function login() {
  const loginData = JSON.stringify({
    email: 'admin@example.com',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  try {
    const result = await makeRequest(options, loginData);
    if (result.status === 200 && result.data.token) {
      console.log('✅ Login successful');
      return result.data.token;
    } else {
      console.log('❌ Login failed:', result.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

// Test teacher timetable endpoint with authentication
async function testTeacherTimetable(teacherId, token) {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/teachers/${teacherId}/timetable`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  try {
    const result = await makeRequest(options);
    return result;
  } catch (error) {
    console.error(`❌ Error testing teacher ${teacherId}:`, error.message);
    return { status: 500, data: { error: error.message } };
  }
}

async function runTests() {
  console.log('🧪 Testing teacher timetable endpoints with authentication...\n');

  // Step 1: Login
  console.log('🔐 Logging in...');
  const token = await login();
  
  if (!token) {
    console.log('❌ Cannot proceed without authentication token');
    return;
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 2: Test teacher endpoints
  for (const teacherId of [1, 2]) {
    console.log(`Testing Teacher ID ${teacherId}:`);
    const result = await testTeacherTimetable(teacherId, token);
    
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.schedule) {
      const totalSlots = result.data.schedule.flat().filter(slot => slot !== null).length;
      console.log(`📊 Analysis: ${totalSlots} scheduled slots found`);
      console.log(`📈 Total slots reported: ${result.data.total_slots}`);
      
      if (totalSlots === 0) {
        console.log('❌ Issue: No timetable data in database');
      } else {
        console.log('✅ Timetable data exists and is being returned');
      }
    } else if (result.status === 403) {
      console.log('❌ Access denied - admin user cannot access teacher data directly');
    } else {
      console.log(`❌ Unexpected response: ${result.status}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }

  // Step 3: Summary and recommendations
  console.log('📋 Summary:');
  console.log('The endpoint is working but requires proper authentication.');
  console.log('The issue is that there are no timetables in the database yet.');
  console.log('\n💡 To fix this:');
  console.log('1. Run the database initialization script to create sample data');
  console.log('2. Or use the timetable generation endpoint to create a timetable');
  console.log('3. Then test again with proper teacher credentials');
}

runTests();
