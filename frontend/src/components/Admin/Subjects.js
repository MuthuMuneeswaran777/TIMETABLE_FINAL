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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { subjectsAPI, departmentsAPI } from '../../services/api';

const Subjects = () => {
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      code: '',
      department_id: '',
      is_lab: false,
      credits: 3,
    },
  });

  // Fetch subjects
  const { data: subjects = [], isLoading } = useQuery(
    'subjects',
    async () => {
      const response = await subjectsAPI.getAll();
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

  // Create/Update subject mutation
  const subjectMutation = useMutation(
    async (subjectData) => {
      if (editingSubject) {
        return await subjectsAPI.update(editingSubject.id, subjectData);
      } else {
        return await subjectsAPI.create(subjectData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subjects');
        setOpen(false);
        setEditingSubject(null);
        reset();
        setSnackbar({
          open: true,
          message: `Subject ${editingSubject ? 'updated' : 'created'} successfully!`,
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

  // Delete subject mutation
  const deleteMutation = useMutation(
    async (subjectId) => {
      await subjectsAPI.delete(subjectId);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subjects');
        setSnackbar({
          open: true,
          message: 'Subject deleted successfully!',
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
    setEditingSubject(null);
    reset({
      name: '',
      code: '',
      department_id: '',
      is_lab: false,
      credits: 3,
    });
    setOpen(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    reset({
      name: subject.name,
      code: subject.code,
      department_id: subject.department_id,
      is_lab: subject.is_lab,
      credits: subject.credits,
    });
    setOpen(true);
  };

  const handleDelete = (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      deleteMutation.mutate(subjectId);
    }
  };

  const onSubmit = (data) => {
    subjectMutation.mutate(data);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'name', headerName: 'Subject Name', width: 250 },
    { 
      field: 'department_name', 
      headerName: 'Department', 
      width: 200,
      valueGetter: (params) => params.row.department_name || 'N/A',
    },
    { 
      field: 'is_lab', 
      headerName: 'Type', 
      width: 120,
      valueGetter: (params) => params.row.is_lab ? 'Lab' : 'Theory',
    },
    { 
      field: 'credits', 
      headerName: 'Credits', 
      width: 100,
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
        <Typography variant="h4">Subjects Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Subject
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={subjects}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSubject ? 'Edit Subject' : 'Add New Subject'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="code"
              control={control}
              rules={{ required: 'Subject code is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Subject Code"
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
              rules={{ required: 'Subject name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Subject Name"
                  fullWidth
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
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
              name="credits"
              control={control}
              rules={{ 
                required: 'Credits is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 10, message: 'Cannot exceed 10' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Credits"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.credits}
                  helperText={errors.credits?.message}
                />
              )}
            />
            <Controller
              name="is_lab"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value}
                    />
                  }
                  label="Is Laboratory Subject"
                  sx={{ mt: 2 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={subjectMutation.isLoading}
            >
              {subjectMutation.isLoading ? 'Saving...' : 'Save'}
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

export default Subjects;
