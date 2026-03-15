import React from 'react';
import { TextField, Box, Typography } from '@mui/material';
import { School } from '../../services/schoolsApi';

interface ContactDetailsStepProps {
  formData: Partial<School>;
  handleChange: (field: keyof School, value: any) => void;
}

const ContactDetailsStep: React.FC<ContactDetailsStepProps> = ({ formData, handleChange }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Step 2: Contact Details</Typography>
      <TextField
        margin="normal"
        fullWidth
        id="address"
        label="Address"
        name="address"
        value={formData.address || ''}
        onChange={(e) => handleChange('address', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        id="city"
        label="City"
        name="city"
        value={formData.city || ''}
        onChange={(e) => handleChange('city', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        id="state"
        label="State"
        name="state"
        value={formData.state || ''}
        onChange={(e) => handleChange('state', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        id="pincode"
        label="Pincode"
        name="pincode"
        value={formData.pincode || ''}
        onChange={(e) => handleChange('pincode', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        id="contact_phone"
        label="Phone"
        name="contact_phone"
        value={formData.contact_phone || ''}
        onChange={(e) => handleChange('contact_phone', e.target.value)}
      />
      <TextField
        margin="normal"
        fullWidth
        id="contact_email"
        label="Email"
        name="contact_email"
        value={formData.contact_email || ''}
        onChange={(e) => handleChange('contact_email', e.target.value)}
      />
    </Box>
  );
};

export default ContactDetailsStep;