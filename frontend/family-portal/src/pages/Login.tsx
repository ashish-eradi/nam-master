import React from 'react';
import { Form, Input, Button, Typography, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useLoginMutation } from '../services/authApi';
import { useDispatch } from 'react-redux';
import { setToken, setUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      const { access_token, user } = await login(values).unwrap();
      dispatch(setToken(access_token));
      dispatch(setUser(user));
      navigate('/dashboard');
    } catch {
      message.error('Invalid email or password. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Side - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandingContent}>
          <div style={styles.logoContainer}>
            <img src="/logo.png" alt="Niladri Edu Pro" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <Title level={1} style={styles.brandTitle}>
            Niladri Edu Pro
          </Title>
          <Text style={styles.brandSubtitle}>
            Family Portal
          </Text>
          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>
                <span style={styles.checkmark}>✓</span>
              </div>
              <Text style={styles.featureText}>Track your children's academic progress</Text>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>
                <span style={styles.checkmark}>✓</span>
              </div>
              <Text style={styles.featureText}>View attendance and grades in real-time</Text>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>
                <span style={styles.checkmark}>✓</span>
              </div>
              <Text style={styles.featureText}>Stay updated with school announcements</Text>
            </div>
            <div style={styles.featureItem}>
              <div style={styles.featureIcon}>
                <span style={styles.checkmark}>✓</span>
              </div>
              <Text style={styles.featureText}>Access timetables and library resources</Text>
            </div>
          </div>
        </div>
        <div style={styles.decorativeCircle1}></div>
        <div style={styles.decorativeCircle2}></div>
      </div>

      {/* Right Side - Login Form */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <Title level={2} style={styles.formTitle}>
              Welcome Back
            </Title>
            <Text style={styles.formSubtitle}>
              Sign in to access your family portal
            </Text>
          </div>

          <Form
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
            style={styles.form}
          >
            <Form.Item
              name="email"
              label={<span style={styles.label}>Email Address</span>}
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<UserOutlined style={styles.inputIcon} />}
                placeholder="Enter your email"
                style={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={styles.label}>Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={styles.inputIcon} />}
                placeholder="Enter your password"
                style={styles.input}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <div style={styles.rememberForgot}>
                <Checkbox>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Checkbox>
                <a href="#forgot" style={styles.forgotLink}>
                  Forgot password?
                </a>
              </div>
            </Form.Item>

            <Form.Item style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                style={styles.submitButton}
                block
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <div style={styles.footer}>
            <Text style={styles.footerText}>
              Having trouble signing in?{' '}
              <a href="#contact" style={styles.contactLink}>
                Contact Support
              </a>
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
  },
  leftPanel: {
    flex: '1 1 50%',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
    position: 'relative',
    overflow: 'hidden',
  },
  brandingContent: {
    position: 'relative',
    zIndex: 2,
    textAlign: 'center',
    maxWidth: '450px',
  },
  logoContainer: {
    marginBottom: '24px',
  },
  logoIcon: {
    width: '80px',
    height: '80px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    color: 'white',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  brandTitle: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1.25rem',
    fontWeight: 500,
    display: 'block',
    marginBottom: '48px',
  },
  featureList: {
    textAlign: 'left',
    padding: '0 16px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  featureIcon: {
    width: '28px',
    height: '28px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 700,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '1rem',
    lineHeight: '1.5',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: '-100px',
    right: '-100px',
    width: '400px',
    height: '400px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '50%',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: '-150px',
    left: '-100px',
    width: '300px',
    height: '300px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
  },
  rightPanel: {
    flex: '1 1 50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
    background: '#ffffff',
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  formTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
  },
  formSubtitle: {
    color: '#64748b',
    fontSize: '1rem',
  },
  form: {
    width: '100%',
  },
  label: {
    fontWeight: 500,
    color: '#374151',
    fontSize: '0.95rem',
  },
  input: {
    height: '50px',
    borderRadius: '12px',
    fontSize: '1rem',
  },
  inputIcon: {
    color: '#94a3b8',
    fontSize: '18px',
    marginRight: '8px',
  },
  rememberForgot: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberText: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
  forgotLink: {
    color: '#4f46e5',
    fontWeight: 500,
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
  submitButton: {
    height: '50px',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    border: 'none',
    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
  contactLink: {
    color: '#4f46e5',
    fontWeight: 500,
    textDecoration: 'none',
  },
};

export default LoginPage;
