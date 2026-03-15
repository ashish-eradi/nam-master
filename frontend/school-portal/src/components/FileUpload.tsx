import React, { useState } from 'react';
import { Upload, message, Button, Avatar } from 'antd';
import { UploadOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface FileUploadProps {
  type: 'student-photo' | 'teacher-photo' | 'student-document' | 'teacher-document';
  entityId: string;
  documentType?: string; // Required for document uploads
  currentPhotoUrl?: string;
  onUploadSuccess?: (url: string) => void;
  accept?: string;
  maxSize?: number; // in MB
}

const FileUpload: React.FC<FileUploadProps> = ({
  type,
  entityId,
  documentType,
  currentPhotoUrl,
  onUploadSuccess,
  accept = '.jpg,.jpeg,.png,.pdf',
  maxSize = 5
}) => {
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);

  const getUploadUrl = () => {
    let url = `${API_BASE_URL}/api/v1/uploads/`;

    switch (type) {
      case 'student-photo':
        url += `student-photo/${entityId}`;
        break;
      case 'teacher-photo':
        url += `teacher-photo/${entityId}`;
        break;
      case 'student-document':
        url += `student-document/${entityId}?document_type=${documentType}`;
        break;
      case 'teacher-document':
        url += `teacher-document/${entityId}?document_type=${documentType}`;
        break;
    }

    return url;
  };

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as File);

    try {
      setLoading(true);
      const response = await axios.post(getUploadUrl(), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true, // Send HttpOnly cookie automatically
      });

      const uploadedUrl = response.data.photo_url || response.data.document_url;

      if (type.includes('photo')) {
        setPhotoUrl(`${API_BASE_URL}${uploadedUrl}`);
      }

      message.success(`${type.includes('photo') ? 'Photo' : 'Document'} uploaded successfully`);

      if (onUploadSuccess) {
        onUploadSuccess(uploadedUrl);
      }

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Upload failed');
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file: File) => {
    const isValidType = accept.split(',').some(ext =>
      file.name.toLowerCase().endsWith(ext.trim())
    );

    if (!isValidType) {
      message.error(`Please upload files with extensions: ${accept}`);
      return Upload.LIST_IGNORE;
    }

    const isLt5M = file.size / 1024 / 1024 < maxSize;
    if (!isLt5M) {
      message.error(`File must be smaller than ${maxSize}MB`);
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  if (type.includes('photo')) {
    return (
      <div style={{ textAlign: 'center' }}>
        <Avatar
          size={120}
          src={photoUrl}
          icon={<UserOutlined />}
          style={{ marginBottom: 16 }}
        />
        <br />
        <Upload
          customRequest={customRequest}
          beforeUpload={beforeUpload}
          showUploadList={false}
          accept={accept}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            {photoUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>
        </Upload>
      </div>
    );
  }

  return (
    <Upload
      customRequest={customRequest}
      beforeUpload={beforeUpload}
      accept={accept}
      maxCount={1}
    >
      <Button icon={<UploadOutlined />} loading={loading}>
        Upload {documentType}
      </Button>
    </Upload>
  );
};

export default FileUpload;
