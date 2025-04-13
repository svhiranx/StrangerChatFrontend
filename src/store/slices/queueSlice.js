import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false,
};

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setIsLoading } = queueSlice.actions;
export default queueSlice.reducer;
