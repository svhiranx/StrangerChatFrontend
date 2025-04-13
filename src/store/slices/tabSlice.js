import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tabs: [],
  activeTab: null,
  disconnectedChats: [],
};

const tabSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    addTab: (state, action) => {
      const newTab = action.payload;
      const exists = state.tabs.some((tab) => tab.id === newTab.id);
      if (!exists) {
        state.tabs.push(newTab);
        state.activeTab = newTab.id;
      } else {
        state.activeTab = newTab.id;
      }
    },
    closeTab: (state, action) => {
      const tabId = action.payload;
      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
      if (state.activeTab === tabId) {
        const newActive = state.tabs[index] || state.tabs[index - 1] || state.tabs[0];
        state.activeTab = newActive ? newActive.id : null;
      }
    },
    switchTab: (state, action) => {
      state.activeTab = action.payload;
    },
    markChatDisconnected: (state, action) => {
      if (!state.disconnectedChats.includes(action.payload)) {
        state.disconnectedChats.push(action.payload);
      }
    },
    resetTabs: () => initialState,
  },
});

export const {
  addTab,
  closeTab,
  switchTab,
  markChatDisconnected,
  resetTabs,
} = tabSlice.actions;

export default tabSlice.reducer;
