import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../config/api';


// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signup', {
        username,
        password
      });
      localStorage.setItem('authToken', response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const signin = createAsyncThunk(
  'auth/signin',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signin', {
        username,
        password
      });
      localStorage.setItem('authToken', response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token found');
      }
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      localStorage.removeItem('authToken');
      return rejectWithValue(error.response?.data || { error: 'Authentication failed' });
    }
  }
);

export const signout = createAsyncThunk(
  'auth/signout',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await api.post('/auth/signout');
      }
      localStorage.removeItem('authToken');
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Signout failed' });
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  partner: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setPartner: (state, action) => {
      state.partner = action.payload;
    },
    clearPartner: (state) => {
      state.partner = null;
    },
    updateUser: (state, action) => {
      if (JSON.stringify(state.user) !== JSON.stringify(action.payload)) {
        state.user = action.payload;
      }
    },
    updateFriendsList: (state, action) => {
      if (!state.user) return;
      if (JSON.stringify(state.user.friends) !== JSON.stringify(action.payload)) {
        state.user.friends = action.payload;
      }
    },
    updateFriendRequestStatus: (state, action) => {
      if (!state.user) return;
      
      const { requestType, userId, status } = action.payload;
      
      if (requestType === 'sent') {
        if (!state.user.sentFriendRequests) {
          state.user.sentFriendRequests = [];
        }
        state.user.sentFriendRequests.push({
          to: userId,
          status
        });
      } else if (requestType === 'received') {
        if (!state.user.pendingFriendRequests) {
          state.user.pendingFriendRequests = [];
        }
        const existing = state.user.pendingFriendRequests.findIndex(
          req => req.from && (req.from._id === userId || req.from === userId)
        );
        
        if (existing === -1 && status === 'pending') {
          state.user.pendingFriendRequests.push({
            from: { _id: userId }
          });
        } else if (existing !== -1 && status === 'accepted') {
          state.user.pendingFriendRequests.splice(existing, 1);
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Signup failed';
      })
      .addCase(signin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(signin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Signin failed';
      })
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      .addCase(signout.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(signout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Signout failed';
      });
  }
});

export const { 
  clearError, 
  setPartner, 
  clearPartner, 
  updateUser, 
  updateFriendsList,
  updateFriendRequestStatus 
} = authSlice.actions;

export default authSlice.reducer; 