import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { User } from '../services/usersApi';

interface UserDetailCardProps {
  user: User;
  onEdit: (user: User) => void;
  onClose: () => void;
}

const UserDetailCard: React.FC<UserDetailCardProps> = ({ user, onEdit, onClose }) => {
  return (
    <Card sx={{ minWidth: 275, m: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          {user.username}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          Email: {user.email || 'N/A'}
        </Typography>
        <Typography variant="body2">
          Role: {user.role || 'N/A'}
        </Typography>
        <Typography variant="body2">
          School ID: {user.school_id || 'N/A'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button size="small" onClick={() => onEdit(user)} sx={{ mr: 1 }}>
            Edit
          </Button>
          <Button size="small" onClick={onClose}>
            Close
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserDetailCard;