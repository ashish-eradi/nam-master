
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  school_id: string | null;
  school: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  employee_id: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  licenseExpired: boolean;
}

// Load user from localStorage
const loadUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  token: null, // Token is stored in HttpOnly cookie, not accessible to JS
  user: loadUserFromStorage(),
  licenseExpired: localStorage.getItem('licenseExpired') === 'true',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      // Token is now managed via HttpOnly cookie on the backend — no localStorage
      state.token = action.payload;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem('user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('user');
      }
    },
    setLicenseExpired: (state, action: PayloadAction<boolean>) => {
      state.licenseExpired = action.payload;
      if (action.payload) {
        localStorage.setItem('licenseExpired', 'true');
      } else {
        localStorage.removeItem('licenseExpired');
      }
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.licenseExpired = false;
      localStorage.removeItem('user');
      localStorage.removeItem('licenseExpired');
      // Cookie is cleared by calling POST /api/v1/auth/logout
    },
  },
});

export const { setToken, setUser, setLicenseExpired, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectToken = (state: RootState) => state.auth.token;
export const selectUser = (state: RootState) => state.auth.user;
export const selectLicenseExpired = (state: RootState) => state.auth.licenseExpired;
