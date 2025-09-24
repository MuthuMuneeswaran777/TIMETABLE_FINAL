import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { teachersAPI, departmentsAPI } from '../../services/api';

const Teachers = () => {
  const [open, setOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      department_id: '',
      max_sessions_per_week: 20,
    },
  });

  // Fetch teachers
  const { data: teachers = [], isLoading } = useQuery(
    'teachers',
    async () => {
      const response = await teachersAPI.getAll();
      return response.data;
    }
  );

  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery(
    'departments',
    async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    }
  );

  // Create/Update teacher mutation
  const teacherMutation = useMutation(
    async (teacherData) => {
      if (editingTeacher) {
        return await teachersAPI.update(editingTeacher.id, teacherData);
      } else {
        return await teachersAPI.create(teacherData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teachers');
        setOpen(false);
        setEditingTeacher(null);
        reset();
        setSnackbar({
          open: true,
          message: `Teacher ${editingTeacher ? 'updated' : 'created'} successfully!`,
          severity: 'success',
        });
      },
      onError: (error) => {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || 'An error occurred',
          severity: 'error',
        });
      },
    }
  );

  // Delete teacher mutation
  const deleteMutation = useMutation(
    async (teacherId) => {
      await teachersAPI.delete(teacherId);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teachers');
        setSnackbar({
          open: true,
          message: 'Teacher deleted successfully!',
          severity: 'success',
        });
      },
      onError: (error) => {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || 'An error occurred',
          severity: 'error',
        });
      },
    }
  );

  const handleAdd = () => {
    setEditingTeacher(null);
    reset({
      name: '',
      email: '',
      department_id: '',
      max_sessions_per_week: 20,
    });
    setOpen(true);
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    reset({
      name: teacher.name,
      email: teacher.email,
      department_id: teacher.department_id,
      max_sessions_per_week: teacher.max_sessions_per_week,
    });
    setOpen(true);
  };

  const handleDelete = (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      deleteMutation.mutate(teacherId);
    }
  };

  const onSubmit = (data) => {
    teacherMutation.mutate(data);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { 
      field: 'department_name', 
      headerName: 'Department', 
      width: 200,
      valueGetter: (params) => params.row.department_name || 'N/A',
    },
    { 
      field: 'max_sessions_per_week', 
      headerName: 'Max Sessions/Week', 
      width: 150,
      type: 'number',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Teachers Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Teacher
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={teachers}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Teacher Name"
                  fullWidth
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              rules={{ 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />
            <Controller
              name="department_id"
              control={control}
              rules={{ required: 'Department is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Department"
                  fullWidth
                  margin="normal"
                  error={!!errors.department_id}
                  helperText={errors.department_id?.message}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="max_sessions_per_week"
              control={control}
              rules={{ 
                required: 'Max sessions per week is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 40, message: 'Cannot exceed 40' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Max Sessions Per Week"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.max_sessions_per_week}
                  helperText={errors.max_sessions_per_week?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={teacherMutation.isLoading}
            >
              {teacherMutation.isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

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

export default Teachers;
