import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentChat: null,
  messages: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setCurrentChat: (state, action) => {
      const { type, code, clearMessages } = action.payload;
      state.currentChat = { type, code };
      
      // Clear messages for this chat if requested
      if (clearMessages) {
        const chatId = `${type}-${code}`;
        
        state.messages[chatId] = [];
      }
    },
    addMessage: (state, action) => {
      const { chatId, message } = action.payload;
      
      
      if (!state.messages[chatId]) {
        
        state.messages[chatId] = [];
      }
      // Check for duplicate messages
      const isDuplicate = state.messages[chatId].some(msg => msg.id.split('-')[0] === message.id.split('-')[0]);
      if (!isDuplicate) {
        state.messages[chatId].push(message);
      }
    },
    setMessages: (state, action) => {
      const { chatId, messages } = action.payload;
      
      
      if (Array.isArray(messages)) {
        state.messages[chatId] = messages;
        
      } else {
        console.warn(`[Redux] Cannot set messages: expected array but got`, messages);
      }
    },
  },
});

export const { setCurrentChat, addMessage, setMessages } = chatSlice.actions;
export default chatSlice.reducer; 