# Timetable Generation API Fixes

## Problem Summary
The `/api/timetables/generate` endpoint was returning `{"error":"Python script failed with code undefined"}` even when timetables were stored in the database. This was caused by poor error handling in the Python script integration.

## Fixes Implemented

### 1. Backend Node.js Improvements (`routes/timetables.js`)

#### ✅ Python Path Configuration
- **Before**: Hardcoded Python path `'C:/Users/praga/AppData/Local/Microsoft/WindowsApps/python3.11.exe'`
- **After**: Uses environment variables with fallback
```javascript
const pythonPath = process.env.PYTHON_PATH || process.env.PYTHON_EXECUTABLE || 'python3';
```

#### ✅ Absolute Path Resolution
- **Before**: `path.join(__dirname, '..', 'scripts', 'timetable_optimizer.py')`
- **After**: `path.resolve(__dirname, '..', 'scripts', 'timetable_optimizer.py')`

#### ✅ Improved Error Handling
- **Exit Code Tracking**: Never undefined, always logged
- **Separate stdout/stderr**: Clear distinction between output and errors
- **Timeout Protection**: 2-minute timeout prevents hanging
- **JSON Parse Safety**: Wrapped in try/catch with raw output in error messages

#### ✅ Better Response Structure
- **Success Response**: 
```json
{
  "success": true,
  "message": "Timetable generated successfully",
  "timetable": {...},
  "stats": {...},
  "total_slots": 15
}
```
- **Error Response**:
```json
{
  "success": false,
  "message": "Timetable generation failed",
  "error": "Detailed error message",
  "timetable_id": 123,
  "details": {
    "timestamp": "2025-01-24T10:00:00Z",
    "error_type": "optimization_failure"
  }
}
```

#### ✅ Database Protection
- **Validation**: Checks slot data before insertion
- **No Empty Slots**: Prevents inserting invalid/empty timetable slots
- **Error Metadata**: Stores detailed error information in timetable metadata

### 2. Python Script Improvements (`timetable_optimizer.py`)

#### ✅ Guaranteed JSON Output
- **Always outputs valid JSON** using `print(json.dumps(...))`
- **Structured error responses** with consistent format
- **Proper stderr logging** separate from JSON output

#### ✅ Input Validation
- **Argument checking**: Validates command line arguments
- **JSON validation**: Catches and reports JSON parsing errors
- **Required fields**: Validates presence of department, subjects, rooms, constraints
- **Data validation**: Ensures subjects and rooms arrays are not empty

#### ✅ Error Categories
```python
# Different error types for better debugging
'ArgumentError'     # Wrong command line usage
'JSONDecodeError'   # Invalid JSON input
'ValidationError'   # Missing/invalid data
'ImportError'       # Missing OR-Tools package
'InternalError'     # Unexpected optimizer issues
```

#### ✅ Detailed Error Messages
- **Import errors**: Suggests `pip install ortools`
- **Validation errors**: Specifies exactly what's missing
- **Optimization errors**: Includes solver status and details

### 3. Environment Configuration

#### ✅ Updated `.env.example`
```bash
# Python Configuration
PYTHON_PATH=python3
# or
PYTHON_EXECUTABLE=/usr/bin/python3
```

## Testing

### Test Scripts Created

1. **`test-timetable-generation.js`**: Full API test with authentication
2. **`test-python-script.js`**: Direct Python script testing
3. **`test-with-auth.js`**: Authentication and endpoint testing

### How to Test

```bash
# Test the full API
node test-timetable-generation.js

# Test Python script directly
node test-python-script.js

# Test with authentication
node test-with-auth.js
```

## Common Issues & Solutions

### ❌ "No output from Python script"
**Cause**: Python not found or script crashes immediately
**Solution**: 
1. Install Python 3: `python --version`
2. Set `PYTHON_PATH` environment variable
3. Check script permissions

### ❌ "Failed to parse Python output as JSON"
**Cause**: Python script outputs non-JSON text
**Solution**: 
1. Check for Python syntax errors
2. Verify OR-Tools installation: `pip install ortools`
3. Review stderr logs for Python errors

### ❌ "Python script failed with code 1"
**Cause**: Python script encountered an error
**Solution**:
1. Check stderr output for specific error
2. Validate input data (subjects, rooms, constraints)
3. Ensure OR-Tools is properly installed

### ❌ "Missing required Python package"
**Cause**: OR-Tools not installed
**Solution**: `pip install ortools`

## Environment Setup

### Required Python Packages
```bash
pip install ortools
```

### Environment Variables
```bash
# Optional: Set custom Python path
export PYTHON_PATH=/usr/bin/python3
# or
export PYTHON_EXECUTABLE=python3
```

## API Usage

### Generate Timetable
```javascript
POST /api/timetables/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "department_id": 1,
  "section": "A", 
  "semester": 6,
  "regenerate": true
}
```

### Success Response
```json
{
  "success": true,
  "message": "Timetable generated successfully",
  "timetable": {
    "id": 123,
    "department_name": "Computer Science Engineering",
    "section": "A",
    "is_active": true
  },
  "stats": {
    "optimization_time": 2.45,
    "solver_status": "OPTIMAL",
    "total_variables": 1200,
    "total_constraints": 450
  },
  "total_slots": 25
}
```

### Error Response
```json
{
  "success": false,
  "message": "Timetable generation failed",
  "error": "Python optimization script produced no output. Check if OR-Tools is installed and the script is working correctly.",
  "timetable_id": 123,
  "details": {
    "timestamp": "2025-01-24T10:00:00Z",
    "error_type": "optimization_failure"
  }
}
```

## Summary

✅ **Fixed**: Undefined exit codes  
✅ **Fixed**: Poor error messages  
✅ **Fixed**: Hardcoded Python paths  
✅ **Fixed**: JSON parsing failures  
✅ **Fixed**: Database corruption from failed optimizations  
✅ **Added**: Comprehensive error handling  
✅ **Added**: Proper logging and debugging  
✅ **Added**: Input validation  
✅ **Added**: Timeout protection  

The Node.js → Python → Database pipeline now works reliably with meaningful error messages and no more "undefined" errors.
