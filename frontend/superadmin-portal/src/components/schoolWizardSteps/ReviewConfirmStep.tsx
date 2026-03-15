import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableRow, Paper, Chip } from '@mui/material';
import { School } from '../../services/schoolsApi';

interface ReviewConfirmStepProps {
  formData: Partial<School>;
}

const ReviewConfirmStep: React.FC<ReviewConfirmStepProps> = ({ formData }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Step 3: Review & Confirm</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row">School Mode</TableCell>
              <TableCell>
                {formData.is_offline
                  ? <Chip icon={<span>💻</span>} label="Offline (Desktop App)" color="warning" size="small" />
                  : <Chip icon={<span>🌐</span>} label="Online (Cloud)" color="primary" size="small" variant="outlined" />
                }
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">School Name</TableCell>
              <TableCell>{formData.name || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">School Code</TableCell>
              <TableCell>{formData.code || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Principal Name</TableCell>
              <TableCell>{formData.principal_name || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Established Date</TableCell>
              <TableCell>{formData.established_date || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Address</TableCell>
              <TableCell>{formData.address || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">City</TableCell>
              <TableCell>{formData.city || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">State</TableCell>
              <TableCell>{formData.state || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Pincode</TableCell>
              <TableCell>{formData.pincode || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Phone</TableCell>
              <TableCell>{formData.contact_phone || 'N/A'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Email</TableCell>
              <TableCell>{formData.contact_email || 'N/A'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Please review all information before confirming.
      </Typography>
    </Box>
  );
};

export default ReviewConfirmStep;