const { PythonShell } = require('python-shell');
const path = require('path');

// Test the Python optimization script directly
async function testPythonScript() {
  console.log('🐍 Testing Python optimization script directly...\n');

  try {
    const scriptPath = path.resolve(__dirname, 'backend', 'scripts', 'timetable_optimizer.py');
    console.log('Script path:', scriptPath);

    // Sample optimization data
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
          max_periods_per_day: 2
        },
        {
          id: 2,
          name: 'Database Management',
          code: 'CS302',
          is_lab: false,
          teacher_id: 2,
          teacher_name: 'Prof. Sarah Johnson',
          max_periods_per_week: 3,
          max_periods_per_day: 2
        },
        {
          id: 3,
          name: 'DBMS Lab',
          code: 'CS302L',
          is_lab: true,
          teacher_id: 2,
          teacher_name: 'Prof. Sarah Johnson',
          max_periods_per_week: 3,
          max_periods_per_day: 3
        }
      ],
      rooms: [
        { id: 1, name: 'CSE-101', type: 'classroom', capacity: 60 },
        { id: 2, name: 'CSE-102', type: 'classroom', capacity: 60 },
        { id: 3, name: 'CSE-Lab1', type: 'laboratory', capacity: 30 }
      ],
      constraints: {
        days_per_week: 5,
        periods_per_day: 8,
        morning_periods: [0, 1, 2, 3],
        evening_periods: [4, 5, 6, 7],
        lab_duration: 3
      }
    };

    const pythonPath = process.env.PYTHON_PATH || process.env.PYTHON_EXECUTABLE || 'python3';
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
      let exitCode = null;

      const pyshell = new PythonShell(scriptPath, options);

      pyshell.on('message', function (message) {
        console.log('Python stdout:', message);
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
        exitCode = code;
        console.log(`\nPython script finished with exit code: ${exitCode}`);
        
        if (exitCode !== 0) {
          reject(new Error(`Python script failed with code ${exitCode}: ${errorData.trim()}`));
          return;
        }

        const trimmedOutput = outputData.trim();
        if (!trimmedOutput) {
          reject(new Error('No output from Python script'));
          return;
        }

        try {
          const parsedOutput = JSON.parse(trimmedOutput);
          resolve(parsedOutput);
        } catch (parseError) {
          reject(new Error(`Failed to parse JSON: ${parseError.message}\nOutput: ${trimmedOutput}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (exitCode === null) {
          pyshell.kill('SIGTERM');
          reject(new Error('Python script timeout'));
        }
      }, 30000);
    });

    console.log('\n📊 Python Script Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS: Python script executed successfully!');
      console.log(`📈 Generated ${result.schedule ? result.schedule.length : 0} time slots`);
      if (result.stats) {
        console.log(`⏱️  Optimization time: ${result.stats.optimization_time || 'N/A'}s`);
        console.log(`🔧 Solver status: ${result.stats.solver_status || 'N/A'}`);
      }
    } else {
      console.log('\n❌ FAILED: Python script returned error');
      console.log(`Error: ${result.error}`);
      console.log(`Error type: ${result.stats?.error_type || 'Unknown'}`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('python3')) {
      console.log('\n💡 Python not found. Try:');
      console.log('1. Install Python 3: https://python.org');
      console.log('2. Add Python to PATH');
      console.log('3. Set PYTHON_PATH environment variable');
    }
    
    if (error.message.includes('ortools')) {
      console.log('\n💡 OR-Tools not installed. Run:');
      console.log('pip install ortools');
    }
  }
}

testPythonScript();
