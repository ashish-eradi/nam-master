import React, { useState } from 'react';
import { Typography, Input, Button, message, Result } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useActivateLicenseMutation } from '../services/licenseApi';
import { useDispatch } from 'react-redux';
import { setLicenseExpired } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const LicenseExpired: React.FC = () => {
  const [showInput, setShowInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [activateLicense, { isLoading }] = useActivateLicenseMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      message.error('Please enter a license key');
      return;
    }
    try {
      await activateLicense({ license_key: licenseKey.trim() }).unwrap();
      dispatch(setLicenseExpired(false));
      message.success('License activated successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      const detail = err?.data?.detail || 'Failed to activate license key';
      message.error(detail);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Result
          icon={<LockOutlined style={{ color: '#ef4444', fontSize: '64px' }} />}
          title={
            <Title level={2} style={{ color: '#1e293b', marginBottom: 0 }}>
              License Expired
            </Title>
          }
          subTitle={
            <Text style={{ color: '#64748b', fontSize: '1rem' }}>
              Your school license has expired. Please contact your administrator for a new license key.
            </Text>
          }
          extra={
            !showInput ? (
              <Button
                type="primary"
                size="large"
                icon={<KeyOutlined />}
                onClick={() => setShowInput(true)}
                style={styles.enterKeyButton}
              >
                Enter License Key
              </Button>
            ) : (
              <div style={styles.inputContainer}>
                <Input.TextArea
                  placeholder="Paste your license key here..."
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  rows={4}
                  style={styles.input}
                />
                <div style={styles.buttonRow}>
                  <Button onClick={() => setShowInput(false)}>Cancel</Button>
                  <Button
                    type="primary"
                    loading={isLoading}
                    onClick={handleActivate}
                    style={styles.activateButton}
                  >
                    Activate
                  </Button>
                </div>
              </div>
            )
          }
        />
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '24px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
  },
  enterKeyButton: {
    height: '48px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
    border: 'none',
    paddingLeft: '32px',
    paddingRight: '32px',
  },
  inputContainer: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  activateButton: {
    background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
    border: 'none',
  },
};

export default LicenseExpired;
