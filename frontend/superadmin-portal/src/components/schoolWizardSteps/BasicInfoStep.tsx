import React from 'react';
import { TextField, Box, Typography, Paper, Alert } from '@mui/material';
import LaptopIcon from '@mui/icons-material/Laptop';
import CloudIcon from '@mui/icons-material/Cloud';
import { School } from '../../services/schoolsApi';

interface BasicInfoStepProps {
  formData: Partial<School>;
  handleChange: (field: keyof School, value: any) => void;
  isEditMode?: boolean;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ formData, handleChange, isEditMode = false }) => {
  const isOffline = formData.is_offline === true;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Step 1: Basic Information</Typography>

      {/* ── Online / Offline mode selector ─────────────────────────────── */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
        School Mode <span style={{ color: 'red' }}>*</span>
      </Typography>

      {isEditMode ? (
        /* Locked in edit mode */
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Mode cannot be changed after the school is created.</strong>
          {' '}Switching between Online and Offline would cause data loss since they use separate databases.
          <br />
          Current mode: <strong>{isOffline ? '💻 Offline (Desktop App)' : '🌐 Online (Cloud)'}</strong>
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {/* Online option */}
          <Paper
            elevation={0}
            onClick={() => handleChange('is_offline', false)}
            sx={{
              flex: 1,
              p: 2,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: !isOffline ? 'primary.main' : 'divider',
              borderRadius: 2,
              background: !isOffline ? 'rgba(37,99,235,0.07)' : 'background.paper',
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.main', background: 'rgba(37,99,235,0.05)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CloudIcon color={!isOffline ? 'primary' : 'disabled'} />
              <Typography fontWeight={700} color={!isOffline ? 'primary.main' : 'text.primary'}>
                Online
              </Typography>
              {!isOffline && (
                <Typography variant="caption" sx={{ ml: 'auto', bgcolor: 'primary.main', color: '#fff', px: 1, borderRadius: 1 }}>
                  Selected
                </Typography>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              School uses the cloud-based web portal. Data lives on the central server. Internet required.
            </Typography>
          </Paper>

          {/* Offline option */}
          <Paper
            elevation={0}
            onClick={() => handleChange('is_offline', true)}
            sx={{
              flex: 1,
              p: 2,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: isOffline ? 'warning.main' : 'divider',
              borderRadius: 2,
              background: isOffline ? 'rgba(217,119,6,0.07)' : 'background.paper',
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'warning.main', background: 'rgba(217,119,6,0.05)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <LaptopIcon color={isOffline ? 'warning' : 'disabled'} />
              <Typography fontWeight={700} color={isOffline ? 'warning.main' : 'text.primary'}>
                Offline
              </Typography>
              {isOffline && (
                <Typography variant="caption" sx={{ ml: 'auto', bgcolor: 'warning.main', color: '#fff', px: 1, borderRadius: 1 }}>
                  Selected
                </Typography>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              School uses the desktop app on their own computer. No internet needed. Requires a license key.
            </Typography>
          </Paper>
        </Box>
      )}

      {/* ── Standard fields ─────────────────────────────────────────────── */}
      <TextField
        margin="normal"
        required
        fullWidth
        label="School Name"
        value={formData.name || ''}
        onChange={(e) => handleChange('name', e.target.value)}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        label="School Code"
        value={formData.code || ''}
        onChange={(e) => handleChange('code', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        label="Principal Name"
        value={formData.principal_name || ''}
        onChange={(e) => handleChange('principal_name', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        label="Established Date"
        value={formData.established_date || ''}
        onChange={(e) => handleChange('established_date', e.target.value)}
      />
    </Box>
  );
};

export default BasicInfoStep;
