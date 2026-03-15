
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  school_id: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}
