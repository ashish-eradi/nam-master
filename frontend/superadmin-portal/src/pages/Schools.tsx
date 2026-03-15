import React, { useState, useEffect } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { School } from '../services/schoolsApi';
import { useGetSchoolsQuery, useCreateSchoolMutation, useUpdateSchoolMutation, useDeleteSchoolMutation } from '../services/schoolsApi';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField'; // Keep TextField import for now, might be removed later based on full wizard
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { DataGrid, GridRowParams } from '@mui/x-data-grid';
import SchoolWizard from '../components/SchoolWizard'; // Import SchoolWizard
import SchoolDetailCard from '../components/SchoolDetailCard'; // Import SchoolDetailCard

const Schools = () => {
  const columns: GridColDef<School>[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'principal_name', headerName: 'Principal', width: 180 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'is_offline',
      headerName: 'Mode',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value ? '💻 Offline' : '🌐 Online'}
          color={params.value ? 'warning' : 'default'}
          size="small"
          variant={params.value ? 'filled' : 'outlined'}
        />
      ),
    },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'state', headerName: 'State', width: 130 },
    { field: 'contact_phone', headerName: 'Phone', width: 140 },
    { field: 'contact_email', headerName: 'Email', width: 200 },
  ];

  const { data: schools, isLoading, error } = useGetSchoolsQuery();
  const [createSchool] = useCreateSchoolMutation();
  const [updateSchool] = useUpdateSchoolMutation();
  const [deleteSchool] = useDeleteSchoolMutation();

  const [open, setOpen] = useState(false); // Controls the SchoolWizard dialog
  const [openDetailDialog, setOpenDetailDialog] = useState(false); // Controls the SchoolDetailCard dialog
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [formState, setFormState] = useState<Partial<School>>({}); // Kept for DataGrid, but wizard manages its own
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]); // State for bulk delete

  useEffect(() => {
    if (selectedSchool) {
      setFormState(selectedSchool);
    } else {
      setFormState({});
    }
  }, [selectedSchool]);

  const handleClickOpen = (school: School | null = null) => {
    setSelectedSchool(school);
    setOpenDetailDialog(true); // Open the detail dialog first
  };

  const handleOpenWizard = (school: School | null = null) => {
    setSelectedSchool(school);
    setOpen(true); // Open the wizard dialog
    setOpenDetailDialog(false); // Close detail dialog if open
  };

  const handleClose = () => {
    setOpen(false); // Close wizard dialog
    setOpenDetailDialog(false); // Close detail dialog
    setSelectedSchool(null);
    setFormState({}); // Clear form state on close
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [event.target.name]: event.target.value });
  };

  const handleSave = async (formData: Partial<School>) => { // Modified to accept formData from wizard
    try {
      if (selectedSchool) {
        await updateSchool({ id: selectedSchool.id, body: formData }).unwrap();
      } else {
        await createSchool(formData).unwrap();
      }
      handleClose();
    } catch (err) {
      alert('Failed to save school. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (selectedSchool && window.confirm(`Are you sure you want to delete school: ${selectedSchool.name}?`)) {
      await deleteSchool(selectedSchool.id);
      handleClose();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSchoolIds.length > 0 && window.confirm(`Are you sure you want to delete ${selectedSchoolIds.length} selected schools?`)) {
      try {
        await Promise.all(selectedSchoolIds.map(id => deleteSchool(id).unwrap()));
        setSelectedSchoolIds([]); // Clear selection after deletion
      } catch (err) {
        alert('Failed to delete schools. Please try again.');
      }
    }
  };

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        School Management
      </Typography>
      <Button variant="contained" onClick={() => handleOpenWizard()} sx={{ mb: 2 }}>
        Create School
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={handleBulkDelete}
        disabled={selectedSchoolIds.length === 0}
        sx={{ mb: 2, ml: 2 }}
      >
        Delete Selected Schools ({selectedSchoolIds.length})
      </Button>
      <DataGrid
        rows={schools || []}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id} // Specify getRowId
        onRowClick={(params: GridRowParams<School>) => handleClickOpen(params.row)}
        checkboxSelection
        onRowSelectionModelChange={(newSelectionModel) => {
          setSelectedSchoolIds(newSelectionModel as string[]);
        }}
      />
      {/* School Wizard Dialog for Create/Edit */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{selectedSchool ? 'Edit School' : 'Create School'}</DialogTitle>
        <DialogContent>
          <SchoolWizard
            initialData={selectedSchool || {}}
            onSubmit={handleSave}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* School Detail Card Dialog */}
      <Dialog open={openDetailDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          {selectedSchool && (
            <SchoolDetailCard
              school={selectedSchool}
              onEdit={handleOpenWizard}
              onClose={handleClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Schools;