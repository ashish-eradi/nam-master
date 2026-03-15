
import React, { useState, useEffect } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Hostel } from '../services/hostelApi';
import { useGetHostelsQuery, useCreateHostelMutation, useUpdateHostelMutation, useDeleteHostelMutation } from '../services/hostelApi';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { DataGrid, GridRowParams } from '@mui/x-data-grid';

const Hostels = () => {
  const columns: GridColDef<Hostel>[] = [
    { field: 'name', headerName: 'Hostel Name', width: 200 },
    { field: 'school_id', headerName: 'School ID', width: 250 },
    { field: 'hostel_type', headerName: 'Type', width: 150 },
    { field: 'total_rooms', headerName: 'Total Rooms', width: 150 },
    { field: 'warden_name', headerName: 'Warden Name', width: 200 },
  ];

  const { data: hostels, isLoading } = useGetHostelsQuery();
  const [createHostel] = useCreateHostelMutation();
  const [updateHostel] = useUpdateHostelMutation();
  const [deleteHostel] = useDeleteHostelMutation();

  const [open, setOpen] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [formState, setFormState] = useState<Partial<Hostel>>({});

  useEffect(() => {
    if (selectedHostel) {
      setFormState(selectedHostel);
    } else {
      setFormState({});
    }
  }, [selectedHostel]);

  const handleClickOpen = (hostel: Hostel | null = null) => {
    setSelectedHostel(hostel);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedHostel(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [event.target.name]: event.target.value });
  };

  const handleSave = async () => {
    if (selectedHostel) {
      await updateHostel({ id: selectedHostel.id, body: formState });
    } else {
      await createHostel(formState);
    }
    handleClose();
  };

  const handleDelete = async () => {
    if (selectedHostel) {
      await deleteHostel(selectedHostel.id);
      handleClose();
    }
  };

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Global Hostel Management
      </Typography>
      <Button variant="contained" onClick={() => handleClickOpen()} sx={{ mb: 2 }}>
        Create Hostel
      </Button>
      <DataGrid
        rows={hostels || []}
        columns={columns}
        loading={isLoading}
        onRowClick={(params: GridRowParams<Hostel>) => handleClickOpen(params.row)}
      />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedHostel ? 'Edit Hostel' : 'Create Hostel'}</DialogTitle>
        <DialogContent>
          <TextField margin="normal" required fullWidth id="name" label="Hostel Name" name="name" value={formState.name || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="school_id" label="School ID" name="school_id" value={formState.school_id || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="hostel_type" label="Type" name="hostel_type" value={formState.hostel_type || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth type="number" id="total_rooms" label="Total Rooms" name="total_rooms" value={formState.total_rooms || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="warden_name" label="Warden Name" name="warden_name" value={formState.warden_name || ''} onChange={handleInputChange} />
        </DialogContent>
        <DialogActions>
          {selectedHostel && <Button onClick={handleDelete} color="error">Delete</Button>}
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Hostels;
