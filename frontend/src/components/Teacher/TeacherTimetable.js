import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const TeacherTimetable = () => {
  const { user } = useAuth();

  // First fetch teacher details
  const { data: teacherDetails } = useQuery(
    ['teacher-details', user?.email],
    async () => {
      const response = await axios.get(`/api/teachers`);
      // Find the teacher with matching email
      const teacher = response.data.data.find(t => t.email === user.email);
      return teacher;
    },
    {
      enabled: !!user?.email,
    }
  );

  // Fetch teacher's timetable
  const { data: timetable, isLoading, error } = useQuery(
    ['teacher-timetable', teacherDetails?.id],
    async () => {
      const response = await axios.get(`/api/teachers/${teacherDetails.id}/timetable`);
      return response.data;
    },
    {
      enabled: !!teacherDetails?.id,
    }
  );

  // Fetch teacher's statistics
  const { data: stats } = useQuery(
    ['teacher-stats', teacherDetails?.id],
    async () => {
      const response = await axios.get(`/api/teachers/${teacherDetails.id}/stats`);
      return response.data;
    },
    {
      enabled: !!teacherDetails?.id,
    }
  );

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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">
          Error loading timetable. Please try again later.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Timetable
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Classes This Week
              </Typography>
              <Typography variant="h4">
                {stats?.totalClasses || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Subjects Teaching
              </Typography>
              <Typography variant="h4">
                {stats?.subjectsCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Departments
              </Typography>
              <Typography variant="h4">
                {stats?.departmentsCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Max Sessions/Week
              </Typography>
              <Typography variant="h4">
                {user?.max_sessions_per_week || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Timetable */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            Weekly Schedule
          </Typography>
          <Box>
            <Chip 
              label={`Teacher: ${user?.name}`} 
              color="primary" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={`Department: ${user?.department?.name || 'N/A'}`} 
              color="secondary" 
            />
          </Box>
        </Box>

        {timetable ? (
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
                            <Box
                              sx={{
                                p: 1,
                                backgroundColor: slot.is_lab ? '#e3f2fd' : '#f3e5f5',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: slot.is_lab ? '#2196f3' : '#9c27b0',
                              }}
                            >
                              <Typography variant="body2" fontWeight="bold">
                                {slot.subject}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {slot.department} - {slot.section}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="textSecondary">
                                Room: {slot.room}
                              </Typography>
                              {slot.is_lab && (
                                <Chip 
                                  label="Lab" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ mt: 0.5, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              Free
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
        ) : (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              No timetable generated yet. Please contact the admin.
            </Typography>
          </Box>
        )}

        {/* Legend */}
        <Box mt={3} display="flex" gap={2} alignItems="center">
          <Typography variant="body2">Legend:</Typography>
          <Box
            sx={{
              px: 2,
              py: 0.5,
              backgroundColor: '#f3e5f5',
              border: '1px solid #9c27b0',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption">Theory Class</Typography>
          </Box>
          <Box
            sx={{
              px: 2,
              py: 0.5,
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption">Laboratory</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default TeacherTimetable;
