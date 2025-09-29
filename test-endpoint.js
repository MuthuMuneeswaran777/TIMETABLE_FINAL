const http = require('http');

// Test the teacher timetable endpoint
function testEndpoint(teacherId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/teachers/${teacherId}/timetable`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // You might need to add authentication headers here
        // 'Authorization': 'Bearer your-token-here'
      }
    };

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

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing teacher timetable endpoints...\n');

  try {
    // Test teacher ID 1
    console.log('Testing Teacher ID 1:');
    const result1 = await testEndpoint(1);
    console.log(`Status: ${result1.status}`);
    console.log('Response:', JSON.stringify(result1.data, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');

    // Test teacher ID 2
    console.log('Testing Teacher ID 2:');
    const result2 = await testEndpoint(2);
    console.log(`Status: ${result2.status}`);
    console.log('Response:', JSON.stringify(result2.data, null, 2));

    // Analyze results
    console.log('\n📊 Analysis:');
    if (result2.status === 200 && result2.data.schedule) {
      const totalSlots = result2.data.schedule.flat().filter(slot => slot !== null).length;
      console.log(`✅ Teacher 2 has ${totalSlots} scheduled slots`);
      console.log(`📈 Total slots reported: ${result2.data.total_slots}`);
      
      if (totalSlots === 0) {
        console.log('❌ Issue: No timetable data found in database');
        console.log('💡 Solution: Need to create sample timetable data');
      } else {
        console.log('✅ Timetable data exists and is being returned correctly');
      }
    } else {
      console.log(`❌ Error: Status ${result2.status}`);
      if (result2.status === 401) {
        console.log('💡 Authentication required - you need to login first');
      } else if (result2.status === 404) {
        console.log('💡 Teacher not found or endpoint not available');
      }
    }

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    console.log('💡 Make sure the backend server is running on port 5000');
  }
}

runTests();
