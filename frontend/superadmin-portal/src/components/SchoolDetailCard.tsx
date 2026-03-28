import React, { useState, useRef } from 'react';
import { Card, CardContent, Typography, Button, Box, Chip, Avatar } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import axios from 'axios';
import { School, useActivateSchoolMutation, useDeactivateSchoolMutation } from '../services/schoolsApi';

interface SchoolDetailCardProps {
  school: School;
  onEdit: (school: School) => void;
  onClose: () => void;
}

const SchoolDetailCard: React.FC<SchoolDetailCardProps> = ({ school, onEdit, onClose }) => {
  const [activateSchool, { isLoading: isActivating }] = useActivateSchoolMutation();
  const [deactivateSchool, { isLoading: isDeactivating }] = useDeactivateSchoolMutation();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsUploadingLogo(true);
      await axios.post(`/api/v1/schools/${school.id}/logo`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.reload();
    } catch (err: any) {
      alert('Failed to upload logo: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleActivate = async () => {
    try {
      await activateSchool(school.id).unwrap();
      alert('School activated successfully!');
    } catch {
      alert('Failed to activate school.');
    }
  };

  const handleDeactivate = async () => {
    if (window.confirm('Are you sure you want to deactivate this school?')) {
      try {
        await deactivateSchool(school.id).unwrap();
        alert('School deactivated successfully!');
      } catch {
        alert('Failed to deactivate school.');
      }
    }
  };

  return (
    <Card sx={{ minWidth: 275, m: 2 }}>
      <CardContent>
        {/* School Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src={school.logo_url ? `${BACKEND_URL}${school.logo_url}` : undefined}
            sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}
          >
            {!school.logo_url && school.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" component="div">
              {school.name} ({school.code})
            </Typography>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            <Button size="small" startIcon={<PhotoCamera />} onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo} sx={{ mt: 0.5 }}>
              {isUploadingLogo ? 'Uploading…' : school.logo_url ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </Box>
        </Box>

        <Typography sx={{ mb: 1.5, mt: 1 }} color="text.secondary">Principal: {school.principal_name || 'N/A'}</Typography>
        <Typography variant="body2">Established: {school.established_date || 'N/A'}</Typography>
        <Typography variant="body2">Address: {school.address || 'N/A'}, {school.city || 'N/A'}, {school.state || 'N/A'} - {school.pincode || 'N/A'}</Typography>
        <Typography variant="body2">Phone: {school.contact_phone || 'N/A'}</Typography>
        <Typography variant="body2">Email: {school.contact_email || 'N/A'}</Typography>

        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" component="span" sx={{ mr: 1 }}>Status:</Typography>
          <Chip label={school.is_active ? 'Active' : 'Inactive'} color={school.is_active ? 'success' : 'error'} size="small" />
        </Box>

        {/* WhatsApp — Meta Cloud API */}
        <Box sx={{ mt: 2, mb: 1, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            WhatsApp (Meta Cloud API)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
            Each school connects their own WhatsApp Business Account via the Embedded Signup flow inside the school portal (Settings → WhatsApp).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box>
            {school.is_active ? (
              <Button variant="outlined" color="error" size="small" onClick={handleDeactivate} disabled={isDeactivating}>
                {isDeactivating ? 'Deactivating...' : 'Deactivate School'}
              </Button>
            ) : (
              <Button variant="outlined" color="success" size="small" onClick={handleActivate} disabled={isActivating}>
                {isActivating ? 'Activating...' : 'Activate School'}
              </Button>
            )}
          </Box>
          <Box>
            <Button size="small" onClick={() => onEdit(school)} sx={{ mr: 1 }}>Edit</Button>
            <Button size="small" onClick={onClose}>Close</Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SchoolDetailCard;
