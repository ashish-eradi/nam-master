import React, { useState, useRef } from 'react';
import { Card, CardContent, Typography, Button, Box, Chip, TextField, IconButton, Avatar } from '@mui/material';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon, PhotoCamera } from '@mui/icons-material';
import axios from 'axios';
import { School, useActivateSchoolMutation, useDeactivateSchoolMutation, useUpdateSchoolSmsApiKeyMutation } from '../services/schoolsApi';

interface SchoolDetailCardProps {
  school: School;
  onEdit: (school: School) => void;
  onClose: () => void;
}

const SchoolDetailCard: React.FC<SchoolDetailCardProps> = ({ school, onEdit, onClose }) => {
  const [activateSchool, { isLoading: isActivating }] = useActivateSchoolMutation();
  const [deactivateSchool, { isLoading: isDeactivating }] = useDeactivateSchoolMutation();
  const [updateSmsApiKey, { isLoading: isUpdatingApiKey }] = useUpdateSchoolSmsApiKeyMutation();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isEditingSmsApiKey, setIsEditingSmsApiKey] = useState(false);
  const [smsApiKeyValue, setSmsApiKeyValue] = useState(school.sms_api_key || '');
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
    } catch (error) {
      alert('Failed to activate school.');
    }
  };

  const handleDeactivate = async () => {
    if (window.confirm('Are you sure you want to deactivate this school? All users from this school will be unable to login.')) {
      try {
        await deactivateSchool(school.id).unwrap();
        alert('School deactivated successfully!');
      } catch {
        alert('Failed to deactivate school.');
      }
    }
  };

  const handleUpdateSmsApiKey = async () => {
    try {
      await updateSmsApiKey({ id: school.id, sms_api_key: smsApiKeyValue }).unwrap();
      alert('SMS API Key updated successfully!');
      setIsEditingSmsApiKey(false);
    } catch {
      alert('Failed to update SMS API Key.');
    }
  };

  const handleCancelEditApiKey = () => {
    setSmsApiKeyValue(school.sms_api_key || '');
    setIsEditingSmsApiKey(false);
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
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
            <Button
              size="small"
              startIcon={<PhotoCamera />}
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
              sx={{ mt: 0.5 }}
            >
              {isUploadingLogo ? 'Uploading…' : school.logo_url ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </Box>
        </Box>
        <Typography sx={{ mb: 1.5, mt: 1 }} color="text.secondary">
          Principal: {school.principal_name || 'N/A'}
        </Typography>
        <Typography variant="body2">
          Established: {school.established_date || 'N/A'}
        </Typography>
        <Typography variant="body2">
          Address: {school.address || 'N/A'}, {school.city || 'N/A'}, {school.state || 'N/A'} - {school.pincode || 'N/A'}
        </Typography>
        <Typography variant="body2">
          Phone: {school.contact_phone || 'N/A'}
        </Typography>
        <Typography variant="body2">
          Email: {school.contact_email || 'N/A'}
        </Typography>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" component="span" sx={{ mr: 1 }}>
            Status:
          </Typography>
          <Chip
            label={school.is_active ? 'Active' : 'Inactive'}
            color={school.is_active ? 'success' : 'error'}
            size="small"
          />
        </Box>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
            SMS API Key:
          </Typography>
          {isEditingSmsApiKey ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={smsApiKeyValue}
                onChange={(e) => setSmsApiKeyValue(e.target.value)}
                placeholder="Enter SMS API Key"
                disabled={isUpdatingApiKey}
              />
              <IconButton
                size="small"
                color="primary"
                onClick={handleUpdateSmsApiKey}
                disabled={isUpdatingApiKey}
              >
                <CheckIcon />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={handleCancelEditApiKey}
                disabled={isUpdatingApiKey}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', color: 'text.secondary' }}>
                {school.sms_api_key || 'Not configured'}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setIsEditingSmsApiKey(true)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box>
            {school.is_active ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate School'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={handleActivate}
                disabled={isActivating}
              >
                {isActivating ? 'Activating...' : 'Activate School'}
              </Button>
            )}
          </Box>
          <Box>
            <Button size="small" onClick={() => onEdit(school)} sx={{ mr: 1 }}>
              Edit
            </Button>
            <Button size="small" onClick={onClose}>
              Close
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SchoolDetailCard;