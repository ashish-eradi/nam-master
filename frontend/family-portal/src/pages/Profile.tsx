
import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useGetMyProfileQuery, useUpdateMyProfileMutation, type Profile as ProfileType } from '../services/familyApi';

const Profile: React.FC = () => {
  const { data: profile, isLoading } = useGetMyProfileQuery();
  const [updateProfile] = useUpdateMyProfileMutation();
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (profile) {
      form.setFieldsValue(profile);
    }
  }, [profile, form]);

  const onFinish = async (values: Partial<ProfileType>) => {
    try {
      await updateProfile(values).unwrap();
      message.success('Profile updated successfully!');
    } catch {
      message.error('Failed to update profile.');
    }
  };

  return (
    <Card title="My Profile">
      <Form form={form} onFinish={onFinish} layout="vertical" initialValues={profile}>
        <Form.Item name="username" label="Username">
          <Input disabled />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Update Profile
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Profile;
