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

const StudentTimetable = () => {
  const { user } = useAuth();

  // Fetch student's timetable
  const { data: timetable, isLoading, error } = useQuery(
    ['student-timetable', user?.department_id],
    async () => {
      const response = await axios.get(`/api/students/timetable`, {
        params: {
          department_id: user.department_id,
          section: user.section,
        },
      });
      return response.data;
    },
    {
      enabled: !!user?.department_id,
    }
  );

  // Fetch student's statistics
  const { data: stats } = useQuery(
    ['student-stats', user?.department_id],
    async () => {
      const response = await axios.get(`/api/students/stats`, {
        params: {
          department_id: user.department_id,
          section: user.section,
        },
      });
      return response.data;
    },
    {
      enabled: !!user?.department_id,
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
        My Class Timetable
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
                Total Subjects
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
                Lab Sessions
              </Typography>
              <Typography variant="h4">
                {stats?.labSessions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Theory Sessions
              </Typography>
              <Typography variant="h4">
                {stats?.theorySessions || 0}
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
              label={`Department: ${user?.department?.name || 'N/A'}`} 
              color="primary" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={`Section: ${user?.section || 'N/A'}`} 
              color="secondary" 
              sx={{ mr: 1 }}
            />
            <Chip 
              label={`Semester: ${user?.semester || 'N/A'}`} 
              color="default" 
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
                                {slot.teacher}
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
        ) : (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              No timetable available for your class. Please contact the admin.
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

        {/* Next Class Info */}
        {timetable?.nextClass && (
          <Box mt={3}>
            <Card variant="outlined" sx={{ backgroundColor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Next Class
                </Typography>
                <Typography variant="body1">
                  <strong>{timetable.nextClass.subject}</strong> with {timetable.nextClass.teacher}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {timetable.nextClass.day} at {timetable.nextClass.time} in {timetable.nextClass.room}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default StudentTimetable;
