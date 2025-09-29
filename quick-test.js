const http = require('http');

async function quickTest() {
  console.log('🚀 Quick test of teacher timetable endpoint...\n');

  // Login first
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

  try {
    // Get token
    const loginReq = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const loginResult = JSON.parse(data);
        if (loginResult.token) {
          console.log('✅ Login successful');
          
          // Test teacher 2 timetable
          const testOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/teachers/2/timetable',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${loginResult.token}`
            }
          };

          const testReq = http.request(testOptions, (testRes) => {
            let testData = '';
            testRes.on('data', (chunk) => { testData += chunk; });
            testRes.on('end', () => {
              const result = JSON.parse(testData);
              console.log(`\n📊 Teacher 2 Timetable Result:`);
              console.log(`Status: ${testRes.statusCode}`);
              console.log(`Teacher ID: ${result.teacher_id}`);
              console.log(`Total Slots: ${result.total_slots}`);
              
              if (result.total_slots > 0) {
                console.log('✅ SUCCESS: Timetable data found!');
                console.log('\n📅 Sample schedule slots:');
                result.schedule.forEach((day, dayIndex) => {
                  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                  day.forEach((slot, timeIndex) => {
                    if (slot) {
                      console.log(`  ${dayNames[dayIndex]} ${timeIndex}: ${slot.subject} in ${slot.room}`);
                    }
                  });
                });
              } else {
                console.log('❌ No timetable data found');
              }
            });
          });

          testReq.on('error', (err) => {
            console.error('❌ Test request error:', err.message);
          });

          testReq.end();
        } else {
          console.log('❌ Login failed');
        }
      });
    });

    loginReq.on('error', (err) => {
      console.error('❌ Login request error:', err.message);
    });

    loginReq.write(loginData);
    loginReq.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickTest();
