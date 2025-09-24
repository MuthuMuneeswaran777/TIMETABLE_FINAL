import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import { 
  Science as LabIcon, 
  MenuBook as TheoryIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const SubjectDetails = () => {
  const { user } = useAuth();

  // Fetch student's subjects
  const { data: subjects, isLoading, error } = useQuery(
    ['student-subjects', user?.department_id],
    async () => {
      const response = await axios.get(`/api/students/subjects`, {
        params: {
          department_id: user.department_id,
          section: user.section,
          semester: user.semester,
        },
      });
      return response.data;
    },
    {
      enabled: !!user?.department_id,
    }
  );

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
          Error loading subject details. Please try again later.
        </Typography>
      </Paper>
    );
  }

  const totalCredits = subjects?.reduce((sum, subject) => sum + subject.credits, 0) || 0;
  const theorySubjects = subjects?.filter(s => !s.is_lab) || [];
  const labSubjects = subjects?.filter(s => s.is_lab) || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Subject Details
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Subjects
              </Typography>
              <Typography variant="h4">
                {subjects?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Credits
              </Typography>
              <Typography variant="h4">
                {totalCredits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Theory Subjects
              </Typography>
              <Typography variant="h4">
                {theorySubjects.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Lab Subjects
              </Typography>
              <Typography variant="h4">
                {labSubjects.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Subjects Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          All Subjects
        </Typography>

        {subjects && subjects.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell align="center">Type</TableCell>
                  <TableCell align="center">Credits</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell align="center">Periods/Week</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2, bgcolor: subject.is_lab ? '#2196f3' : '#9c27b0' }}>
                          {subject.is_lab ? <LabIcon /> : <TheoryIcon />}
                        </Avatar>
                        <Typography variant="body2" fontWeight="bold">
                          {subject.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subject.code}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={subject.is_lab ? 'Laboratory' : 'Theory'}
                        color={subject.is_lab ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {subject.credits}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {subject.teacher?.name || 'Not Assigned'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {subject.teacher?.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {subject.periods_per_week || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              No subjects found for your class. Please contact the admin.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Subject Categories */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Theory Subjects ({theorySubjects.length})
            </Typography>
            {theorySubjects.length > 0 ? (
              <Box>
                {theorySubjects.map((subject) => (
                  <Card key={subject.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {subject.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {subject.code} • {subject.credits} Credits
                          </Typography>
                          <Typography variant="body2">
                            Teacher: {subject.teacher?.name || 'Not Assigned'}
                          </Typography>
                        </Box>
                        <Chip label="Theory" size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography color="textSecondary">No theory subjects</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Laboratory Subjects ({labSubjects.length})
            </Typography>
            {labSubjects.length > 0 ? (
              <Box>
                {labSubjects.map((subject) => (
                  <Card key={subject.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {subject.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {subject.code} • {subject.credits} Credits
                          </Typography>
                          <Typography variant="body2">
                            Teacher: {subject.teacher?.name || 'Not Assigned'}
                          </Typography>
                        </Box>
                        <Chip label="Lab" color="primary" size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography color="textSecondary">No laboratory subjects</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SubjectDetails;
