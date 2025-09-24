import React from 'react';
import { useQuery } from 'react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Book as BookIcon,
  Business as BusinessIcon,
  Room as RoomIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { dashboardAPI } from '../../services/api';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon, { sx: { color: 'white', fontSize: 30 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data: stats, isLoading, error } = useQuery(
    'dashboard-stats',
    async () => {
      const response = await dashboardAPI.getStats();
      return response.data;
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
          Error loading dashboard data. Please try again later.
        </Typography>
      </Paper>
    );
  }

  const statCards = [
    {
      title: 'Total Teachers',
      value: stats?.total_teachers || 0,
      icon: <PersonIcon />,
      color: '#1976d2',
    },
    {
      title: 'Total Subjects',
      value: stats?.total_subjects || 0,
      icon: <BookIcon />,
      color: '#388e3c',
    },
    {
      title: 'Departments',
      value: stats?.total_departments || 0,
      icon: <BusinessIcon />,
      color: '#f57c00',
    },
    {
      title: 'Rooms',
      value: stats?.total_rooms || 0,
      icon: <RoomIcon />,
      color: '#7b1fa2',
    },
    {
      title: 'Generated Timetables',
      value: stats?.total_timetables || 0,
      icon: <ScheduleIcon />,
      color: '#d32f2f',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <Typography color="textSecondary">
              {stats?.recentActivities?.length > 0 ? (
                stats.recentActivities.map((activity, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    • {activity.description} - {activity.timestamp}
                  </Box>
                ))
              ) : (
                'No recent activities'
              )}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Database Connection: 
                <Typography component="span" color="success.main" sx={{ ml: 1 }}>
                  ✓ Connected
                </Typography>
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                OR-Tools Service: 
                <Typography component="span" color="success.main" sx={{ ml: 1 }}>
                  ✓ Available
                </Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Last Backup: 
                <Typography component="span" sx={{ ml: 1 }}>
                  {stats?.lastBackup || 'Never'}
                </Typography>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
