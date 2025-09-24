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
import { roomsAPI, departmentsAPI } from '../../services/api';

const Rooms = () => {
  const [open, setOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      capacity: 30,
      type: 'classroom',
      department_id: '',
    },
  });

  // Fetch rooms
  const { data: rooms = [], isLoading } = useQuery(
    'rooms',
    async () => {
      const response = await roomsAPI.getAll();
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

  // Create/Update room mutation
  const roomMutation = useMutation(
    async (roomData) => {
      if (editingRoom) {
        return await roomsAPI.update(editingRoom.id, roomData);
      } else {
        return await roomsAPI.create(roomData);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rooms');
        setOpen(false);
        setEditingRoom(null);
        reset();
        setSnackbar({
          open: true,
          message: `Room ${editingRoom ? 'updated' : 'created'} successfully!`,
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

  // Delete room mutation
  const deleteMutation = useMutation(
    async (roomId) => {
      await roomsAPI.delete(roomId);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rooms');
        setSnackbar({
          open: true,
          message: 'Room deleted successfully!',
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
    setEditingRoom(null);
    reset({
      name: '',
      capacity: 30,
      type: 'classroom',
      department_id: '',
    });
    setOpen(true);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    reset({
      name: room.name,
      capacity: room.capacity,
      type: room.type,
      department_id: room.department_id,
    });
    setOpen(true);
  };

  const handleDelete = (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      deleteMutation.mutate(roomId);
    }
  };

  const onSubmit = (data) => {
    roomMutation.mutate(data);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Room Name', width: 200 },
    { field: 'capacity', headerName: 'Capacity', width: 120, type: 'number' },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 150,
      valueFormatter: (params) => params.value === 'classroom' ? 'Classroom' : 'Laboratory',
    },
    { 
      field: 'department_name', 
      headerName: 'Department', 
      width: 200,
      valueGetter: (params) => params.row.department_name || 'N/A',
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
        <Typography variant="h4">Rooms Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Room
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rooms}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRoom ? 'Edit Room' : 'Add New Room'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Room name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Room Name"
                  fullWidth
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="capacity"
              control={control}
              rules={{ 
                required: 'Capacity is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 200, message: 'Cannot exceed 200' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Capacity"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.capacity}
                  helperText={errors.capacity?.message}
                />
              )}
            />
            <Controller
              name="type"
              control={control}
              rules={{ required: 'Room type is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Room Type"
                  fullWidth
                  margin="normal"
                  error={!!errors.type}
                  helperText={errors.type?.message}
                >
                  <MenuItem value="classroom">Classroom</MenuItem>
                  <MenuItem value="laboratory">Laboratory</MenuItem>
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
                      {dept.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={roomMutation.isLoading}
            >
              {roomMutation.isLoading ? 'Saving...' : 'Save'}
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

export default Rooms;
