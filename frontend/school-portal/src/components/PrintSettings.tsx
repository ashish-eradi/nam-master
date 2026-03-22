import React, { useEffect, useState } from 'react';
import { Card, Form, Select, Radio, Switch, Button, Row, Col, Divider, message, Spin, Space, Tag } from 'antd';
import { useGetPrintSettingsQuery, useUpdatePrintSettingsMutation } from '../services/financeApi';

const { Option } = Select;

const PAGE_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4 (210 × 297 mm) — Standard' },
  { value: 'A5', label: 'A5 (148 × 210 mm) — Compact / Slip' },
  { value: 'Letter', label: 'Letter (216 × 279 mm) — US Standard' },
];

const RECEIPT_TEMPLATES = [
  {
    value: 'classic',
    label: 'Classic',
    desc: 'Logo on left, school name on right. Colored header row in table.',
  },
  {
    value: 'modern',
    label: 'Modern',
    desc: 'Full-width color band header with white text. Bold and professional.',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    desc: 'Plain black & white. Double-line border header. No color fills.',
  },
];

const FEE_DUE_TEMPLATES = [
  {
    value: 'formal',
    label: 'Formal',
    desc: 'Centered header, prominent "FEE DUE NOTICE" title. Colored table.',
  },
  {
    value: 'simple',
    label: 'Simple',
    desc: 'Left-aligned header, minimal colors, plain black table.',
  },
];

const COLOR_PRESETS = [
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#059669', label: 'Green' },
  { value: '#dc2626', label: 'Red' },
  { value: '#d97706', label: 'Amber' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#0f172a', label: 'Dark' },
  { value: '#0891b2', label: 'Cyan' },
];

const TemplateCard: React.FC<{ tpl: any; selected: boolean; onSelect: () => void }> = ({ tpl, selected, onSelect }) => (
  <div
    onClick={onSelect}
    style={{
      border: `2px solid ${selected ? '#4f46e5' : '#d9d9d9'}`,
      borderRadius: 8,
      padding: '12px 16px',
      cursor: 'pointer',
      background: selected ? '#f0f0ff' : '#fff',
      transition: 'all 0.15s',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <strong>{tpl.label}</strong>
      {selected && <Tag color="geekblue">Selected</Tag>}
    </div>
    <div style={{ fontSize: 12, color: '#666' }}>{tpl.desc}</div>
  </div>
);

const ColorPicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    {COLOR_PRESETS.map((c) => (
      <div
        key={c.value}
        title={c.label}
        onClick={() => onChange(c.value)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: c.value,
          cursor: 'pointer',
          border: value === c.value ? '3px solid #1890ff' : '2px solid transparent',
          outline: value === c.value ? '1px solid #1890ff' : 'none',
          transition: 'all 0.1s',
        }}
      />
    ))}
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Custom color"
      style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', borderRadius: '50%', padding: 0 }}
    />
    <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>Custom ↑</span>
  </div>
);

const DocSection: React.FC<{
  title: string;
  icon: string;
  settings: any;
  onChange: (patch: any) => void;
  templates: typeof RECEIPT_TEMPLATES;
  showSignature?: boolean;
}> = ({ title, icon, settings, onChange, templates, showSignature }) => (
  <Card
    title={<span style={{ fontSize: 15 }}>{icon} {title}</span>}
    style={{ marginBottom: 24 }}
    bodyStyle={{ paddingTop: 16 }}
  >
    <Row gutter={[24, 16]}>
      <Col xs={24} md={12}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Page Size</label>
          <Select
            value={settings.page_size}
            onChange={(v) => onChange({ page_size: v })}
            style={{ width: '100%' }}
          >
            {PAGE_SIZE_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Primary Color</label>
          <ColorPicker value={settings.primary_color} onChange={(v) => onChange({ primary_color: v })} />
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 20, borderRadius: 4, background: settings.primary_color }} />
            <span style={{ fontSize: 12, color: '#666' }}>{settings.primary_color}</span>
          </div>
        </div>
        <Space size={24}>
          <div>
            <label style={{ fontWeight: 500, marginRight: 8 }}>Show Logo</label>
            <Switch checked={settings.show_logo} onChange={(v) => onChange({ show_logo: v })} />
          </div>
          {showSignature && (
            <div>
              <label style={{ fontWeight: 500, marginRight: 8 }}>Show Signature Line</label>
              <Switch checked={settings.show_signature} onChange={(v) => onChange({ show_signature: v })} />
            </div>
          )}
        </Space>
      </Col>
      <Col xs={24} md={12}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Template</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((tpl) => (
            <TemplateCard
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

const PrintSettings: React.FC = () => {
  const { data: saved, isLoading } = useGetPrintSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdatePrintSettingsMutation();

  const [receipt, setReceipt] = useState<any>({
    page_size: 'A4',
    template: 'classic',
    primary_color: '#4f46e5',
    show_logo: true,
    show_signature: true,
  });
  const [feeDue, setFeeDue] = useState<any>({
    page_size: 'A4',
    template: 'formal',
    primary_color: '#dc2626',
    show_logo: true,
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
      message.success('Print settings saved successfully');
    } catch {
      message.error('Failed to save print settings');
    }
  };

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 40 }} />;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: '#666', margin: 0 }}>
          Customize the page size and visual template for receipts and fee due letters. Changes apply to all future PDF downloads.
        </p>
      </div>

      <DocSection
        title="Fee Receipt"
        icon="🧾"
        settings={receipt}
        onChange={(patch) => setReceipt((prev: any) => ({ ...prev, ...patch }))}
        templates={RECEIPT_TEMPLATES}
        showSignature={true}
      />

      <DocSection
        title="Fee Due Letter"
        icon="📋"
        settings={feeDue}
        onChange={(patch) => setFeeDue((prev: any) => ({ ...prev, ...patch }))}
        templates={FEE_DUE_TEMPLATES}
        showSignature={false}
      />

      <Button type="primary" size="large" loading={saving} onClick={handleSave}>
        Save Print Settings
      </Button>
    </div>
  );
};

export default PrintSettings;
