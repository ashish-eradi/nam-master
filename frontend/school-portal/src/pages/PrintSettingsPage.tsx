import React, { useEffect, useRef, useState } from 'react';
import {
  Card, Row, Col, Select, Switch, Button, Divider, message, Spin, Space, Tag,
  Upload, Popconfirm, Alert, Typography,
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, CheckCircleOutlined, FileImageOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import {
  useGetPrintSettingsQuery,
  useUpdatePrintSettingsMutation,
  useUploadPrintTemplateMutation,
  useRemovePrintTemplateMutation,
} from '../services/financeApi';

const { Option } = Select;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4  (210 × 297 mm)  — Standard' },
  { value: 'A5', label: 'A5  (148 × 210 mm)  — Compact Slip' },
  { value: 'Letter', label: 'Letter  (216 × 279 mm)  — US Standard' },
];

const RECEIPT_TEMPLATES = [
  { value: 'classic', label: 'Classic', desc: 'Logo on left, school name on right. Colored table header.' },
  { value: 'modern', label: 'Modern', desc: 'Full-width color band header with white text. Bold & professional.' },
  { value: 'minimal', label: 'Minimal', desc: 'Plain black & white. No color fills. Clean and simple.' },
];

const FEE_DUE_TEMPLATES = [
  { value: 'formal', label: 'Formal', desc: 'Centered header, prominent FEE DUE NOTICE title. Colored table.' },
  { value: 'simple', label: 'Simple', desc: 'Left-aligned header, minimal color. Clean black table.' },
];

const COLOR_PRESETS = [
  '#4f46e5', '#2563eb', '#059669', '#dc2626',
  '#d97706', '#7c3aed', '#0f172a', '#0891b2',
];

const getApiBaseUrl = () => {
  if (window.location.hostname.includes('cloudshell.dev')) return window.location.origin + '/api/v1';
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1';
};

// ── Colour Picker ──────────────────────────────────────────────────────────────
const ColorDot: React.FC<{ color: string; selected: boolean; onClick: () => void }> = ({ color, selected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      width: 26, height: 26, borderRadius: '50%', background: color, cursor: 'pointer',
      border: selected ? '3px solid #1890ff' : '2px solid transparent',
      outline: selected ? '2px solid #1890ff' : 'none',
      transition: 'all 0.1s',
    }}
  />
);

const ColorPicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
    {COLOR_PRESETS.map((c) => (
      <ColorDot key={c} color={c} selected={value === c} onClick={() => onChange(c)} />
    ))}
    <input
      type="color" value={value} onChange={(e) => onChange(e.target.value)}
      title="Pick custom colour"
      style={{ width: 26, height: 26, border: 'none', cursor: 'pointer', borderRadius: '50%', padding: 0 }}
    />
    <div style={{ width: 48, height: 20, borderRadius: 4, background: value, border: '1px solid #ddd' }} />
    <Text type="secondary" style={{ fontSize: 12 }}>{value}</Text>
  </div>
);

// ── Template selector card ────────────────────────────────────────────────────
const TemplateTile: React.FC<{ tpl: { value: string; label: string; desc: string }; selected: boolean; onSelect: () => void }> = ({ tpl, selected, onSelect }) => (
  <div
    onClick={onSelect}
    style={{
      border: `2px solid ${selected ? '#4f46e5' : '#e0e0e0'}`,
      borderRadius: 8,
      padding: '10px 14px',
      cursor: 'pointer',
      background: selected ? '#f0f0ff' : '#fafafa',
      transition: 'all 0.15s',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
      <strong style={{ fontSize: 13 }}>{tpl.label}</strong>
      {selected && <Tag color="geekblue" style={{ fontSize: 11 }}>Active</Tag>}
    </div>
    <Text type="secondary" style={{ fontSize: 12 }}>{tpl.desc}</Text>
  </div>
);

// ── Template Upload Section ───────────────────────────────────────────────────
const TemplateUploadSection: React.FC<{
  docType: 'receipt' | 'fee_due';
  label: string;
  currentUrl?: string;
}> = ({ docType, label, currentUrl }) => {
  const [uploadTemplate, { isLoading: uploading }] = useUploadPrintTemplateMutation();
  const [removeTemplate, { isLoading: removing }] = useRemovePrintTemplateMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadTemplate({ doc_type: docType, file }).unwrap();
      message.success(`${label} template uploaded`);
    } catch (err: any) {
      message.error(err?.data?.detail || 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    try {
      await removeTemplate(docType).unwrap();
      message.success('Template removed');
    } catch {
      message.error('Failed to remove template');
    }
  };

  const isImage = currentUrl && (currentUrl.endsWith('.png') || currentUrl.endsWith('.jpg') || currentUrl.endsWith('.jpeg'));
  const isPdf = currentUrl && currentUrl.endsWith('.pdf');

  return (
    <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16, background: '#fafafa' }}>
      <div style={{ marginBottom: 10, fontWeight: 500 }}>{label}</div>
      {currentUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {isImage ? (
            <img
              src={`${getApiBaseUrl().replace('/api/v1', '')}${currentUrl}`}
              alt="template preview"
              style={{ height: 80, border: '1px solid #e0e0e0', borderRadius: 4, objectFit: 'contain', background: '#fff' }}
            />
          ) : isPdf ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#595959' }}>
              <FilePdfOutlined style={{ fontSize: 32, color: '#dc2626' }} />
              <Text style={{ fontSize: 12 }}>PDF template uploaded</Text>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileImageOutlined style={{ fontSize: 24 }} />
              <Text style={{ fontSize: 12 }}>Template file uploaded</Text>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} loading={uploading}>
              Replace
            </Button>
            <Popconfirm title="Remove this template?" onConfirm={handleRemove}>
              <Button size="small" danger icon={<DeleteOutlined />} loading={removing}>
                Remove
              </Button>
            </Popconfirm>
          </div>
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11 }}>Custom template active</Tag>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} loading={uploading}>
            Upload Template
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>PNG, JPG or PDF · Max 5 MB · Used as the page header / letterhead</Text>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
};

// ── Section component for receipt / fee-due ───────────────────────────────────
const DocSection: React.FC<{
  icon: string;
  title: string;
  settings: any;
  onChange: (patch: any) => void;
  templates: typeof RECEIPT_TEMPLATES;
  showSignature?: boolean;
  docType: 'receipt' | 'fee_due';
}> = ({ icon, title, settings, onChange, templates, showSignature, docType }) => (
  <Card
    title={<span style={{ fontWeight: 600 }}>{icon} {title}</span>}
    style={{ marginBottom: 28 }}
  >
    <Row gutter={[32, 0]}>
      {/* Left: options */}
      <Col xs={24} lg={11}>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Page Size</label>
          <Select value={settings.page_size} onChange={(v) => onChange({ page_size: v })} style={{ width: '100%' }}>
            {PAGE_SIZE_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Primary Colour</label>
          <ColorPicker value={settings.primary_color} onChange={(v) => onChange({ primary_color: v })} />
        </div>

        <Space size={28} style={{ marginBottom: 18 }}>
          <div>
            <label style={{ fontWeight: 500, marginRight: 8 }}>Show Logo</label>
            <Switch checked={settings.show_logo} onChange={(v) => onChange({ show_logo: v })} size="small" />
          </div>
          {showSignature && (
            <div>
              <label style={{ fontWeight: 500, marginRight: 8 }}>Signature Line</label>
              <Switch checked={settings.show_signature} onChange={(v) => onChange({ show_signature: v })} size="small" />
            </div>
          )}
        </Space>

        <Divider style={{ margin: '12px 0' }} />

        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Custom Template Upload</label>
          <Alert
            type="info"
            showIcon
            message="Upload your school's letterhead or a pre-designed header image. It will replace the programmatic header. Leave blank to use the template style below."
            style={{ fontSize: 12, marginBottom: 10 }}
          />
          <TemplateUploadSection
            docType={docType}
            label={title}
            currentUrl={settings.custom_template_url}
          />
        </div>
      </Col>

      {/* Right: template tiles */}
      <Col xs={24} lg={13}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>
          Design Template
          {settings.custom_template_url && (
            <Tag color="warning" style={{ marginLeft: 8, fontSize: 11 }}>Overridden by uploaded template</Tag>
          )}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((tpl) => (
            <TemplateTile
              key={tpl.value}
              tpl={tpl}
              selected={settings.template === tpl.value}
              onSelect={() => onChange({ template: tpl.value })}
            />
          ))}
        </div>
      </Col>
    </Row>
  </Card>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const PrintSettingsPage: React.FC = () => {
  const { data: saved, isLoading } = useGetPrintSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdatePrintSettingsMutation();

  const [receipt, setReceipt] = useState<any>({
    page_size: 'A4', template: 'classic', primary_color: '#4f46e5', show_logo: true, show_signature: true,
  });
  const [feeDue, setFeeDue] = useState<any>({
    page_size: 'A4', template: 'formal', primary_color: '#dc2626', show_logo: true,
  });

  useEffect(() => {
    if (saved) {
      if (saved.receipt) setReceipt(saved.receipt);
      if (saved.fee_due) setFeeDue(saved.fee_due);
    }
  }, [saved]);

  const handleSave = async () => {
    try {
      await updateSettings({ receipt, fee_due: feeDue }).unwrap();
      message.success('Print settings saved');
    } catch {
      message.error('Failed to save settings');
    }
  };

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 60 }} size="large" />;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Print Settings</Title>
        <Text type="secondary">Customise the page size, colour scheme, template design and letterhead for receipts and fee due notices.</Text>
      </div>

      <DocSection
        icon="🧾"
        title="Fee Receipt"
        docType="receipt"
        settings={receipt}
        onChange={(patch) => setReceipt((p: any) => ({ ...p, ...patch }))}
        templates={RECEIPT_TEMPLATES}
        showSignature
      />

      <DocSection
        icon="📋"
        title="Fee Due Letter"
        docType="fee_due"
        settings={feeDue}
        onChange={(patch) => setFeeDue((p: any) => ({ ...p, ...patch }))}
        templates={FEE_DUE_TEMPLATES}
      />

      <Button type="primary" size="large" loading={saving} onClick={handleSave} style={{ minWidth: 160 }}>
        Save Settings
      </Button>
    </div>
  );
};

export default PrintSettingsPage;
