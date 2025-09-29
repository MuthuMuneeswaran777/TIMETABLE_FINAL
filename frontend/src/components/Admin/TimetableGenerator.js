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
  PictureAsPdf as PdfIcon,
  Download,
} from '@mui/icons-material';
import axios from "axios";  
import { departmentsAPI, timetablesAPI } from '../../services/api';
import { generateTimetablePdf } from '../../utils/pdfGenerator';

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

  // Handle PDF export
  // const handleExportPdf = async () => {
  //   if (!timetable?.info?.id) {
  //     setSnackbar({
  //       open: true,
  //       message: 'No timetable data available to export',
  //       severity: 'warning',
  //     });
  //     return;
  //   }

  //   try {
  //     const token = localStorage.getItem('token');
  //     const response = await fetch(`http://localhost:5000/api/timetables/${timetable.info.id}/export`, {
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //       },
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to export timetable');
  //     }

  //     // Get the filename from the content-disposition header or use a default one
  //     const contentDisposition = response.headers.get('content-disposition');
  //     let filename = 'timetable.pdf';
  //     if (contentDisposition) {
  //       const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
  //       if (filenameMatch && filenameMatch[1]) {
  //         filename = filenameMatch[1];
  //       }
  //     }

  //     // Create a blob from the response and create a download link
  //     const blob = await response.blob();
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = filename;
  //     document.body.appendChild(a);
  //     a.click();
  //     window.URL.revokeObjectURL(url);
  //     a.remove();

  //   } catch (error) {
  //     console.error('Export error:', error);
  //     setSnackbar({
  //       open: true,
  //       message: error.message || 'Failed to export timetable as PDF',
  //       severity: 'error',
  //     });
  //   }
  // };

  // Fetch timetable based on filters
  const { data: timetable, isLoading: timetableLoading, refetch } = useQuery(
    ['timetable', filters],
    async () => {
      if (!filters.department_id) return null;
      
      try {
        // First, get the list of timetables to find the ID
        const listResponse = await axios.get('http://localhost:5000/api/timetables', {
          params: {
            department: filters.department_id,
            section: filters.section,
            semester: filters.semester,
            is_active: true
          }
        });
        
        if (!listResponse.data?.success || !listResponse.data.data?.length) {
          throw new Error('No active timetable found');
        }
        
        // Get the most recent active timetable
        const timetableData = listResponse.data.data[0];
        
        // Now get the full timetable with slots
        const detailsResponse = await axios.get(`http://localhost:5000/api/timetables/${timetableData.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Parse metadata if it exists
        let metadata = {};
        if (detailsResponse.data.metadata) {
          try {
            metadata = typeof detailsResponse.data.metadata === 'string' 
              ? JSON.parse(detailsResponse.data.metadata)
              : detailsResponse.data.metadata;
          } catch (e) {
            console.error('Error parsing metadata:', e);
          }
        }
        
        // Process the schedule from the response
        const schedule = Array(5).fill().map(() => Array(8).fill(null));
        
        if (detailsResponse.data.schedule) {
          detailsResponse.data.schedule.forEach((daySchedule, dayIndex) => {
            daySchedule.forEach((slot, timeIndex) => {
              if (slot) {
                schedule[dayIndex][timeIndex] = {
                  department_code: slot.subject_code,
                  teacher: slot.teacher,
                  room: slot.room,
                  subject: slot.subject,
                  is_lab: slot.is_lab,
                  room_type: slot.room_type
                };
              }
            });
          });
        }
        
        return {
          schedule,
          metadata,
          info: {
            id: detailsResponse.data.id,
            department: detailsResponse.data.department_name,
            section: detailsResponse.data.section,
            semester: detailsResponse.data.semester,
            generatedAt: detailsResponse.data.generated_at,
            generatedBy: detailsResponse.data.generated_by_name,
            totalSlots: detailsResponse.data.slots || 0
          }
        };
        
      } catch (error) {
        console.error('Error fetching timetable:', error);
        return { 
          schedule: Array(5).fill().map(() => Array(8).fill(null)),
          info: {
            department: '',
            section: '',
            semester: '',
            generatedAt: '',
            generatedBy: ''
          }
        };
      }
    },
    {
      enabled: !!filters.department_id,
      refetchOnWindowFocus: false
    }
  );

  // const { data: timetable, isLoading: timetableLoading, refetch } = useQuery(
  //   ['timetable', filters],
  //   async () => {
  //     if (!filters.department_id || !filters.semester) {
  //       return null;
  //     }
      
  //     try {
  //       const response = await timetablesAPI.getByFilters({
  //         department_id: filters.department_id,
  //         semester: filters.semester,
  //         section: filters.section,
  //         is_active: true
  //       });
        
  //       if (!response.data || response.data.length === 0) {
  //         throw new Error('No active timetable found');
  //       }
        
  //       return response.data[0]; // Return the first matching timetable
  //     } catch (error) {
  //       console.error('Error fetching timetable:', error);
  //       throw error; // This will be caught by useQuery's error handling
  //     }
  //   },
  //   {
  //     enabled: !!filters.department_id && !!filters.semester,
  //     onError: (error) => {
  //       setSnackbar({
  //         open: true,
  //         message: error.message,
  //         severity: 'error',
  //       });
  //     }
  //   }
  // );

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

  const handleGenerateTimetable = () => {
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

  const handleExportPdf = () => {
    if (!timetable?.info) {
      setSnackbar({
        open: true,
        message: 'No timetable data available to export',
        severity: 'warning',
      });
      return;
    }
  
    try {
      // Make sure we're passing the correct data structure
      generateTimetablePdf(
        {
          ...timetable.info,
          department_name: timetable.info.department_name || 'Department',
          section: timetable.info.section || 'A',
          semester: timetable.info.semester || '1',
          department_code: timetable.info.department_code || 'DEPT',
          generated_by_name: timetable.info.generated_by_name || 'System'
        },
        timetable.slots || []
      );
    } catch (error) {
      console.error('Export error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate PDF: ' + error.message,
        severity: 'error',
      });
    }
  };

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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GenerateIcon />}
              onClick={handleGenerateTimetable}
              disabled={generateMutation.isLoading || !filters.department_id || !filters.semester}
            >
              {timetable ? 'Regenerate' : 'Generate'} Timetable
            </Button>
            {timetable && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PdfIcon />}
                onClick={handleExportPdf}
                disabled={!timetable?.info?.id}
              >
                Export as PDF
              </Button>
            )}
          </Box>
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
            startIcon={<Download />}
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Generated Timetable
            </Typography>
            {timetable.info?.generatedAt && (
              <Typography variant="caption" color="textSecondary">
                Generated on: {new Date(timetable.info.generatedAt).toLocaleString()}
                {timetable.info.generatedBy && ` by ${timetable.info.generatedBy}`}
              </Typography>
            )}
          </Box>
          <Box mb={2}>
            <Chip 
              label={`Department: ${timetable.info?.department || selectedDepartment?.name || 'N/A'}`} 
              color="primary" 
              sx={{ mr: 1, mb: 1 }} 
            />
            <Chip 
              label={`Section: ${timetable.info?.section || filters.section || 'N/A'}`} 
              color="secondary" 
              sx={{ mr: 1, mb: 1 }} 
            />
            <Chip 
              label={`Semester: ${timetable.info?.semester || filters.semester || 'N/A'}`} 
              color="default"
              sx={{ mb: 1 }}
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
                      const slot = timetable?.schedule?.[dayIndex]?.[timeIndex];
                      return (
                        <TableCell key={day} align="center">
                          {slot ? (
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {slot.department_code}
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
