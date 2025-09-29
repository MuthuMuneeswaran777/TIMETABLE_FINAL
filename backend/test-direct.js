const { PythonShell } = require('python-shell');
const path = require('path');

async function testDirectPython() {
  console.log('Testing Python script directly...');
  
  try {
    const scriptPath = path.resolve(__dirname, 'scripts', 'timetable_optimizer.py');
    console.log('Script path:', scriptPath);

    // Sample optimization data (same as what the API would send)
    const testData = {
      department: {
        id: 1,
        name: 'Computer Science Engineering',
        section: 'A',
        semester: 6
      },
      subjects: [
        {
          id: 1,
          name: 'Data Structures',
          code: 'CS301',
          is_lab: false,
          teacher_id: 1,
          teacher_name: 'Dr. John Smith',
          max_periods_per_week: 4,
          max_periods_per_day: 2,
          teacher_max_sessions: 8
        },
        {
          id: 2,
          name: 'Database Management',
          code: 'CS302',
          is_lab: false,
          teacher_id: 2,
          teacher_name: 'Prof. Sarah Johnson',
          max_periods_per_week: 3,
          max_periods_per_day: 2,
          teacher_max_sessions: 8
        }
      ],
      rooms: [
        { id: 1, name: 'CSE-101', type: 'classroom', capacity: 60 },
        { id: 2, name: 'CSE-102', type: 'classroom', capacity: 60 }
      ],
      constraints: {
        days_per_week: 5,
        periods_per_day: 8,
        morning_periods: 4,
        evening_periods: 4,
        lab_duration: 3,
        no_lab_first_period: true,
        max_teacher_sessions_per_day: 2
      }
    };

    const pythonPath = process.env.PYTHON_PATH || 'python';
    console.log('Using Python path:', pythonPath);

    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'],
      args: [JSON.stringify(testData)]
    };

    console.log('Running Python script...\n');

    const result = await new Promise((resolve, reject) => {
      let outputData = '';
      let errorData = '';

      const pyshell = new PythonShell(scriptPath, options);

      pyshell.on('message', function (message) {
        console.log('Python stdout message:', JSON.stringify(message));
        outputData += message + '\n';
      });

      pyshell.on('stderr', function (stderr) {
        console.log('Python stderr:', stderr);
        errorData += stderr + '\n';
      });

      pyshell.on('error', function (err) {
        console.error('Python process error:', err);
        errorData += `Process error: ${err.toString()}\n`;
      });

      pyshell.on('close', function (code) {
        console.log(`\nPython script finished with exit code: ${code}`);
        console.log('Full outputData length:', outputData.length);
        console.log('Full outputData:', JSON.stringify(outputData));
        
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${errorData.trim()}`));
          return;
        }

        const trimmedOutput = outputData.trim();
        if (!trimmedOutput) {
          reject(new Error('No output from Python script'));
          return;
        }

        try {
          // Clean the output if there are multiple JSON objects
          const lastJsonStart = trimmedOutput.lastIndexOf('{');
          console.log('Last JSON start position:', lastJsonStart);
          const jsonStr = trimmedOutput.substring(lastJsonStart);
          console.log('Extracted JSON string:', JSON.stringify(jsonStr));
          const parsedOutput = JSON.parse(jsonStr);
          resolve(parsedOutput);
        } catch (parseError) {
          console.error('Parse error:', parseError);
          console.error('Raw output:', trimmedOutput);
          reject(new Error(`Failed to parse JSON: ${parseError.message}\nOutput: ${trimmedOutput}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        pyshell.kill('SIGTERM');
        reject(new Error('Python script timeout'));
      }, 30000);
    });

    console.log('\n📊 Python Script Result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testDirectPython();

