import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../config/api';



export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/friends/notifications');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch notifications' });
    }
  }
);

export const sendFriendRequest = createAsyncThunk(
  'notifications/sendFriendRequest',
  async (targetUserId, { rejectWithValue, getState }) => {
    try {
      const currentUser = getState().auth.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const response = await api.post('/friends/request', { 
        targetUserId,
        fromUser: {
          _id: currentUser._id,
          username: currentUser.username
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return rejectWithValue(error.response?.data || { error: error.message || 'Failed to send friend request' });
    }
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'notifications/acceptFriendRequest',
  async (fromUserId, { rejectWithValue }) => {
    try {
      const response = await api.post('/friends/accept', { fromUserId });
      return response.data;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return rejectWithValue(error.response?.data || { error: error.message || 'Failed to accept friend request' });
    }
  }
);

export const markNotificationsAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationIds, { rejectWithValue }) => {
    try {
      const response = await api.post('/friends/notifications/read', { notificationIds });
      return { notificationIds, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to mark notifications as read' });
    }
  }
);

const initialState = {
  notifications: [],
  pendingRequests: [],
  unreadCount: 0,
  isLoading: false,
  error: null
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    receiveFriendRequest: (state, action) => {
      const { request } = action.payload;
      
      const exists = state.pendingRequests.some(
        req => req.from._id === request.from._id
      );
      
      if (!exists) {
        
        state.pendingRequests.push(request);
      }
    },
    updateFriendRequestStatus: (state, action) => {
      const { fromUserId, status } = action.payload;
      
      if (status === 'accepted' || status === 'rejected') {
        
        state.pendingRequests = state.pendingRequests.filter(
          req => req.from._id !== fromUserId
        );
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.pendingRequests = action.payload.pendingRequests;
        state.unreadCount = action.payload.notifications.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Failed to fetch notifications';
      })
      .addCase(sendFriendRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendFriendRequest.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Failed to send friend request';
      })
      .addCase(acceptFriendRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        const fromUserId = action.meta.arg;
        
        
        state.pendingRequests = state.pendingRequests.filter(req => {
          const requestId = typeof req.from === 'object' ? req.from._id : req.from;
          return requestId !== fromUserId;
        });
      })
      .addCase(acceptFriendRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Failed to accept friend request';
      })
      .addCase(markNotificationsAsRead.fulfilled, (state, action) => {
        const { notificationIds } = action.payload;
        state.notifications = state.notifications.map(notification => {
          if (notificationIds.includes(notification._id)) {
            return { ...notification, read: true };
          }
          return notification;
        });
        state.unreadCount = state.notifications.filter(n => !n.read).length;
      });
  }
});

export const { addNotification, clearError, receiveFriendRequest, updateFriendRequestStatus } = notificationSlice.actions;
export default notificationSlice.reducer; 