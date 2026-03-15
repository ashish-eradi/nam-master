import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LaptopIcon from '@mui/icons-material/Laptop';
import CloudIcon from '@mui/icons-material/Cloud';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useGetSchoolsQuery } from '../services/schoolsApi';
import {
  useGetLicensesQuery,
  useGenerateLicenseMutation,
  useRevokeLicenseMutation,
  LicenseResponse,
} from '../services/licensesApi';

const VALIDITY_OPTIONS = [
  { value: 30,  label: '30 Days' },
  { value: 90,  label: '90 Days' },
  { value: 180, label: '180 Days' },
  { value: 365, label: '1 Year' },
  { value: 0,   label: 'Custom' },
];

// ─── Generate Dialog ──────────────────────────────────────────────────────────
interface GenerateDialogProps {
  open: boolean;
  schools: any[];
  preselectedSchoolId?: string;
  onClose: () => void;
}

function GenerateDialog({ open, schools, preselectedSchoolId, onClose }: GenerateDialogProps) {
  const [generateLicense] = useGenerateLicenseMutation();
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [validityOption, setValidityOption] = useState(365);
  const [customDays, setCustomDays] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedExpiry, setGeneratedExpiry] = useState<string | null>(null);
  const [generatedSchoolName, setGeneratedSchoolName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedSchoolId(preselectedSchoolId || '');
      setValidityOption(365);
      setCustomDays('');
      setNotes('');
      setGeneratedKey(null);
      setGeneratedExpiry(null);
      setGeneratedSchoolName(null);
      setCopied(false);
      setError(null);
    }
  }, [open, preselectedSchoolId]);

  const handleGenerate = async () => {
    const days = validityOption === 0 ? parseInt(customDays) : validityOption;
    if (!days || days <= 0) { setError('Enter a valid number of days'); return; }
    if (!selectedSchoolId) { setError('Select a school'); return; }
    try {
      const result = await generateLicense({
        school_id: selectedSchoolId,
        validity_days: days,
        notes: notes || undefined,
      }).unwrap();
      setGeneratedKey(result.license_key);
      setGeneratedExpiry(result.expires_at);
      setGeneratedSchoolName(result.school_name);
      setError(null);
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to generate license key');
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VpnKeyIcon color="primary" /> Generate License Key
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {generatedKey ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              License key generated for <strong>{generatedSchoolName}</strong>!
              <br />Expires: {generatedExpiry ? new Date(generatedExpiry).toLocaleDateString() : ''}
            </Alert>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Copy and give this key to the school admin:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <TextField
                multiline fullWidth minRows={3} maxRows={6}
                value={generatedKey}
                InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton onClick={handleCopy} color={copied ? 'success' : 'default'}>
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select label="Select School" value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)} fullWidth
            >
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {s.is_offline ? <LaptopIcon fontSize="small" color="warning" /> : <CloudIcon fontSize="small" color="primary" />}
                    {s.name} ({s.code})
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Validity Period" value={validityOption}
              onChange={(e) => setValidityOption(Number(e.target.value))} fullWidth
            >
              {VALIDITY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            {validityOption === 0 && (
              <TextField
                label="Number of Days" type="number" value={customDays}
                onChange={(e) => setCustomDays(e.target.value)} fullWidth
              />
            )}
            <TextField
              label="Notes (optional)" value={notes}
              onChange={(e) => setNotes(e.target.value)} multiline rows={2} fullWidth
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{generatedKey ? 'Close' : 'Cancel'}</Button>
        {!generatedKey && (
          <Button variant="contained" onClick={handleGenerate} startIcon={<VpnKeyIcon />}>
            Generate
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Licenses: React.FC = () => {
  const { data: schools = [], isLoading: schoolsLoading } = useGetSchoolsQuery();
  const { data: licenses = [], isLoading: licensesLoading } = useGetLicensesQuery();
  const [revokeLicense] = useRevokeLicenseMutation();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [preselectedSchoolId, setPreselectedSchoolId] = useState<string | undefined>();

  // Build latest license info per school
  const licenseMap: Record<string, { status: string; expiresAt: string | null; daysLeft: number | null }> = {};
  for (const school of schools) {
    const active = licenses.filter((l) => l.school_id === school.id && !l.is_revoked);
    const latest = active[0] ?? null;
    if (latest) {
      const exp  = new Date(latest.expires_at);
      const now  = new Date();
      const days = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / 86400000));
      licenseMap[school.id] = {
        status:    exp < now ? 'Expired' : 'Active',
        expiresAt: latest.expires_at,
        daysLeft:  exp < now ? 0 : days,
      };
    } else {
      licenseMap[school.id] = { status: 'None', expiresAt: null, daysLeft: null };
    }
  }

  const openGenerate = (schoolId?: string) => {
    setPreselectedSchoolId(schoolId);
    setGenerateOpen(true);
  };

  const handleRevoke = async (licenseId: string) => {
    if (window.confirm('Revoke this license key? The school will be locked out immediately.')) {
      try { await revokeLicense(licenseId).unwrap(); }
      catch (err: any) { alert(err?.data?.detail || 'Failed to revoke'); }
    }
  };

  // ── Schools table ──────────────────────────────────────────────────────────
  const schoolColumns: GridColDef[] = [
    { field: 'name', headerName: 'School Name', flex: 1, minWidth: 180 },
    { field: 'code', headerName: 'Code', width: 110 },
    {
      field: 'is_offline', headerName: 'Mode', width: 120,
      renderCell: (p) => (
        <Chip
          icon={p.value ? <LaptopIcon fontSize="small" /> : <CloudIcon fontSize="small" />}
          label={p.value ? 'Offline' : 'Online'}
          color={p.value ? 'warning' : 'default'}
          size="small"
          variant={p.value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'licenseStatus', headerName: 'License', width: 130,
      renderCell: (p) => {
        const info = licenseMap[p.row.id];
        if (!info || info.status === 'None') return <Chip label="No License" size="small" />;
        if (info.status === 'Expired')       return <Chip label="Expired" color="error" size="small" />;
        return <Chip label="Active" color="success" size="small" />;
      },
    },
    {
      field: 'expiresAt', headerName: 'Expires', width: 130,
      renderCell: (p) => {
        const d = licenseMap[p.row.id]?.expiresAt;
        return d ? new Date(d).toLocaleDateString() : '—';
      },
    },
    {
      field: 'daysLeft', headerName: 'Days Left', width: 100,
      renderCell: (p) => {
        const d = licenseMap[p.row.id]?.daysLeft;
        if (d === null) return '—';
        return (
          <Chip
            label={d}
            size="small"
            color={d === 0 ? 'error' : d <= 30 ? 'warning' : 'success'}
          />
        );
      },
    },
    {
      field: 'actions', headerName: '', width: 150, sortable: false,
      renderCell: (p) => (
        <Button
          size="small"
          variant="contained"
          startIcon={<VpnKeyIcon />}
          onClick={(e) => { e.stopPropagation(); openGenerate(p.row.id); }}
        >
          Generate Key
        </Button>
      ),
    },
  ];

  // ── License history table ─────────────────────────────────────────────────
  const historyColumns: GridColDef<LicenseResponse>[] = [
    { field: 'school_name', headerName: 'School', flex: 1, minWidth: 160 },
    {
      field: 'issued_at', headerName: 'Issued', width: 130,
      renderCell: (p) => new Date(p.value).toLocaleDateString(),
    },
    {
      field: 'expires_at', headerName: 'Expires', width: 130,
      renderCell: (p) => new Date(p.value).toLocaleDateString(),
    },
    {
      field: 'is_revoked', headerName: 'Status', width: 110,
      renderCell: (p) => {
        if (p.value) return <Chip label="Revoked" size="small" />;
        if (new Date(p.row.expires_at) < new Date()) return <Chip label="Expired" color="error" size="small" />;
        return <Chip label="Active" color="success" size="small" />;
      },
    },
    { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 140 },
    {
      field: 'revoke', headerName: '', width: 110, sortable: false,
      renderCell: (p) => p.row.is_revoked ? null : (
        <Button
          variant="outlined" color="error" size="small"
          onClick={(e) => { e.stopPropagation(); handleRevoke(p.row.id); }}
        >
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">License Management</Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<VpnKeyIcon />}
          onClick={() => openGenerate()}
        >
          Generate License Key
        </Button>
      </Box>

      {/* ── Schools table ── */}
      <Typography variant="h6" sx={{ mb: 1 }}>Schools</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click <strong>Generate Key</strong> on any row to issue a license key for that school.
      </Typography>
      <Box sx={{ height: 420, mb: 4 }}>
        <DataGrid
          rows={schools}
          columns={schoolColumns}
          loading={schoolsLoading}
          getRowId={(r) => r.id}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── History table ── */}
      <Typography variant="h6" sx={{ mb: 1 }}>License Key History</Typography>
      <Box sx={{ height: 380 }}>
        <DataGrid
          rows={licenses}
          columns={historyColumns}
          loading={licensesLoading}
          getRowId={(r) => r.id}
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <GenerateDialog
        open={generateOpen}
        schools={schools}
        preselectedSchoolId={preselectedSchoolId}
        onClose={() => setGenerateOpen(false)}
      />
    </Box>
  );
};

export default Licenses;
