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
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const SubjectAllocation = () => {
  const { user } = useAuth();

  // Fetch teacher's subject allocations
  const { data: allocations, isLoading, error } = useQuery(
    ['teacher-allocations', user?.teacher_id],
    async () => {
      const response = await api.get(`/teachers/${user.teacher_id}/allocations`);
      return response.data;
    },
    {
      enabled: !!user?.teacher_id,
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
          Error loading subject allocations. Please try again later.
        </Typography>
      </Paper>
    );
  }

  const totalPeriodsPerWeek = allocations?.reduce(
    (sum, allocation) => sum + allocation.max_periods_per_week, 
    0
  ) || 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Subject Allocation & Weekly Limits
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
                {allocations?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Periods/Week
              </Typography>
              <Typography variant="h4">
                {totalPeriodsPerWeek}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Max Allowed/Week
              </Typography>
              <Typography variant="h4">
                {user?.max_sessions_per_week || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Workload Status
              </Typography>
              <Typography 
                variant="h6"
                color={totalPeriodsPerWeek > (user?.max_sessions_per_week || 0) ? 'error' : 'success'}
              >
                {totalPeriodsPerWeek > (user?.max_sessions_per_week || 0) ? 'Overloaded' : 'Normal'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Subject Allocations Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Subject Allocations
        </Typography>

        {allocations && allocations.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Subject Code</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell align="center">Type</TableCell>
                  <TableCell align="center">Credits</TableCell>
                  <TableCell align="center">Periods/Week</TableCell>
                  <TableCell align="center">Max Periods/Day</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {allocation.subject?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {allocation.subject?.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {allocation.department?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {allocation.department?.section}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={allocation.subject?.is_lab ? 'Lab' : 'Theory'}
                        color={allocation.subject?.is_lab ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {allocation.subject?.credits}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {allocation.max_periods_per_week}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {allocation.max_periods_per_day}
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
              No subject allocations found. Please contact the admin.
            </Typography>
          </Box>
        )}

        {/* Workload Analysis */}
        {allocations && allocations.length > 0 && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Workload Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Theory Subjects
                    </Typography>
                    <Typography variant="h6">
                      {allocations.filter(a => !a.subject?.is_lab).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total periods: {allocations
                        .filter(a => !a.subject?.is_lab)
                        .reduce((sum, a) => sum + a.max_periods_per_week, 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Laboratory Subjects
                    </Typography>
                    <Typography variant="h6">
                      {allocations.filter(a => a.subject?.is_lab).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total periods: {allocations
                        .filter(a => a.subject?.is_lab)
                        .reduce((sum, a) => sum + a.max_periods_per_week, 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SubjectAllocation;
