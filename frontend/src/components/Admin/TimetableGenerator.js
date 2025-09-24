import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
} from '@mui/material';
import { 
  PlayArrow as GenerateIcon, 
  Refresh as RegenerateIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { departmentsAPI, timetablesAPI } from '../../services/api';

const TimetableGenerator = () => {
  const [filters, setFilters] = useState({
    semester: '',
    department_id: '',
    section: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  // Fetch departments for filters
  const { data: departments = [] } = useQuery(
    'departments',
    async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    }
  );

  // Fetch timetable based on filters
  const { data: timetable, isLoading: timetableLoading, refetch } = useQuery(
    ['timetable', filters],
    async () => {
      if (!filters.department_id) return null;
      const response = await timetablesAPI.getByDepartment(
        filters.department_id, 
        filters.section, 
        filters.semester
      );
      return response.data;
    },
    {
      enabled: !!filters.department_id,
    }
  );

  // Generate timetable mutation
  const generateMutation = useMutation(
    async (generateData) => {
      const response = await timetablesAPI.generate(generateData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['timetable', filters]);
        refetch();
        setSnackbar({
          open: true,
          message: 'Timetable generated successfully!',
          severity: 'success',
        });
      },
      onError: (error) => {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || 'Failed to generate timetable',
          severity: 'error',
        });
      },
    }
  );

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    if (!filters.department_id) {
      setSnackbar({
        open: true,
        message: 'Please select a department first',
        severity: 'warning',
      });
      return;
    }
    generateMutation.mutate(filters);
  };

  const handleRegenerate = () => {
    if (!filters.department_id) {
      setSnackbar({
        open: true,
        message: 'Please select a department first',
        severity: 'warning',
      });
      return;
    }
    generateMutation.mutate({ ...filters, regenerate: true });
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get('/api/timetables/export', { 
        params: filters,
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable_${filters.department_id}_${filters.section}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to download timetable',
        severity: 'error',
      });
    }
  };

  const timeSlots = [
    '9:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-1:00',
    '1:00-2:00',
    '2:00-3:00',
    '3:00-4:00',
    '4:00-5:00',
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const selectedDepartment = departments.find(d => d.id === filters.department_id);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Timetable Generator
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Department"
              value={filters.department_id}
              onChange={(e) => handleFilterChange('department_id', e.target.value)}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Section"
              value={filters.section}
              onChange={(e) => handleFilterChange('section', e.target.value)}
              disabled={!selectedDepartment}
            >
              {selectedDepartment && (
                <MenuItem value={selectedDepartment.section}>
                  {selectedDepartment.section}
                </MenuItem>
              )}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Semester"
              value={filters.semester}
              onChange={(e) => handleFilterChange('semester', e.target.value)}
              disabled={!selectedDepartment}
            >
              {selectedDepartment && (
                <MenuItem value={selectedDepartment.semester}>
                  Semester {selectedDepartment.semester}
                </MenuItem>
              )}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<GenerateIcon />}
            onClick={handleGenerate}
            disabled={generateMutation.isLoading || !filters.department_id}
          >
            {generateMutation.isLoading ? 'Generating...' : 'Generate Timetable'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RegenerateIcon />}
            onClick={handleRegenerate}
            disabled={generateMutation.isLoading || !timetable}
          >
            Regenerate
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={!timetable}
          >
            Download PDF
          </Button>
          {generateMutation.isLoading && <CircularProgress size={24} />}
        </Box>
      </Paper>

      {/* Timetable Display */}
      {timetableLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : timetable ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Generated Timetable
          </Typography>
          <Box mb={2}>
            <Chip 
              label={`Department: ${selectedDepartment?.name}`} 
              color="primary" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={`Section: ${filters.section}`} 
              color="secondary" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={`Semester: ${filters.semester}`} 
              color="default" 
            />
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  {days.map((day) => (
                    <TableCell key={day} align="center">
                      {day}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {timeSlots.map((timeSlot, timeIndex) => (
                  <TableRow key={timeSlot}>
                    <TableCell component="th" scope="row">
                      {timeSlot}
                    </TableCell>
                    {days.map((day, dayIndex) => {
                      const slot = timetable.schedule?.[dayIndex]?.[timeIndex];
                      return (
                        <TableCell key={day} align="center">
                          {slot ? (
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {slot.subject}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {slot.teacher}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="textSecondary">
                                {slot.room}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Constraints Info */}
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Applied Constraints
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Scheduling Constraints
                    </Typography>
                    <Typography variant="body2">
                      • No room conflicts within department<br />
                      • Morning/Evening session separation<br />
                      • Max 2 sessions per teacher per day<br />
                      • Lab sessions: 3 continuous periods
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Lab Constraints
                    </Typography>
                    <Typography variant="body2">
                      • No labs in 1st period (morning)<br />
                      • No labs in 5th period (evening)<br />
                      • Lab rooms only for lab subjects<br />
                      • No teacher conflicts across sessions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            Select filters and click "Generate Timetable" to create a new timetable
          </Typography>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TimetableGenerator;
