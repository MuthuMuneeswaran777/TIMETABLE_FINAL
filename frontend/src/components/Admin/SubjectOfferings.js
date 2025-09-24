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
import { subjectOfferingsAPI, subjectsAPI, teachersAPI, departmentsAPI } from '../../services/api';

const SubjectOfferings = () => {
  const [open, setOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      subject_id: '',
      teacher_id: '',
      department_id: '',
      max_periods_per_week: 3,
      max_periods_per_day: 2,
    },
  });

  // Fetch subject offerings
  const { data: offerings = [], isLoading } = useQuery(
    'subject-offerings',
    async () => {
      const response = await subjectOfferingsAPI.getAll();
      return response.data;
    }
  );

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery(
    'subjects',
    async () => {
      const response = await subjectsAPI.getAll();
      return response.data;
    }
  );

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery(
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

  // Create/Update offering mutation
  const offeringMutation = useMutation(
    async (offeringData) => {
      if (editingOffering) {
        return await subjectOfferingsAPI.update(editingOffering.id, offeringData);
      } else {
        return await subjectOfferingsAPI.create(offeringData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subject-offerings');
        setOpen(false);
        setEditingOffering(null);
        reset();
        setSnackbar({
          open: true,
          message: `Subject offering ${editingOffering ? 'updated' : 'created'} successfully!`,
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

  // Delete offering mutation
  const deleteMutation = useMutation(
    async (offeringId) => {
      await subjectOfferingsAPI.delete(offeringId);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subject-offerings');
        setSnackbar({
          open: true,
          message: 'Subject offering deleted successfully!',
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
    setEditingOffering(null);
    reset({
      subject_id: '',
      teacher_id: '',
      department_id: '',
      max_periods_per_week: 3,
      max_periods_per_day: 2,
    });
    setOpen(true);
  };

  const handleEdit = (offering) => {
    setEditingOffering(offering);
    reset({
      subject_id: offering.subject_id,
      teacher_id: offering.teacher_id,
      department_id: offering.department_id,
      max_periods_per_week: offering.max_periods_per_week,
      max_periods_per_day: offering.max_periods_per_day,
    });
    setOpen(true);
  };

  const handleDelete = (offeringId) => {
    if (window.confirm('Are you sure you want to delete this subject offering?')) {
      deleteMutation.mutate(offeringId);
    }
  };

  const onSubmit = (data) => {
    offeringMutation.mutate(data);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { 
      field: 'subject_name', 
      headerName: 'Subject', 
      width: 200,
      valueGetter: (params) => params.row.subject_name || 'N/A',
    },
    { 
      field: 'teacher_name', 
      headerName: 'Teacher', 
      width: 200,
      valueGetter: (params) => params.row.teacher_name || 'N/A',
    },
    { 
      field: 'department_name', 
      headerName: 'Department', 
      width: 200,
      valueGetter: (params) => params.row.department_name || 'N/A',
    },
    { 
      field: 'max_periods_per_week', 
      headerName: 'Max Periods/Week', 
      width: 150,
      type: 'number',
    },
    { 
      field: 'max_periods_per_day', 
      headerName: 'Max Periods/Day', 
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
        <Typography variant="h4">Subject Offerings Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Subject Offering
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={offerings}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOffering ? 'Edit Subject Offering' : 'Add New Subject Offering'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="subject_id"
              control={control}
              rules={{ required: 'Subject is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Subject"
                  fullWidth
                  margin="normal"
                  error={!!errors.subject_id}
                  helperText={errors.subject_id?.message}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="teacher_id"
              control={control}
              rules={{ required: 'Teacher is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Teacher"
                  fullWidth
                  margin="normal"
                  error={!!errors.teacher_id}
                  helperText={errors.teacher_id?.message}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </TextField>
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
                      {dept.name} - {dept.section}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="max_periods_per_week"
              control={control}
              rules={{ 
                required: 'Max periods per week is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 10, message: 'Cannot exceed 10' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Max Periods Per Week"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.max_periods_per_week}
                  helperText={errors.max_periods_per_week?.message}
                />
              )}
            />
            <Controller
              name="max_periods_per_day"
              control={control}
              rules={{ 
                required: 'Max periods per day is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 4, message: 'Cannot exceed 4' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Max Periods Per Day"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.max_periods_per_day}
                  helperText={errors.max_periods_per_day?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={offeringMutation.isLoading}
            >
              {offeringMutation.isLoading ? 'Saving...' : 'Save'}
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

export default SubjectOfferings;
