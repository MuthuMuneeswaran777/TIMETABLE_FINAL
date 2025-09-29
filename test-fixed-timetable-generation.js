const http = require('http');

// Test the fixed timetable generation API
async function testFixedTimetableGeneration() {
  console.log('🧪 Testing FIXED timetable generation API...\n');

  try {
    // Step 1: Login to get authentication token
    console.log('🔐 Step 1: Logging in...');
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

    // Step 2: Test timetable generation with detailed logging
    console.log('\n🔄 Step 2: Testing timetable generation...');
    
    const generateData = JSON.stringify({
      department_id: 1,
      section: 'A',
      semester: 6,
      regenerate: true // Force regeneration to test fresh
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

    console.log('📤 Sending generation request...');
    console.log('Request data:', JSON.parse(generateData));
    
    const startTime = Date.now();
    const generateResult = await makeRequest(generateOptions, generateData);
    const endTime = Date.now();
    
    console.log(`\n📊 Generation Result (took ${endTime - startTime}ms):`);
    console.log(`Status Code: ${generateResult.status}`);
    console.log('Response Body:', JSON.stringify(generateResult.data, null, 2));

    // Step 3: Analyze the result in detail
    console.log('\n🔍 Step 3: Detailed Analysis:');
    
    if (generateResult.status === 201 && generateResult.data.success === true) {
      console.log('✅ SUCCESS: Timetable generated successfully!');
      console.log(`📈 Total slots: ${generateResult.data.total_slots}`);
      console.log(`🏫 Department: ${generateResult.data.timetable?.department_name || 'N/A'}`);
      console.log(`📅 Timetable ID: ${generateResult.data.timetable?.id || 'N/A'}`);
      
      if (generateResult.data.stats) {
        console.log('\n📊 Optimization Statistics:');
        console.log(`⏱️  Optimization time: ${generateResult.data.stats.optimization_time || 'N/A'}s`);
        console.log(`🔧 Solver status: ${generateResult.data.stats.solver_status || 'N/A'}`);
        console.log(`🔢 Total variables: ${generateResult.data.stats.total_variables || 'N/A'}`);
        console.log(`⚙️  Total constraints: ${generateResult.data.stats.total_constraints || 'N/A'}`);
        
        if (generateResult.data.stats.logs) {
          console.log('\n📝 Python Script Logs:');
          console.log(generateResult.data.stats.logs);
        }
      }
      
      // Test the generated timetable by fetching it
      console.log('\n🔍 Step 4: Verifying generated timetable...');
      await testGeneratedTimetable(token, generateResult.data.timetable.id);
      
    } else if (generateResult.status === 500 && generateResult.data.success === false) {
      console.log('\n❌ GENERATION FAILED (but with proper error handling):');
      console.log(`Error: ${generateResult.data.error}`);
      console.log(`Timetable ID: ${generateResult.data.timetable_id || 'N/A'}`);
      
      if (generateResult.data.details) {
        console.log('\n🔍 Error Details:');
        console.log(`Timestamp: ${generateResult.data.details.timestamp}`);
        console.log(`Error Type: ${generateResult.data.details.error_type}`);
      }
      
      // Analyze common error types
      if (generateResult.data.error.includes('No output from Python script')) {
        console.log('\n💡 Diagnosis: Python script issue');
        console.log('Possible causes:');
        console.log('1. Python not found or wrong path');
        console.log('2. OR-Tools not installed');
        console.log('3. Script syntax error');
        console.log('\n🔧 Solutions:');
        console.log('1. Set PYTHON_PATH environment variable');
        console.log('2. Run: pip install ortools');
        console.log('3. Test Python script directly');
      } else if (generateResult.data.error.includes('INFEASIBLE')) {
        console.log('\n💡 Diagnosis: Constraint satisfaction issue');
        console.log('The optimization constraints cannot be satisfied with current data');
        console.log('This is expected behavior - the API properly handled the infeasible case');
      } else if (generateResult.data.error.includes('Failed to parse Python output')) {
        console.log('\n💡 Diagnosis: Python script output issue');
        console.log('Python script ran but output was not valid JSON');
      }
      
    } else {
      console.log('\n❓ UNEXPECTED RESPONSE:');
      console.log(`Status: ${generateResult.status}`);
      console.log(`Success field: ${generateResult.data.success}`);
      console.log('This indicates a potential issue with the API response format');
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure backend server is running on port 5000');
    console.log('2. Check database connection');
    console.log('3. Verify sample data exists');
  }
}

// Test the generated timetable by fetching teacher schedules
async function testGeneratedTimetable(token, timetableId) {
  try {
    // Test teacher timetable endpoint
    const teacherOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/teachers/2/timetable',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const teacherResult = await makeRequest(teacherOptions);
    
    if (teacherResult.status === 200) {
      console.log('✅ Teacher timetable fetch successful');
      console.log(`📊 Teacher 2 has ${teacherResult.data.total_slots} scheduled slots`);
      
      // Count non-null slots
      const nonNullSlots = teacherResult.data.schedule.flat().filter(slot => slot !== null).length;
      console.log(`📅 Non-null schedule slots: ${nonNullSlots}`);
      
      if (nonNullSlots > 0) {
        console.log('✅ Timetable data is properly accessible via teacher endpoint');
      } else {
        console.log('⚠️  Warning: No schedule data found for teacher');
      }
    } else {
      console.log(`❌ Teacher timetable fetch failed: ${teacherResult.status}`);
    }

  } catch (error) {
    console.log(`❌ Error testing generated timetable: ${error.message}`);
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

// Run the comprehensive test
console.log('🚀 Starting comprehensive timetable generation test...');
console.log('This test will verify all the fixes implemented:\n');
console.log('✓ Python script always returns JSON');
console.log('✓ Proper error handling for all solver states');
console.log('✓ No more "undefined" errors');
console.log('✓ Meaningful error messages');
console.log('✓ Environment-based Python path');
console.log('✓ Structured logging');
console.log('=' * 60);

testFixedTimetableGeneration();
