
import { Button, Box, Typography } from '@mui/material';

const Reports = () => {
  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <Button variant="contained" onClick={() => handleDownload('/api/v1/reports/attendance')} sx={{ m: 1 }}>
        Download Attendance Report
      </Button>
      <Button variant="contained" onClick={() => handleDownload('/api/v1/reports/grades')} sx={{ m: 1 }}>
        Download Grades Report
      </Button>
      <Button variant="contained" onClick={() => handleDownload('/api/v1/reports/financial')} sx={{ m: 1 }}>
        Download Financial Report
      </Button>
      <Button variant="contained" onClick={() => handleDownload('/api/v1/reports/students')} sx={{ m: 1 }}>
        Download Students Report
      </Button>
    </Box>
  );
};

export default Reports;
