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
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { departmentsAPI } from '../../services/api';

const Departments = () => {
  const [open, setOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      code: '',
      section: '',
      semester: 1,
      year: 1,
    },
  });

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery(
    'departments',
    async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    }
  );

  // Create/Update department mutation
  const departmentMutation = useMutation(
    async (departmentData) => {
      if (editingDepartment) {
        return await departmentsAPI.update(editingDepartment.id, departmentData);
      } else {
        return await departmentsAPI.create(departmentData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('departments');
        setOpen(false);
        setEditingDepartment(null);
        reset();
        setSnackbar({
          open: true,
          message: `Department ${editingDepartment ? 'updated' : 'created'} successfully!`,
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

  // Delete department mutation
  const deleteMutation = useMutation(
    async (departmentId) => {
      await departmentsAPI.delete(departmentId);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('departments');
        setSnackbar({
          open: true,
          message: 'Department deleted successfully!',
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
    setEditingDepartment(null);
    reset({
      name: '',
      code: '',
      section: '',
      semester: 1,
      year: 1,
    });
    setOpen(true);
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    reset({
      name: department.name,
      code: department.code,
      section: department.section,
      semester: department.semester,
      year: department.year,
    });
    setOpen(true);
  };

  const handleDelete = (departmentId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      deleteMutation.mutate(departmentId);
    }
  };

  const onSubmit = (data) => {
    departmentMutation.mutate(data);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'name', headerName: 'Department Name', width: 250 },
    { field: 'section', headerName: 'Section', width: 120 },
    { field: 'semester', headerName: 'Semester', width: 120, type: 'number' },
    { field: 'year', headerName: 'Year', width: 100, type: 'number' },
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
        <Typography variant="h4">Departments Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Department
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={departments}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDepartment ? 'Edit Department' : 'Add New Department'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="code"
              control={control}
              rules={{ required: 'Department code is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Department Code"
                  fullWidth
                  margin="normal"
                  error={!!errors.code}
                  helperText={errors.code?.message}
                />
              )}
            />
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Department name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Department Name"
                  fullWidth
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="section"
              control={control}
              rules={{ required: 'Section is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Section"
                  fullWidth
                  margin="normal"
                  error={!!errors.section}
                  helperText={errors.section?.message}
                />
              )}
            />
            <Controller
              name="semester"
              control={control}
              rules={{ 
                required: 'Semester is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 8, message: 'Cannot exceed 8' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Semester"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.semester}
                  helperText={errors.semester?.message}
                />
              )}
            />
            <Controller
              name="year"
              control={control}
              rules={{ 
                required: 'Year is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 4, message: 'Cannot exceed 4' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Year"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.year}
                  helperText={errors.year?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={departmentMutation.isLoading}
            >
              {departmentMutation.isLoading ? 'Saving...' : 'Save'}
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

export default Departments;
