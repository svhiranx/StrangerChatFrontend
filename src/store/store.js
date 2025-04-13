import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import notificationReducer from './slices/notificationSlice';
import tabReducer from './slices/tabSlice';        
import queueReducer from './slices/queueSlice';  
export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    notifications: notificationReducer,
    tabs: tabReducer,        
    queue: queueReducer,      
  },
  
});
