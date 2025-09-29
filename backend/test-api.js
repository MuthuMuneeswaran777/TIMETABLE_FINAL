const http = require('http');

function testTimetableGeneration() {
  const postData = JSON.stringify({
    department_id: 1,
    section: 'A',
    semester: 6,
    regenerate: true
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetables/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1ODkxMzE3NywiZXhwIjoxNzU5NTE3OTc3fQ.EYbIL0Wz2juy3TBNVs72SyEkIiPMdFIyuCy4doz8ezA',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Testing timetable generation API...');

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

testTimetableGeneration();
