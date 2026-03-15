import React, { useState, useEffect, useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { User } from '../services/usersApi';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation } from '../services/usersApi';
import { useGetSchoolsQuery, School } from '../services/schoolsApi'; // Import School and useGetSchoolsQuery
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import UserDetailCard from '../components/UserDetailCard'; // Import UserDetailCard
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Users = () => {
  const columns: GridColDef<User>[] = [
    { field: 'username', headerName: 'Username', width: 200 },
    { field: 'full_name', headerName: 'Full Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'school_id', headerName: 'School ID', width: 250 },
  ];

  const { data: users, isLoading } = useGetUsersQuery();
  const { data: schools, isLoading: schoolsLoading } = useGetSchoolsQuery(); // Fetch schools data
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null); // Track selected school
  const [open, setOpen] = useState(false); // Controls the user edit dialog
  const [openDetailDialog, setOpenDetailDialog] = useState(false); // Controls the UserDetailCard dialog
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formState, setFormState] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState<string>('');

  useEffect(() => {
    if (selectedUser) {
      setFormState(selectedUser);
      setNewPassword(''); // Clear new password field when selecting a user for edit
    } else {
      setFormState({});
      setNewPassword(''); // Clear new password field when creating a new user
    }
  }, [selectedUser]);

  const handleClickOpen = (user: User | null = null) => {
    setSelectedUser(user);
    setOpenDetailDialog(true); // Open the detail dialog first
  };

  const handleOpenEditDialog = (user: User | null = null) => {
    setSelectedUser(user);
    setOpen(true); // Open the edit dialog
    setOpenDetailDialog(false); // Close detail dialog if open
  };

  const handleClose = () => {
    setOpen(false); // Close edit dialog
    setOpenDetailDialog(false); // Close detail dialog
    setSelectedUser(null);
    setNewPassword(''); // Clear new password when closing dialog
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.name === 'newPassword') {
      setNewPassword(event.target.value);
    } else {
      setFormState({ ...formState, [event.target.name]: event.target.value });
    }
  };

  const handleSelectChange = (event: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = event.target;
    setFormState({ ...formState, [name as string]: value as string });
  };


  const handleSave = async () => {
    try {
      const userToSave = { ...formState };

      // Client-side validation for new user creation
      if (!selectedUser && !userToSave.password) {
        alert('Password is required for new users.');
        return; // Prevent saving if password is missing for new user
      }

      // Ensure school_id is set when creating a new user from within a school context
      if (!selectedUser && !userToSave.school_id && selectedSchool) {
        userToSave.school_id = selectedSchool.id;
      }

      // Validate that non-SUPERADMIN users have a school_id
      if (!selectedUser && userToSave.role !== 'SUPERADMIN' && !userToSave.school_id) {
        alert('School is required for non-SUPERADMIN users.');
        return;
      }

      if (newPassword) {
        // Assuming the backend API accepts a 'password' field for updates
        // This might need adjustment based on the actual backend API contract
        userToSave.password = newPassword;
      }
      if (selectedUser) {
        await updateUser({ id: selectedUser.id, body: userToSave }).unwrap();
      } else {
        await createUser(userToSave).unwrap();
      }
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { detail?: unknown } };
      if (apiErr.status === 422 && apiErr.data) {
        alert(`Failed to save user: ${JSON.stringify(apiErr.data.detail || apiErr.data)}`);
      } else {
        alert('Failed to save user. Please try again.');
      }
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      await deleteUser(selectedUser.id);
      handleClose();
    }
  };

  // Calculate user count per school
  const schoolUserCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    users?.forEach((user) => {
      if (user.school_id) {
        counts[user.school_id] = (counts[user.school_id] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  // Filter users by selected school
  const filteredUsers = useMemo(() => {
    if (!selectedSchool) return users || [];
    return users?.filter((user) => user.school_id === selectedSchool.id) || [];
  }, [users, selectedSchool]);

  // Handler for school card click
  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school);
  };

  // Handler for back button
  const handleBackToSchools = () => {
    setSelectedSchool(null);
  };

  // If no school is selected, show school cards
  if (!selectedSchool) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          User Management - Select a School
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Click on a school card to view and manage users from that school
        </Typography>
        {schoolsLoading ? (
          <Typography>Loading schools...</Typography>
        ) : (
          <Grid container spacing={3}>
            {schools?.map((school) => (
              <Grid item xs={12} sm={6} md={4} key={school.id}>
                <Card>
                  <CardActionArea onClick={() => handleSchoolClick(school)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="div">
                          {school.name}
                        </Typography>
                        <Chip
                          label={school.is_active ? 'Active' : 'Inactive'}
                          color={school.is_active ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Code: {school.code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Principal: {school.principal_name || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {school.city}, {school.state}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={`${schoolUserCounts[school.id] || 0} Users`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  }

  // If a school is selected, show users table for that school
  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToSchools}
          sx={{ mr: 2 }}
        >
          Back to Schools
        </Button>
        <Typography variant="h4">
          Users - {selectedSchool.name}
        </Typography>
      </Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => handleOpenEditDialog()}>
          Create User
        </Button>
        <Typography variant="body1" color="text.secondary" sx={{ alignSelf: 'center' }}>
          Total Users: {filteredUsers.length}
        </Typography>
      </Box>
      <DataGrid
        rows={filteredUsers}
        columns={columns}
        loading={isLoading}
        onRowClick={(params) => handleClickOpen(params.row)}
        autoHeight
      />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <TextField margin="normal" required fullWidth id="username" label="Username" name="username" value={formState.username || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="full_name" label="Full Name" name="full_name" value={formState.full_name || ''} onChange={handleInputChange} />
          <TextField margin="normal" required fullWidth id="email" label="Email" name="email" value={formState.email || ''} onChange={handleInputChange} />
          {selectedUser ? (
            <TextField
              margin="normal"
              fullWidth
              id="newPassword"
              label="New Password (leave blank to keep current)"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={handleInputChange}
            />
          ) : (
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="Password"
              name="password"
              type="password"
              value={formState.password || ''}
              onChange={(e) => setFormState({ ...formState, password: e.target.value })}
            />
          )}
          <FormControl margin="normal" required fullWidth>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={formState.role || ''}
              label="Role"
              onChange={handleSelectChange}
            >
              <MenuItem value="SUPERADMIN">SUPERADMIN</MenuItem>
              <MenuItem value="ADMIN">ADMIN</MenuItem>
              <MenuItem value="TEACHER">TEACHER</MenuItem>
              <MenuItem value="STUDENT">STUDENT</MenuItem>
              <MenuItem value="PARENT">PARENT</MenuItem>
            </Select>
          </FormControl>
          <FormControl margin="normal" fullWidth>
            <InputLabel id="school-id-label">School</InputLabel>
            <Select
              labelId="school-id-label"
              id="school_id"
              name="school_id"
              value={formState.school_id || selectedSchool?.id || ''}
              label="School"
              onChange={handleSelectChange}
            >
              {schools?.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          {selectedUser && <Button onClick={handleDelete} color="error">Delete</Button>}
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* User Detail Card Dialog */}
      <Dialog open={openDetailDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          {selectedUser && (
            <UserDetailCard
              user={selectedUser}
              onEdit={handleOpenEditDialog}
              onClose={handleClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Users;