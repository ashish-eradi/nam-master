
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  school_id: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

const loadUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('superadmin_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('superadmin_user'),
  user: loadUserFromStorage(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      // Token is stored in HttpOnly cookie by the backend — not accessible to JS
      state.isAuthenticated = !!action.payload;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (action.payload) {
        localStorage.setItem('superadmin_user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('superadmin_user');
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem('superadmin_user');
    },
  },
});

export const { setToken, setUser, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
// Legacy: token selector returns a non-null sentinel when authenticated (for ProtectedRoute compat)
export const selectToken = (state: { auth: AuthState }) => state.auth.isAuthenticated ? 'cookie' : null;
