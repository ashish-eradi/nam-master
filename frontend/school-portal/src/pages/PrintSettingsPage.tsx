import React, { useEffect, useRef, useState } from 'react';
import {
  Card, Row, Col, Select, Switch, Button, Divider, message, Spin, Space, Tag,
  Popconfirm, Alert, Typography,
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

const FIELD_COLORS = [
  '#4f46e5', '#059669', '#dc2626', '#d97706',
  '#7c3aed', '#0891b2', '#be185d', '#65a30d',
  '#ea580c', '#1d4ed8',
];

const RECEIPT_FIELDS = [
  { key: 'receipt_no',    label: 'Receipt No' },
  { key: 'date',          label: 'Date' },
  { key: 'student_name',  label: 'Student Name' },
  { key: 'father_name',   label: "Father's Name" },
  { key: 'admission_no',  label: 'Admission No' },
  { key: 'class',         label: 'Class' },
  { key: 'payment_mode',  label: 'Payment Mode' },
  { key: 'fee_table',     label: 'Fee Details (list)' },
  { key: 'total',         label: 'Total Amount' },
  { key: 'outstanding',   label: 'Outstanding' },
];

const FEE_DUE_FIELDS = [
  { key: 'issue_date',         label: 'Issue Date' },
  { key: 'academic_year',      label: 'Academic Year' },
  { key: 'student_name',       label: 'Student Name' },
  { key: 'admission_no',       label: 'Admission No' },
  { key: 'class_name',         label: 'Class' },
  { key: 'father_name',        label: "Father's Name" },
  { key: 'outstanding_table',  label: 'Outstanding Fees (list)' },
  { key: 'total_outstanding',  label: 'Total Outstanding' },
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

// ── Visual Field Mapper ───────────────────────────────────────────────────────
const TemplateFieldMapper: React.FC<{
  docType: 'receipt' | 'fee_due';
  templateUrl: string;
  positions: Record<string, { x: number; y: number }>;
  onChange: (positions: Record<string, { x: number; y: number }>) => void;
  showLabels: boolean;
  onShowLabelsChange: (v: boolean) => void;
}> = ({ docType, templateUrl, positions, onChange, showLabels, onShowLabelsChange }) => {
  const fields = docType === 'receipt' ? RECEIPT_FIELDS : FEE_DUE_FIELDS;
  const [activeField, setActiveField] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Fetch template from backend (reads from DB base64, works after container restart)
  useEffect(() => {
    let objectUrl: string | null = null;
    setPreviewError(false);
    fetch(`${getApiBaseUrl()}/finance-extended/print-settings/template-preview/${docType}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
      })
      .catch(() => setPreviewError(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docType, templateUrl]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeField || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
    onChange({ ...positions, [activeField]: { x, y } });
    setActiveField(null);
  };

  const removeField = (key: string) => {
    const next = { ...positions };
    delete next[key];
    onChange(next);
  };

  const placedCount = Object.keys(positions).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Field Placement</span>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Click a field name → then click where it belongs on your template
        </Text>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Template preview with placed badges */}
        <div
          onClick={handleImageClick}
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 200,
            cursor: activeField ? 'crosshair' : 'default',
            border: activeField ? '2px dashed #4f46e5' : '1px solid #d9d9d9',
            borderRadius: 6,
            overflow: 'hidden',
            background: '#f0f0f0',
            userSelect: 'none',
          }}
        >
          {previewSrc ? (
            <img
              ref={imgRef}
              src={previewSrc}
              alt="template"
              draggable={false}
              style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
            />
          ) : previewError ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 13 }}>
              Preview unavailable — please re-upload the template to see it here
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 13 }}>
              Loading preview…
            </div>
          )}

          {/* Active placement hint */}
          {activeField && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(79,70,229,0.92)', color: '#fff', fontSize: 11,
              padding: '4px 14px', borderRadius: 20, pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              Click to place: <strong>{fields.find(f => f.key === activeField)?.label}</strong>
            </div>
          )}

          {/* Placed field badges */}
          {Object.entries(positions).map(([key, pos]) => {
            const field = fields.find(f => f.key === key);
            if (!field) return null;
            const colorIdx = fields.findIndex(f => f.key === key);
            const color = FIELD_COLORS[colorIdx % FIELD_COLORS.length];
            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: color,
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 12,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  lineHeight: '18px',
                }}
                onClick={(e) => { e.stopPropagation(); removeField(key); }}
                title="Click to remove"
              >
                {field.label} ✕
              </div>
            );
          })}
        </div>

        {/* Field list panel */}
        <div style={{ width: 178, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            {placedCount}/{fields.length} fields placed
          </div>

          {fields.map((f, idx) => {
            const placed = !!positions[f.key];
            const isActive = activeField === f.key;
            const color = FIELD_COLORS[idx % FIELD_COLORS.length];
            return (
              <div
                key={f.key}
                onClick={() => setActiveField(isActive ? null : f.key)}
                style={{
                  padding: '5px 8px',
                  marginBottom: 5,
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: isActive ? color : '#fff',
                  color: isActive ? '#fff' : '#333',
                  border: `1.5px solid ${isActive ? color : placed ? color : '#e0e0e0'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.12s, border 0.12s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isActive ? '#fff' : placed ? color : '#ccc',
                  }} />
                  {f.label}
                </span>
                {placed && !isActive && <span style={{ color, fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}

          <Divider style={{ margin: '10px 0' }} />

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Switch size="small" checked={showLabels} onChange={onShowLabelsChange} />
              <span style={{ fontSize: 12 }}>Show field labels</span>
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              Turn off if template has labels already printed
            </div>
          </div>

          {placedCount > 0 && (
            <Popconfirm title="Remove all field placements?" onConfirm={() => onChange({})}>
              <Button size="small" danger style={{ width: '100%' }}>
                Clear all
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
        Only placed fields appear in the PDF. Click a badge on the image to remove it. Save settings after placing all fields.
      </div>
    </div>
  );
};

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
              style={{ height: 60, border: '1px solid #e0e0e0', borderRadius: 4, objectFit: 'contain', background: '#fff' }}
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
          <Text type="secondary" style={{ fontSize: 12 }}>PNG or JPG for field placement · PDF also supported · Max 5 MB</Text>
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
}> = ({ icon, title, settings, onChange, templates, showSignature, docType }) => {
  const hasImageTemplate = settings.custom_template_url &&
    (settings.custom_template_url.endsWith('.png') ||
     settings.custom_template_url.endsWith('.jpg') ||
     settings.custom_template_url.endsWith('.jpeg'));

  return (
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
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Custom Template</label>
            <Alert
              type="info"
              showIcon
              message="Upload your full-page receipt design as PNG/JPG. Then place each field exactly where your template has the box for it."
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

      {/* Full-width field mapper — shown when PNG/JPG template is uploaded */}
      {hasImageTemplate && (
        <>
          <Divider style={{ margin: '20px 0 16px' }} />
          <TemplateFieldMapper
            docType={docType}
            templateUrl={settings.custom_template_url}
            positions={settings.custom_field_positions || {}}
            onChange={(pos) => onChange({ custom_field_positions: pos })}
            showLabels={settings.custom_show_labels ?? false}
            onShowLabelsChange={(v) => onChange({ custom_show_labels: v })}
          />
        </>
      )}
    </Card>
  );
};

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
        <Text type="secondary">Customise the page size, colour scheme, template design and field placement for receipts and fee due notices.</Text>
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
