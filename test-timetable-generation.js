const http = require('http');

// Test the timetable generation API
async function testTimetableGeneration() {
  console.log('🧪 Testing timetable generation API...\n');

  try {
    // Step 1: Login to get authentication token
    console.log('🔐 Logging in...');
    const loginData = JSON.stringify({
      email: 'admin@example.com',
      password: 'password123'
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const loginResult = await makeRequest(loginOptions, loginData);
    
    if (loginResult.status !== 200 || !loginResult.data.token) {
      console.log('❌ Login failed:', loginResult.data);
      return;
    }

    console.log('✅ Login successful');
    const token = loginResult.data.token;

    // Step 2: Test timetable generation
    console.log('\n🔄 Testing timetable generation...');
    
    const generateData = JSON.stringify({
      department_id: 1,
      section: 'A',
      semester: 6,
      regenerate: true // Force regeneration
    });

    const generateOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetables/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(generateData)
      }
    };

    console.log('Sending generation request...');
    const generateResult = await makeRequest(generateOptions, generateData);
    
    console.log(`\n📊 Generation Result:`);
    console.log(`Status: ${generateResult.status}`);
    console.log('Response:', JSON.stringify(generateResult.data, null, 2));

    // Analyze the result
    if (generateResult.status === 201 && generateResult.data.success) {
      console.log('\n✅ SUCCESS: Timetable generated successfully!');
      console.log(`📈 Total slots: ${generateResult.data.total_slots}`);
      console.log(`🏫 Department: ${generateResult.data.timetable.department_name}`);
      
      if (generateResult.data.stats) {
        console.log(`⏱️  Optimization time: ${generateResult.data.stats.optimization_time || 'N/A'}s`);
        console.log(`🔧 Solver status: ${generateResult.data.stats.solver_status || 'N/A'}`);
      }
    } else if (generateResult.status === 500 && !generateResult.data.success) {
      console.log('\n❌ GENERATION FAILED:');
      console.log(`Error: ${generateResult.data.error}`);
      console.log(`Timetable ID: ${generateResult.data.timetable_id}`);
      
      if (generateResult.data.error.includes('No output from Python script')) {
        console.log('\n💡 Possible solutions:');
        console.log('1. Install OR-Tools: pip install ortools');
        console.log('2. Check Python path in environment variables');
        console.log('3. Verify Python script exists and is executable');
      } else if (generateResult.data.error.includes('Python script failed')) {
        console.log('\n💡 Python script error detected. Check:');
        console.log('1. OR-Tools installation');
        console.log('2. Python script syntax');
        console.log('3. Input data validation');
      }
    } else {
      console.log('\n❓ Unexpected response');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Helper function to make HTTP requests
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

// Run the test
testTimetableGeneration();
